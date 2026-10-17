import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";

let baseUrl: string;
let providerBody: unknown;
let providerStatus = 200;
let alertStatus = 200;
const alerts: { path: string; body: string }[] = [];
const server = createServer(async (request, response) => {
  if (request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    alerts.push({ path: request.url ?? "", body });
    response.writeHead(alertStatus).end("OK");
    return;
  }
  response.writeHead(providerStatus, { "Content-Type": "application/json" });
  response.end(JSON.stringify(providerBody));
});

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function command(overrides: Record<string, string> = {}) {
  const preload = `const network = globalThis.fetch; globalThis.fetch = (input, init) => {
    const url = new URL(String(input));
    url.protocol = 'http:'; url.host = ${JSON.stringify(new URL(baseUrl).host)};
    return network(url, init);
  };`;
  const child = spawn(process.execPath, ["--import", "tsx", "--import", `data:text/javascript,${encodeURIComponent(preload)}`, "scripts/check-backups.mts"], {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      BACKUP_PROJECT_ID: "production-project",
      BACKUP_BRANCH_ID: "br-production",
      NEON_API_KEY: "synthetic-key-only",
      HEALTHCHECKS_PING_URL: "https://hc-ping.com/00000000-0000-4000-8000-000000000000",
      ...overrides,
    },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => { stdout += data; });
  child.stderr.on("data", (data) => { stderr += data; });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  return { code, stdout, stderr };
}

it("runs the real command against a controlled HTTP provider and alert receiver", async () => {
  providerBody = { snapshots: [{
    id: "synthetic-snapshot", source_branch_id: "br-production", manual: false,
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  }] };
  const fresh = await command();
  expect(fresh.code).toBe(0);
  expect(JSON.parse(fresh.stdout)).toMatchObject({ ok: true, status: "fresh" });
  expect(alerts.at(-1)?.path.endsWith("/fail")).toBe(false);

  providerBody = { snapshots: [] };
  const stale = await command();
  expect(stale.code).toBe(1);
  expect(JSON.parse(stale.stdout)).toMatchObject({ ok: false, status: "no-snapshots" });
  expect(alerts.at(-1)?.path.endsWith("/fail")).toBe(true);

  providerStatus = 503;
  providerBody = { secret: "postgresql://private:password@example.test/database" };
  const failed = await command();
  expect(failed).toEqual({ code: 1, stdout: '{"ok":false,"status":"checker-failed"}\n', stderr: "" });
  expect(alerts.at(-1)?.body).toBe('{"ok":false,"status":"checker-failed"}');

  alertStatus = 503;
  const undelivered = await command();
  expect(undelivered).toEqual({ code: 1, stdout: '{"ok":false,"status":"alert-failed"}\n', stderr: "" });

  const unconfigured = await command({ HEALTHCHECKS_PING_URL: "not-a-secret-destination" });
  expect(unconfigured).toEqual({ code: 1, stdout: '{"ok":false,"status":"configuration-failed"}\n', stderr: "" });
}, 15_000);
