import { afterAll } from "vitest";
import { closePostgresDatabase } from "../../src/lib/postgres";

afterAll(closePostgresDatabase);
