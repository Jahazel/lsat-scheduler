import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const serverActionShape = [
  {
    selector: "Program:has(> ExpressionStatement[directive='use server']) > ExportNamedDeclaration > :not(FunctionDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration)",
    message: "Export each Server Action as an async function, so the rule below can check it (rule 29).",
  },
  {
    selector: "Program:has(> ExpressionStatement[directive='use server']) > ExportNamedDeclaration > FunctionDeclaration > BlockStatement:not([body.length=1]:has(> ReturnStatement[argument.callee.name='answerAction']))",
    message: "Make the whole body `return answerAction(route, async () => { ... })`, so an unexpected failure answers with a code (rule 29).",
  },
];

const CLASS_NAME_TEST =
  "Test what the student sees or hears (role, name, text, aria state), not class names. Check styling in the verify browser run.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["tests/**/*.ts"],
    ignores: [
      "tests/postgres/appTestDatabase.ts",
      "tests/postgres/globalSetup.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "AssignmentExpression:matches([left.property.name='DATABASE_URL'], [left.property.value='DATABASE_URL'])[right.property.name='setting']",
          message: "Call setUpAppTestDatabase() from tests/postgres/appTestDatabase.ts instead of pointing DATABASE_URL at a test database by hand.",
        },
        {
          selector: "CallExpression[callee.property.name='stubEnv'][arguments.0.value='DATABASE_URL'][arguments.1.property.name='setting']",
          message: "Call setUpAppTestDatabase() from tests/postgres/appTestDatabase.ts instead of pointing DATABASE_URL at a test database by hand.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...serverActionShape],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    ignores: [
      "src/app/dashboard/upload/WeeklyUpload.test.tsx",
      "src/app/login/page.test.tsx",
      "src/app/onboarding/OnboardingWizard.test.tsx",
      "src/components/FailureNotice.test.tsx",
      "src/components/ScheduleCheckInView.test.tsx",
      "src/components/TestControls.test.tsx",
      "src/components/nav/AdminNav.test.tsx",
      "src/components/ui/ui.test.tsx",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["className", "classList", "getElementsByClassName", "toHaveClass"].map((property) => ({
          property,
          message: CLASS_NAME_TEST,
        })),
      ],
      "no-restricted-syntax": [
        "error",
        ...serverActionShape,
        {
          selector: "CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches)$/][arguments.0.value=/(^|[^'\"])[.][A-Za-z_-]/]",
          message: CLASS_NAME_TEST,
        },
      ],
    },
  },
  {
    files: ["src/app/**/route.ts"],
    ignores: ["src/app/api/auth/\\[...nextauth\\]/route.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration > :not(FunctionDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration)",
          message: "Export each Route Handler as an async function, so the rule below can check it (rule 29).",
        },
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration > BlockStatement:not([body.length=1]:has(> ReturnStatement[argument.callee.name='answerRequest']))",
          message: "Make the whole body `return answerRequest(route, async () => { ... })`, so an unexpected failure answers with a code (rule 29).",
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
