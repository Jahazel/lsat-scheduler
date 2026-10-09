import { Socket } from "node:net";
import { writeSync } from "node:fs";

Socket.prototype.connect = function () {
  writeSync(2, "Test stopped at the Postgres connection boundary.\n");
  process.exit(86);
};
