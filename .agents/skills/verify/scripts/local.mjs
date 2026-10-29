#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { tsImport } from "tsx/esm/api";
import { serverErrors } from "./appLog.mjs";

const commands = {
  launch: {
    args: " [--production]", valid: (extra) => extra.length === 0 || extra.length === 1 && extra[0] === "--production",
    does: "Start DrillMap on http://127.0.0.1:3100 with a new disposable Postgres database. Keep this terminal open; Ctrl+C stops the run. --production builds the app and runs the build instead of next dev.",
    example: "launch \"$VERIFY_RUN_DIR\"",
  },
  doctor: {
    args: "", valid: (extra) => extra.length === 0,
    does: "Check that this run's app, port, Git revision, and database are healthy. Read-only. Prints JSON.",
    example: "doctor \"$VERIFY_RUN_DIR\" > \"$VERIFY_RUN_DIR/doctor.json\"",
  },
  seed: {
    args: " student|admin <email> [--not-onboarded]",
    valid: (extra) => ["student", "admin"].includes(extra[0]) && (extra.length === 2 || extra.length === 3 && extra[2] === "--not-onboarded"),
    does: "Create a fixture Account, onboarded with the feature map's baseline answers unless --not-onboarded.",
    example: "seed \"$VERIFY_RUN_DIR\" student amy@example.test",
  },
  session: {
    args: " <email> [--signed-in-minutes-ago <minutes>]",
    valid: (extra) => extra.length === 1 || extra.length === 3 && extra[1] === "--signed-in-minutes-ago" && /^\d+$/.test(extra[2]),
    does: "Print a one-hour session cookie (name, value, url) that signs the browser in as an existing Account.",
    example: "session \"$VERIFY_RUN_DIR\" verify-admin@example.test",
  },
  inspect: {
    args: "", valid: (extra) => extra.length === 0,
    does: "Run doctor, then print this run's stored records as JSON. Never reads password hashes.",
    example: "inspect \"$VERIFY_RUN_DIR\" > \"$VERIFY_RUN_DIR/records-after.json\"",
  },
  logs: {
    args: " [--from <byte>]", valid: (extra) => extra.length === 0 || extra.length === 2 && extra[0] === "--from" && /^\d+$/.test(extra[1]),
    does: "Print server errors from app.log. Pass the last output's \"to\" as --from to see only newer errors.",
    example: "logs \"$VERIFY_RUN_DIR\" --from 18342",
  },
  cleanup: {
    args: "", valid: (extra) => extra.length === 0,
    does: "Stop this run's app and drop its database. Evidence stays in the run directory.",
    example: "cleanup \"$VERIFY_RUN_DIR\"",
  },
};
const usage = (name) => `local.mjs ${name} <run-dir>${commands[name].args}`;
const help = (name) => `Usage: ${usage(name)}\n\n${commands[name].does}\n\nExample:\n  ./.agents/skills/verify/scripts/local.mjs ${commands[name].example}\n`;
const overview = () => `Usage: local.mjs <command> <run-dir> [arguments]\n       local.mjs <command> --help\n\n`
  + `<run-dir> is below .verification/evidence/. launch needs a new one, such as .verification/evidence/20261025T120000Z;\nthe other commands take the directory that launch made.\n`
  + `Run from the repository root. Every command needs DATABASE_URL set to a loopback Postgres owner connection.\n\nCommands:\n`
  + Object.entries(commands).map(([name, { does }]) => `  ${name.padEnd(8)} ${does.split(". ")[0].replace(/\.$/, "")}.`).join("\n")
  + `\n\nThe full recipe is .agents/skills/verify/SKILL.md.\n`;
function refuse(message) {
  console.error(message);
  process.exit(1);
}

const [command, directory, ...extra] = process.argv.slice(2);
if (!command) refuse(overview());
if (command === "help" && Object.hasOwn(commands, directory)) {
  process.stdout.write(help(directory));
  process.exit(0);
}
if (["--help", "-h", "help"].includes(command)) {
  process.stdout.write(overview());
  process.exit(0);
}
if (!Object.hasOwn(commands, command)) refuse(`Unknown command "${command}".\n\n${overview()}`);
if ([directory, ...extra].some((arg) => arg === "--help" || arg === "-h")) {
  process.stdout.write(help(command));
  process.exit(0);
}
if (!directory || !commands[command].valid(extra)) refuse(`Usage: ${usage(command)}\nSee local.mjs ${command} --help for an example.`);

