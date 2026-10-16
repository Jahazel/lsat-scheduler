import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types, type PoolConfig } from "pg";
import { getDatabaseHost, requireLocalDatabase } from "../../scripts/localDatabaseGuard.mjs";

// Drizzle supplies query-level parsers, so a Pool-only override does not apply.
// Current numeric columns hold Daily capacity and Accommodation, which fit exactly
// in JavaScript numbers. Revisit this shared parser before adding money or other
// high-precision numeric columns.
types.setTypeParser(types.builtins.NUMERIC, Number);

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const acceptedOptions = new Set(["host", "port", "user", "password", "sslmode", "sslrootcert", "channel_binding"]);

// This is the only runtime reader of the Postgres connection setting.
function databaseUrl() {
  return process.env.DATABASE_URL;
}

function connectionConfig() {
  const value = databaseUrl();
  if (!value) throw new Error("DATABASE_URL is not set.");
  let url: URL;
  let hosts: string[];
  try {
    hosts = getDatabaseHost(value).split(",");
    url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("Cannot read the Postgres connection setting.");
  }
  const local = hosts.every((host) => {
    const name = host.startsWith("[") ? host.slice(1, host.indexOf("]"))
      : isIP(host) === 6 ? host : host.replace(/:\d+$/, "");
    return loopbackHosts.has(name.toLowerCase());
  });
  if (!local && url.searchParams.getAll("sslmode").some((mode) => mode !== "verify-full")) {
    throw new Error("Remote Postgres requires sslmode=verify-full.");
  }
  // Build explicit driver options. Never pass the raw URL to pg: its SSL
  // parameters can replace certificate checks, and host defaults can use PGHOST.
  const seen = new Set<string>();
  for (const [key] of url.searchParams) {
    if (!acceptedOptions.has(key) || seen.has(key)) {
      throw new Error("Unsupported or repeated Postgres connection option.");
    }
    seen.add(key);
  }
  const host = decodeURIComponent(url.searchParams.get("host") ?? url.hostname).replace(/^\[|\]$/g, "");
  if (!host || host.includes(",")) {
    throw new Error("Postgres connections require a single host.");
  }
  let user: string;
  let password: string;
  let database: string;
  try {
    user = url.searchParams.get("user") ?? decodeURIComponent(url.username);
    password = url.searchParams.get("password") ?? decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
    if (!user || !database || database.includes("\0")) throw new Error();
  } catch {
    throw new Error("Postgres requires an explicit user and database.");
  }
  const port = Number(url.searchParams.get("port") ?? (url.port || "5432"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid Postgres port.");
  }
  let ca: string | undefined;
  const rootCert = url.searchParams.get("sslrootcert");
  if (!local && rootCert) {
    try {
      ca = readFileSync(rootCert, "utf8");
    } catch {
      throw new Error("Cannot read the Postgres root certificate.");
    }
  }
  const config = {
    host, port, user, database,
    // A callback also prevents an empty password from falling back to PGPASSWORD.
    password: () => password,
    ssl: local ? false : {
      rejectUnauthorized: true,
      ca,
      checkServerIdentity: (_hostname, certificate) => checkServerIdentity(host, certificate),
    },
    sslnegotiation: "postgres",
    enableChannelBinding: url.searchParams.get("channel_binding") === "require",
    application_name: "drillmap",
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
  } satisfies PoolConfig;
  return { config, local, url };
}

// Dedicated connections are for setup/cleanup scripts that must select another
// database on the same server. App requests use the cached database below.
export function createPostgresConnection({ database }: { database?: string } = {}) {
  const { config, local } = connectionConfig();
  const pool = new Pool({ ...config, database: database ?? config.database });
  pool.on("error", (error: Error) => {
    const code = "code" in error && typeof error.code === "string"
      && /^(?:[0-9A-Z]{5}|E[A-Z_]{2,30})$/.test(error.code) ? error.code : "UNKNOWN";
    console.error(JSON.stringify({
      event: "postgres_idle_connection_error", code,
      connections: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount,
    }));
  });
  return { db: drizzle(pool), requiresEncryption: !local, close: () => pool.end() };
}

type PostgresConnection = ReturnType<typeof createPostgresConnection>;
declare global {
  var drillmapPostgres: PostgresConnection | undefined;
}

export function getPostgresDatabase() {
  globalThis.drillmapPostgres ??= createPostgresConnection();
  return globalThis.drillmapPostgres.db;
}

export async function closePostgresDatabase() {
  const connection = globalThis.drillmapPostgres;
  globalThis.drillmapPostgres = undefined;
  await connection?.close();
}

export function requirePostgresScriptTarget() {
  return requireLocalDatabase(databaseUrl());
}

export function requirePostgresTestTarget() {
  if (!connectionConfig().local) {
    throw new Error("Postgres tests only run against loopback hosts.");
  }
}

export function postgresSettingForDatabase(database: string) {
  const { url } = connectionConfig();
  url.pathname = `/${encodeURIComponent(database)}`;
  return url.toString();
}
