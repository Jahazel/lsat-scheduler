#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import { z } from "zod";
import { tsImport } from "tsx/esm/api";

const { createPostgresTestDatabase } = await tsImport("../../../../tests/postgres/testDatabase.ts", import.meta.url);
const { closePostgresDatabase, createPostgresConnection, postgresSettingForDatabase, requirePostgresTestTarget } = await tsImport("../../../../src/lib/postgres.ts", import.meta.url);
const { sql } = await import("drizzle-orm");
requirePostgresTestTarget();

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const [command, directory, ...extra] = process.argv.slice(2);
const base = resolve(root, ".verification/evidence");
const validSeed = command === "seed" && extra.length === 2 && ["student", "admin"].includes(extra[0]);
if (!directory || !(["launch", "doctor", "inspect", "cleanup"].includes(command) && extra.length === 0 || validSeed)) {
  throw new Error("Usage: local.mjs launch|doctor|inspect|cleanup .verification/evidence/<run-name>\n       local.mjs seed .verification/evidence/<run-name> student|admin <email>");
}
const run = resolve(root, directory);
if (!relative(base, run) || relative(base, run).startsWith("..")) {
  throw new Error("The run directory must be below .verification/evidence/.");
}
const url = "http://127.0.0.1:3100";
const uri = "mongodb://127.0.0.1:27117/lsat-scheduler?replicaSet=drillmap_verify";
const statePath = resolve(run, "instance.json");
const revision = () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const save = (name, value) => writeFileSync(resolve(run, name), JSON.stringify(value, null, 2) + "\n");
const stateSchema = z.object({
  root: z.literal(root), run: z.literal(run), url: z.literal(url), uri: z.literal(uri),
  supervisorPid: z.number().int().positive(), databasePid: z.number().int().positive(),
  appPid: z.number().int().positive(), revision: z.string(), status: z.enum(["starting", "ready", "stopped"]),
  postgresDatabase: z.string().regex(/^drillmap_test_[a-f0-9]+$/),
});
const loadState = () => stateSchema.parse(JSON.parse(readFileSync(statePath, "utf8")));
function assertSupervisor(state) {
  const args = execFileSync("ps", ["-p", String(state.supervisorPid), "-o", "command="], { encoding: "utf8" });
  if (!args.includes("skills/verify/scripts/local.mjs") || !args.includes("launch") || !args.includes(directory)) {
    throw new Error("The recorded process is not this run's verification supervisor.");
  }
}
async function freePort(port) {
  const server = createServer();
  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", done);
  });
  await new Promise((done) => server.close(done));
}
async function database(work) {
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  try { return await work(connection); } finally { await connection.close(); }
}
async function postgres(work) {
  const connection = createPostgresConnection({ database: loadState().postgresDatabase });
  try { return await work(connection.db); } finally { await connection.close(); }
}
function listener(port) {
  return execFileSync("lsof", ["-t", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" })
    .trim().split(/\s+/).map(Number);
}
function belongsTo(pid, ancestor) {
  for (let count = 0; count < 12 && pid > 1; count++) {
    if (pid === ancestor) return true;
    pid = Number(execFileSync("ps", ["-p", String(pid), "-o", "ppid="], { encoding: "utf8" }).trim());
  }
  return false;
}
async function doctor() {
  const state = loadState();
  assertSupervisor(state);
  if (state.status !== "ready" || state.revision !== revision()) throw new Error("Instance is not ready or HEAD changed. Restart it.");
  if (!listener(27117).every((pid) => pid === state.databasePid) ||
      !listener(3100).every((pid) => belongsTo(pid, state.appPid))) {
    throw new Error("A listening port belongs to another process.");
  }
  const response = await fetch(`${url}/login`, { signal: AbortSignal.timeout(15000), redirect: "manual" });
  if (response.status !== 200 || !(await response.text()).includes("Log in")) throw new Error("Login page is not healthy.");
  const primary = await database(async (connection) => (await connection.db.admin().command({ hello: 1 })).isWritablePrimary);
  if (!primary) throw new Error("The disposable database is not the writable replica-set primary.");
  await postgres((db) => db.execute(sql`select 1 from weekly_schedules limit 0`));
  return { healthy: true, url, uri, postgresDatabase: state.postgresDatabase, revision: state.revision, next: JSON.parse(readFileSync(resolve(root, "node_modules/next/package.json"))).version, databasePrimary: primary };
}

async function launch() {
  if (existsSync(statePath)) throw new Error("Choose a new run directory. Evidence directories cannot be reused.");
  const lock = resolve(root, ".next/dev/lock");
  if (existsSync(lock)) {
    const owner = z.object({ pid: z.number().int().positive() }).parse(JSON.parse(readFileSync(lock, "utf8")));
    let alive = true;
    try { process.kill(owner.pid, 0); } catch (error) { if (error.code === "ESRCH") alive = false; else throw error; }
    if (alive) throw new Error("Another process may own the Next dev lock. Stop your own instance or use a separate checkout.");
    // Leave stale-lock recovery to Next itself. Never delete another run's lock.
  }
  await freePort(3100);
  await freePort(27117);
  mkdirSync(run, { recursive: true });
  const data = resolve(run, "scratch/database");
  mkdirSync(data, { recursive: true });
  const children = [];
  let stopping = false;
  let state;
  let postgresDatabase;
  const start = (program, args, log, env) => {
    const fd = openSync(resolve(run, log), "a");
    const child = spawn(program, args, { cwd: root, detached: true, stdio: ["ignore", fd, fd], env });
    children.push(child);
    child.on("error", (error) => { console.error(error.message); void stop(1); });
    child.on("exit", (code) => { if (!stopping) { console.error(`${program} exited with ${code}`); void stop(1); } });
    return child;
  };
  async function stop(code) {
    if (stopping) return;
    stopping = true;
    const stopped = [];
    for (const child of [...children].reverse()) {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        const exited = new Promise((done) => child.once("exit", done));
        try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
        await Promise.race([exited, delay(8000)]);
        if (child.exitCode === null && child.signalCode === null) {
          try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
          await exited;
        }
      }
      stopped.push(child.pid ?? null);
    }
    if (postgresDatabase) await postgresDatabase.cleanup();
    rmSync(resolve(run, "scratch"), { recursive: true, force: true });
    if (state) save("instance.json", { ...state, status: "stopped" });
    save("cleanup.json", { stoppedPids: stopped, scratchRemoved: !existsSync(data), finishedAt: new Date().toISOString() });
    console.log(`Stopped this run. Evidence remains at ${run}`);
    process.exit(code);
  }
  process.on("SIGINT", () => void stop(0));
  process.on("SIGTERM", () => void stop(0));
  try {
    postgresDatabase = await createPostgresTestDatabase();
    const mongo = start("mongod", ["--dbpath", data, "--bind_ip", "127.0.0.1", "--port", "27117", "--replSet", "drillmap_verify"], "database.log", process.env);
    // Replica-set initialization is infrastructure setup, not an app fixture or user action.
    let initialized = false;
    for (let attempt = 0; attempt < 30 && !initialized; attempt++) {
      let connection;
      try {
        connection = await mongoose.createConnection("mongodb://127.0.0.1:27117/lsat-scheduler?directConnection=true", { serverSelectionTimeoutMS: 500 }).asPromise();
        await connection.db.admin().command({ replSetInitiate: { _id: "drillmap_verify", members: [{ _id: 0, host: "127.0.0.1:27117" }] } });
        initialized = true;
      } catch { await delay(250); } finally { if (connection) await connection.close(); }
    }
    if (!initialized) throw new Error("MongoDB did not start. Read database.log.");
    await database(async (connection) => connection.db.admin().command({ ping: 1 }));
    const appEnv = { ...process.env, NODE_ENV: "development", MONGODB_URI: uri, DATABASE_URL: postgresDatabase.setting,
      AUTH_SECRET: randomBytes(32).toString("base64"), AUTH_URL: url, NEXTAUTH_URL: url, AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
      ANTHROPIC_API_KEY: "", SCREENSHOT_EXTRACTOR: process.env.VERIFY_SCREENSHOT_EXTRACTOR ?? "fake", VERCEL_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" };
    const app = start(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3100"], "app.log", appEnv);
    state = { root, run, url, uri, postgresDatabase: postgresDatabase.name, supervisorPid: process.pid, databasePid: mongo.pid, appPid: app.pid, revision: revision(), status: "starting" };
    save("instance.json", state);
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(`${url}/login`, { signal: AbortSignal.timeout(1000) });
        if (response.status === 200 && (await response.text()).includes("Log in")) {
          state.status = "ready";
          save("instance.json", state);
          console.log(`Ready: ${url}\nRun: ${run}\nStop with Ctrl+C or local.mjs cleanup ${directory}`);
          return;
        }
      } catch { /* Readiness retries stop at the deadline below. */ }
      await delay(500);
    }
    throw new Error("DrillMap did not become ready. Read app.log.");
  } catch (error) { console.error(error.message); await stop(1); }
}

if (command === "launch") await launch();
if (command === "doctor") console.log(JSON.stringify(await doctor(), null, 2));
if (command === "inspect") {
  await doctor();
  const records = await postgres(async (db) => {
    const result = {};
    result.accounts = (await db.execute(sql`select id, email, name, role, simulated_date from accounts`)).rows;
    for (const name of ["students", "analytics_snapshots", "weekly_schedules", "activity_check_ins", "leads"]) {
      result[name] = (await db.execute(sql`select * from ${sql.identifier(name)}`)).rows;
    }
    return result;
  });
  console.log(JSON.stringify(records, null, 2));
}
if (command === "seed") {
  await doctor();
  const [role, email] = extra;
  process.env.DATABASE_URL = postgresSettingForDatabase(loadState().postgresDatabase);
  const { createAccount } = await tsImport("../../../../src/lib/accountRepository.ts", import.meta.url);
  const { createStudent } = await tsImport("../../../../src/lib/studentRepository.ts", import.meta.url);
  const { studentProfileSchema } = await tsImport("../../../../src/lib/studentProfile.ts", import.meta.url);
  const { default: bcrypt } = await import("bcryptjs");
  const password = randomBytes(12).toString("base64url") + "Aa1";
  // The feature map's baseline onboarding answers.
  const profile = studentProfileSchema.parse({
    platform: "7Sage", currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01", preferredPracticeTestDay: "SATURDAY",
    accommodationMultiplier: 1,
    dailyCapacityMinutes: Object.fromEntries(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => [day, 90])),
  });
  try {
    const account = await createAccount({ name: email.split("@")[0], email, passwordHash: await bcrypt.hash(password, 10), role });
    if (!account) throw new Error(`An Account already exists for ${email}. Choose another email.`);
    if (!(await createStudent(account.id, profile))) throw new Error(`No student saved for ${email}.`);
    console.log(JSON.stringify({ email, password, role, accountId: account.id, onboarded: true }, null, 2));
  } finally { await closePostgresDatabase(); }
}
if (command === "cleanup") {
  const state = loadState();
  if (state.status === "stopped") { console.log("Already stopped. Evidence retained."); }
  else {
    assertSupervisor(state);
    process.kill(state.supervisorPid, "SIGTERM");
    for (let attempt = 0; attempt < 100 && loadState().status !== "stopped"; attempt++) await delay(250);
    if (loadState().status !== "stopped") throw new Error("Cleanup did not finish. Inspect the supervisor before retrying.");
    console.log(`Cleanup complete. Evidence remains at ${run}`);
  }
}
