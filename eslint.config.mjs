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

const handedToAdapter = ({ parent }) =>
  (parent.type === "CallExpression" && parent.callee.name === "callAction" && parent.arguments[0] !== undefined)
  || (parent.type === "JSXExpressionContainer" && parent.parent.type === "JSXAttribute"
    && /^[A-Z]/.test(parent.parent.parent.name.name ?? ""));

const callActionsThroughAdapter = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      direct: "Call a Server Action through callAction(action) from @/lib/callAction, or hand it to a component as a prop, so a lost connection shows the Failure toast and a sign-out leaves the page.",
    },
  },
  create(context) {
    return {
      Program(program) {
        if (!program.body.some((statement) => statement.directive === "use client")) return;
        for (const statement of program.body) {
          if (statement.type !== "ImportDeclaration" || statement.importKind === "type" || !/(^|\/)actions$/.test(statement.source.value)) continue;
          for (const variable of context.sourceCode.getDeclaredVariables(statement)) {
            for (const reference of variable.references) {
              if (reference.isValueReference && !handedToAdapter(reference.identifier)) {
                context.report({ node: reference.identifier, messageId: "direct" });
              }
            }
          }
        }
      },
    };
  },
};

const CLASS_SELECTOR = String.raw`/^([^\[]|\[[^\]]*\])*[.][A-Za-z_-]|\[class[~|^$*]?=/`;

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
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/components/TestControls.tsx"],
    plugins: { drillmap: { rules: { "call-actions-through-adapter": callActionsThroughAdapter } } },
    rules: {
      "drillmap/call-actions-through-adapter": "error",
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
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
        ...["value", "quasis.0.value.raw"].map((argument) => ({
          selector: `CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches)$/][arguments.0.${argument}=${CLASS_SELECTOR}]`,
          message: CLASS_NAME_TEST,
        })),
        {
          selector: "CallExpression[callee.property.name=/^(getAttribute|hasAttribute|toHaveAttribute)$/][arguments.0.value='class']",
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
