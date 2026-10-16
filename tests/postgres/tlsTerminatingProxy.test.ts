import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createConnection, createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TLSSocket } from "node:tls";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { checkPostgresFoundation } from "../../scripts/postgresFoundationChecks";
import { createPostgresConnection } from "../../src/lib/postgres";
import { createAppTestDatabase } from "./appTestDatabase";

const directory = mkdtempSync(join(tmpdir(), "drillmap-neon-tls-"));
const certificate = join(directory, "certificate.crt");
const key = join(directory, "certificate.key");
const sockets = new Set<Socket>();
let database: Awaited<ReturnType<typeof createAppTestDatabase>>;
let connection: ReturnType<typeof createPostgresConnection>;
const server = createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.once("data", () => {
    socket.write("S");
    const secure = new TLSSocket(socket, {
      isServer: true,
      cert: readFileSync(certificate),
      key: readFileSync(key),
    });
    sockets.add(secure);
    secure.on("close", () => sockets.delete(secure));
    const target = new URL(database.setting);
    const backend = createConnection({ host: "127.0.0.1", port: Number(target.port || "5432") });
    sockets.add(backend);
    backend.on("close", () => { sockets.delete(backend); secure.destroy(); });
    secure.on("close", () => backend.destroy());
    secure.on("error", () => backend.destroy());
    backend.on("error", () => secure.destroy());
    secure.pipe(backend).pipe(secure);
  });
});

beforeAll(async () => {
  database = await createAppTestDatabase();
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", certificate, "-days", "1", "-subj", "/CN=localhost.",
    "-addext", "subjectAltName=DNS:localhost."], { stdio: "ignore" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TLS proxy did not start.");
  const setting = new URL(database.setting);
  setting.hostname = "localhost.";
  setting.port = String(address.port);
  setting.searchParams.set("sslmode", "verify-full");
  setting.searchParams.set("sslrootcert", certificate);
  vi.stubEnv("DATABASE_URL", setting.toString());
  connection = createPostgresConnection();
});

afterAll(async () => {
  await connection?.close();
  vi.unstubAllEnvs();
  for (const socket of sockets) socket.destroy();
  if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await database?.cleanup();
  rmSync(directory, { recursive: true, force: true });
});

it("checks the foundation through verified TLS when the proxy's backend reports no encryption", async () => {
  expect((await connection.db.execute(sql`select ssl from pg_stat_ssl where pid = pg_backend_pid()`)).rows)
    .toEqual([{ ssl: false }]);
  const messages = await checkPostgresFoundation(connection);
  expect(messages).toContain("PASS: Encrypted connection with certificate and host-name checks");
  expect(messages).toContain("PASS: Throwaway records rolled back");
});