const { createPostgresTestDatabase } = await tsImport("../../../../tests/postgres/testDatabase.ts", import.meta.url);
const { closePostgresDatabase, createPostgresConnection, postgresSettingForDatabase, requirePostgresTestTarget } = await tsImport("../../../../src/lib/postgres.ts", import.meta.url);
const { sql } = await import("drizzle-orm");
requirePostgresTestTarget();

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const base = resolve(root, ".verification/evidence");
const run = resolve(root, directory);
if (!relative(base, run) || relative(base, run).startsWith("..")) {
  throw new Error("The run directory must be below .verification/evidence/.");
}
const url = "http://127.0.0.1:3100";
const statePath = resolve(run, "instance.json");
const revision = () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const save = (name, value) => writeFileSync(resolve(run, name), JSON.stringify(value, null, 2) + "\n");
const stateSchema = z.object({
  root: z.literal(root), run: z.literal(run), url: z.literal(url),
  supervisorPid: z.number().int().positive(),
  appPid: z.number().int().positive(), revision: z.string(), status: z.enum(["starting", "ready", "stopped"]),
  postgresDatabase: z.string().regex(/^drillmap_test_[a-f0-9]+$/),
});
const loadState = () => stateSchema.parse(JSON.parse(readFileSync(statePath, "utf8")));
function assertSupervisor(state) {
  const args = execFileSync("ps", ["-p", String(state.supervisorPid), "-o", "command="], { encoding: "utf8" });
  if (!args.includes("skills/verify/scripts/local.mjs") || !args.includes("launch") || !args.includes(relative(root, run))) {
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
async function postgres(work) {
  const connection = createPostgresConnection({ database: loadState().postgresDatabase });
  try { return await work(connection.db); } finally { await connection.close(); }
}
function listener(port) {
  if (process.platform === "linux") {
    // Linux lsof skips Next's server: its process name "next-server (v1" has an unclosed bracket.
    const pids = [...execFileSync("ss", ["-ltnpH", `sport = :${port}`], { encoding: "utf8" }).matchAll(/pid=(\d+)/g)].map((match) => Number(match[1]));
    if (pids.length === 0) throw new Error(`Nothing listens on port ${port}.`);
    return pids;
  }
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
  if (!listener(3100).every((pid) => belongsTo(pid, state.appPid))) {
    throw new Error("The app port belongs to another process.");
  }
  const response = await fetch(`${url}/login`, { signal: AbortSignal.timeout(15000), redirect: "manual" });
  if (response.status !== 200 || !(await response.text()).includes("Log in")) throw new Error("Login page is not healthy.");
  await postgres((db) => db.execute(sql`select 1 from weekly_schedules limit 0`));
  return { healthy: true, url, postgresDatabase: state.postgresDatabase, revision: state.revision, next: JSON.parse(readFileSync(resolve(root, "node_modules/next/package.json"))).version };
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
  mkdirSync(run, { recursive: true });
  const children = [];
  let stopping = false;
  let state;
  let postgresDatabase;
  const start = (program, args, log, env, { exits = false } = {}) => {
    const fd = openSync(resolve(run, log), "a");
    const child = spawn(program, args, { cwd: root, detached: true, stdio: ["ignore", fd, fd], env });
    children.push(child);
    child.on("error", (error) => { console.error(error.message); void stop(1); });
    if (!exits) child.on("exit", (code) => { if (!stopping) { console.error(`${program} exited with ${code}`); void stop(1); } });
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
    save("cleanup.json", { stoppedPids: stopped, scratchRemoved: !existsSync(resolve(run, "scratch")), finishedAt: new Date().toISOString() });
    console.log(`Stopped this run. Evidence remains at ${run}`);
    process.exit(code);
  }
  process.on("SIGINT", () => void stop(0));
  process.on("SIGTERM", () => void stop(0));
  try {
    postgresDatabase = await createPostgresTestDatabase();
    const authSecret = randomBytes(32).toString("base64");
    mkdirSync(resolve(run, "scratch"), { recursive: true });
    writeFileSync(resolve(run, "scratch/auth-secret"), authSecret, { mode: 0o600 });
    const production = extra[0] === "--production";
    const appEnv = { ...process.env, NODE_ENV: production ? "production" : "development", DATABASE_URL: postgresDatabase.setting,
      AUTH_SECRET: authSecret, AUTH_URL: url, NEXTAUTH_URL: url, AUTH_TRUST_HOST: "true", SITE_URL: url, RESEND_API_KEY: "", EMAIL_FROM: "",
      AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
      ANTHROPIC_API_KEY: "", SCAN_SPEND_WARNING_PING_URL: "", SCAN_LIMIT_REACHED_PING_URL: "", SCREENSHOT_EXTRACTOR: process.env.VERIFY_SCREENSHOT_EXTRACTOR ?? "fake", VERCEL_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" };
    const next = resolve(root, "node_modules/next/dist/bin/next");
    if (production) {
      const build = start(process.execPath, [next, "build"], "build.log", appEnv, { exits: true });
      const [code] = await new Promise((done) => build.once("exit", (...result) => done(result)));
      if (code !== 0) throw new Error("next build failed. Read build.log.");
    }
    const app = start(process.execPath, [next, production ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "3100"], "app.log", appEnv);
    state = { root, run, url, production, postgresDatabase: postgresDatabase.name, supervisorPid: process.pid, appPid: app.pid, revision: revision(), status: "starting" };
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
  } catch (error) {
    console.error(error.cause?.message ? `${error.message}\nCause: ${error.cause.message}` : error.message);
    await stop(1);
  }
}

if (command === "launch") await launch();
if (command === "doctor") console.log(JSON.stringify(await doctor(), null, 2));
if (command === "inspect") {
  await doctor();
  const records = await postgres(async (db) => {
    const result = {};
    result.accounts = (await db.execute(sql`select id, email, name, role, simulated_date, disabled_at, session_version from accounts`)).rows;
    for (const name of ["students", "analytics_snapshots", "practice_test_results", "weekly_schedules", "activity_check_ins", "action_counters"]) {
      result[name] = (await db.execute(sql`select * from ${sql.identifier(name)}`)).rows;
    }
    return result;
  });
  console.log(JSON.stringify(records, null, 2));
}
if (command === "seed") {
  await doctor();
  const [role, email, onboarding] = extra;
  process.env.DATABASE_URL = postgresSettingForDatabase(loadState().postgresDatabase);
  const { createAccount } = await tsImport("../../../../src/lib/accountRepository.ts", import.meta.url);
  const { getPostgresDatabase } = await tsImport("../../../../src/lib/postgres.ts", import.meta.url);
  const { createStudent } = await tsImport("../../../../src/lib/studentRepository.ts", import.meta.url);
  const { studentProfileSchema } = await tsImport("../../../../src/lib/studentProfile.ts", import.meta.url);
  // The feature map's baseline onboarding answers.
  const profile = studentProfileSchema.parse({
    platform: "7Sage", currentScore: 150, goalScore: 165, goalTestDate: "2027-06-01", preferredPracticeTestDay: "SATURDAY",
    accommodationMultiplier: 1,
    dailyCapacityMinutes: Object.fromEntries(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => [day, 90])),
  });
  try {
    const account = await createAccount({ name: email.split("@")[0], email, googleId: `verify-google-${randomBytes(12).toString("hex")}` });
    if (!account) throw new Error(`An Account already exists for ${email}. Choose another email.`);
    if (role === "admin") await getPostgresDatabase().execute(sql`update accounts set role = 'admin' where id = ${account.id}`);
    const onboarded = onboarding !== "--not-onboarded";
    if (onboarded && !(await createStudent(account.id, profile))) throw new Error(`No student saved for ${email}.`);
    console.log(JSON.stringify({ email, role, accountId: account.id, onboarded }, null, 2));
  } finally { await closePostgresDatabase(); }
}
if (command === "session") {
  await doctor();
  process.env.DATABASE_URL = postgresSettingForDatabase(loadState().postgresDatabase);
  const { findAccountByEmail } = await tsImport("../../../../src/lib/accountRepository.ts", import.meta.url);
  const { encode } = await import("next-auth/jwt");
  try {
    const account = await findAccountByEmail(extra[0]);
    if (!account) throw new Error(`No Account exists for ${extra[0]}.`);
    const name = "authjs.session-token";
    const value = await encode({
      token: {
        id: account.id, email: account.email, name: account.name,
        sessionVersion: account.sessionVersion, signedInAt: Math.floor(Date.now() / 1000) - Number(extra[2] ?? 0) * 60,
      },
      secret: readFileSync(resolve(run, "scratch/auth-secret"), "utf8"), salt: name, maxAge: 60 * 60,
    });
    console.log(JSON.stringify({ name, value, url }, null, 2));
  } finally { await closePostgresDatabase(); }
}
if (command === "logs") {
  const log = readFileSync(resolve(run, "app.log"));
  const from = Number(extra[1] ?? 0);
  if (from > log.length) throw new Error(`app.log has ${log.length} bytes. Use --from ${log.length} or less.`);
  console.log(JSON.stringify({ from, to: log.length, errors: serverErrors(log.subarray(from).toString("utf8")) }, null, 2));
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
