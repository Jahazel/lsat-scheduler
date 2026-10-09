import { isIP } from "node:net";
import copyDatabaseHosts from "./copyDatabaseHosts.json" with { type: "json" };

const allowedTargetMessage = "This script only runs against a local database or an approved copy-site host.";

// Read literal hosts without DNS lookups or URL normalization of IP aliases.
// The protocol is separate from host policy so Postgres can reuse this guard.
function readDatabaseHosts(uri) {
  if (typeof uri !== "string" || !uri) throw new Error("missing connection string");
  const match = uri.match(/^([a-z][a-z\d+.-]*):\/\/([^/?#]*)(.*)$/i);
  if (!match || /\s|\\/.test(uri)) throw new Error("unreadable connection string");
  decodeURI(uri);
  const [, protocol, authority, rest] = match;
  if (!["mongodb", "mongodb+srv", "postgres", "postgresql"].includes(protocol.toLowerCase())) {
    throw new Error("unsupported protocol");
  }
  const isPostgres = ["postgres", "postgresql"].includes(protocol.toLowerCase());
  const credentialsEnd = authority.lastIndexOf("@");
  if (authority.indexOf("@") !== credentialsEnd) throw new Error("unreadable credentials");
  const authorityHosts = authority.slice(credentialsEnd + 1);
  const hosts = authorityHosts ? authorityHosts.split(",").map((host) => isPostgres ? decodeURIComponent(host) : host) : [];
  if (hosts.some((host) => isIP(host) === 6)) throw new Error("unbracketed authority host");
  if (!authorityHosts && !isPostgres) {
    throw new Error("missing host");
  }
  // Host overrides and proxy hosts can redirect a connection despite a local authority.
  const options = new URL(`http://localhost${rest}`).searchParams;
  for (const [key, value] of options) {
    // A service file can supply a host address that is absent from this string.
    if (isPostgres && ["service", "servicefile"].includes(key.toLowerCase())) {
      throw new Error("unreadable service target");
    }
    if (["host", "hostaddr", "proxyhost"].includes(key.toLowerCase())) {
      hosts.push(...value.split(","));
    }
  }
  if (!hosts.length) throw new Error("missing host");
  const names = hosts.map((host) => {
    const queryIPv6 = isPostgres && isIP(host) === 6;
    const parts = queryIPv6 ? [host, host] : host.match(/^(\[[\da-f:.]+\]|[a-z\d.-]+)(?::(\d+))?$/i);
    if (!parts) throw new Error("unreadable host");
    // Check IPv6 syntax, ports and the rest of the URL without exposing parse errors.
    const parsed = new URL(`http://${authority.slice(0, credentialsEnd + 1)}${queryIPv6 ? `[${host}]` : host}${rest}`);
    if (parsed.hash) throw new Error("unreadable connection string");
    return parts[1].replace(/^\[|\]$/g, "").toLowerCase();
  });
  return { protocol: protocol.toLowerCase(), hosts, names };
}

export function getDatabaseHost(uri) {
  try {
    return readDatabaseHosts(uri).hosts.join(",");
  } catch {
    // Never include raw input or a parser error. Either can contain credentials.
    throw new Error("Cannot read the database host.");
  }
}

export function requireLocalDatabase(uri) {
  let target;
  try {
    target = readDatabaseHosts(uri);
  } catch {
    const reason = uri ? "unreadable connection string" : "missing connection string";
    throw new Error(`Refusing database host [unknown]: ${reason}. ${allowedTargetMessage}`);
  }
  const { protocol, hosts, names } = target;
  const isPostgres = ["postgres", "postgresql"].includes(protocol);
  if (protocol === "mongodb+srv" || names.some((host) =>
    !["localhost", "127.0.0.1", "::1"].includes(host) && !(isPostgres && copyDatabaseHosts.includes(host)))) {
    throw new Error(`Refusing database host ${hosts.join(",")}: not an allowed host. ${allowedTargetMessage}`);
  }
  return hosts.join(",");
}
