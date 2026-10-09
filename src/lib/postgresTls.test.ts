import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TLSSocket } from "node:tls";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { createPostgresConnection } from "./postgres";

const directory = mkdtempSync(join(tmpdir(), "drillmap-tls-"));
const certificate = join(directory, "certificate.crt");
const key = join(directory, "certificate.key");
const sockets = new Set<Socket>();
const server = createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.once("data", () => {
    // A minimal Postgres SSLRequest handshake. No database or credentials.
    socket.write("S");
    const secure = new TLSSocket(socket, {
      isServer: true,
      cert: readFileSync(certificate),
      key: readFileSync(key),
    });
    secure.on("error", () => secure.destroy());
  });
});

beforeAll(async () => {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", certificate, "-days", "1", "-subj", "/CN=wrong.example.net",
    "-addext", "subjectAltName=DNS:wrong.example.net"], { stdio: "ignore" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(directory, { recursive: true, force: true });
});

it.each([
  [false, "DEPTH_ZERO_SELF_SIGNED_CERT"],
  [true, "ERR_TLS_CERT_ALTNAME_INVALID"],
])("rejects an invalid server certificate, custom trust=%s", async (trust, expectedCode) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TLS test server did not start.");
  // localhost. resolves to this computer but is deliberately outside the
  // exact loopback allowlist, so it exercises the remote TLS policy.
  const url = new URL(`postgresql://postgres:local-only@localhost.:${address.port}/drillmap`);
  url.searchParams.set("sslmode", "verify-full");
  if (trust) url.searchParams.set("sslrootcert", certificate);
  vi.stubEnv("DATABASE_URL", url.toString());
  vi.stubEnv("PGSSLMODE", "no-verify");
  const connection = createPostgresConnection();
  try {
    await expect(connection.db.execute(sql`select 1`)).rejects.toMatchObject({ cause: { code: expectedCode } });
  } finally {
    await connection.close();
  }
});
