import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["tests/**/*.ts"],
    ignores: [
      "tests/postgres/appTestDatabase.ts",
      "tests/postgres/globalSetup.ts",
      "tests/postgres/accountSessions.test.ts",
      "tests/postgres/accountsStudents.test.ts",
      "tests/postgres/actionLimits.test.ts",
      "tests/postgres/admin.test.ts",
      "tests/postgres/analyticsSnapshots.test.ts",
      "tests/postgres/dailyCleanup.test.ts",
      "tests/postgres/passwordChange.test.ts",
      "tests/postgres/passwordReset.test.ts",
      "tests/postgres/passwordSignup.test.ts",
      "tests/postgres/scanLimits.test.ts",
      "tests/postgres/scanSpending.test.ts",
      "tests/postgres/snapshotSources.test.ts",
      "tests/postgres/weeklyUpload.test.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression[left.property.name='DATABASE_URL'][right.property.name='setting']",
          message: "Call setUpAppTestDatabase() from tests/postgres/appTestDatabase.ts instead of pointing DATABASE_URL at a test database by hand.",
        },
        {
          selector: "CallExpression[callee.property.name='stubEnv'][arguments.0.value='DATABASE_URL'][arguments.1.property.name='setting']",
          message: "Call setUpAppTestDatabase() from tests/postgres/appTestDatabase.ts instead of pointing DATABASE_URL at a test database by hand.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Paper design exports: reference markup for building screens, not app code.
    "docs/design/**",
    // Agent worktrees are separate checkouts with their own lint runs.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
