import { pathToFileURL } from "node:url";
import { runBackupAgeCheck } from "./backupAges";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runBackupAgeCheck({ env: process.env });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
