import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const helper = resolve(root, ".agents/skills/verify/scripts/local.mjs");

export async function drive(directory, name, steps) {
  if (!directory || !/^[a-z0-9-]+$/.test(name ?? "")) throw new Error("Usage: drive(.verification/evidence/<run-name>, <lowercase-drive-name>, steps)");
  const run = resolve(root, directory);
  const out = resolve(run, name);
  const base = resolve(root, ".verification/evidence");
  if (!relative(base, run) || relative(base, run).startsWith("..")) throw new Error("Use a directory below .verification/evidence/.");
  if (existsSync(out)) throw new Error(`${relative(root, out)} already exists. Choose a new drive name, or a new run for smoke.`);
  mkdirSync(out);
  const local = (command, ...args) => JSON.parse(execFileSync(process.execPath, [helper, command, directory, ...args], { cwd: root, encoding: "utf8" }));
  const save = (file, value) => writeFileSync(resolve(out, file), JSON.stringify(value, null, 2) + "\n");
  const healthy = local("doctor");
  const logStart = statSync(resolve(run, "app.log")).size;
  const modulePath = process.env.VERIFY_PLAYWRIGHT_MODULE || resolve(run, "scratch/tools/node_modules/playwright/index.mjs");
  const { chromium } = await import(pathToFileURL(modulePath).href);
  const browser = await chromium.launch({ headless: true });
  const actions = [];
  const sessions = [];

  async function session(label) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: resolve(out, `video-${label}`) } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const found = { label, pageErrors: [], consoleErrors: [], cspViolations: [], failedRequests: [] };
    page.on("pageerror", (error) => found.pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") found.consoleErrors.push(message.text());
      if (message.text().includes("Content Security Policy")) found.cspViolations.push(message.text());
    });
    page.on("requestfailed", (request) => {
      const reason = request.failure()?.errorText;
      if (reason !== "net::ERR_ABORTED") found.failedRequests.push({ method: request.method(), url: request.url(), error: reason });
    });
    page.on("response", (response) => { if (response.status() >= 400) found.failedRequests.push({ method: response.request().method(), url: response.url(), status: response.status() }); });
    const log = (action) => actions.push({ at: new Date().toISOString(), session: label, action, url: page.url() });
    const tools = {
      page, context, log,
      goto: async (path) => { log(`Navigate to ${path}`); await page.goto(healthy.url + path); },
      signInAs: async (email, ...sessionArgs) => { log(`Set a minted session cookie for ${email}`); await context.addCookies([local("session", email, ...sessionArgs)]); },
      heading: (text) => page.getByRole("heading", { name: text, exact: true }).waitFor(),
      capture: async (file) => {
        await page.screenshot({ path: resolve(out, `${file}.png`), fullPage: true });
        writeFileSync(resolve(out, `${file}.aria.txt`), await page.locator("body").ariaSnapshot());
      },
    };
    sessions.push({ context, found, tools });
    return tools;
  }

  const records = (file) => { const value = local("inspect"); save(`${file}.json`, value); return value; };
  const main = await session("main");
  let error;
  try {
    await steps({ ...main, url: healthy.url, records, local, newSession: session });
  } catch (caught) {
    error = caught;
    for (const { found, tools } of sessions) await tools.capture(`failure-${found.label}`).catch(() => {});
  }
  const cleanupErrors = [];
  const attempt = (work) => work().catch((caught) => cleanupErrors.push(caught.message));
  for (const { context, found } of sessions) {
    await attempt(() => context.tracing.stop({ path: resolve(out, `trace-${found.label}.zip`) }));
    await attempt(() => context.close());
  }
  await attempt(() => browser.close());
  if (!error && cleanupErrors.length) error = new Error(`Saving the browser evidence failed: ${cleanupErrors[0]}`);
  const pageErrors = sessions.flatMap(({ found }) => found.pageErrors);
  if (!error && pageErrors.length) error = new Error(`The page threw ${pageErrors.length} uncaught error(s). First: ${pageErrors[0]}`);
  const cspViolations = sessions.flatMap(({ found }) => found.cspViolations);
  if (!error && cspViolations.length) error = new Error(`The browser reported ${cspViolations.length} CSP violation(s). First: ${cspViolations[0]}`);
  const serverErrors = local("logs", "--from", String(logStart)).errors;
  const result = { passed: !error, error: error?.message, out, sessions: sessions.map(({ found }) => found), serverErrors, cleanupErrors };
  save("actions.json", actions);
  save("result.json", result);
  const count = (key) => result.sessions.reduce((total, found) => total + found[key].length, 0);
  console.log(JSON.stringify({ passed: result.passed, error: result.error, out, pageErrors: count("pageErrors"), consoleErrors: count("consoleErrors"), cspViolations: count("cspViolations"), failedRequests: count("failedRequests"), serverErrors: serverErrors.length }));
  if (error) throw error;
  return result;
}
