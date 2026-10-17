import { pathToFileURL } from "node:url";
import { runBackupCheck } from "./lib/backup-checker";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runBackupCheck({ env: process.env });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
