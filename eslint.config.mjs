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
  || (parent.type === "JSXExpressionContainer" && parent.parent.type === "JSXAttribute" && parent.parent.name.name === "action"
    && ["ActionForm", "SignOutForm"].includes(parent.parent.parent.name.name));

const handedToComponent = ({ parent }) =>
  parent.type === "JSXExpressionContainer" && parent.parent.type === "JSXAttribute"
  && parent.parent.parent.name.type === "JSXIdentifier" && /^[A-Z]/.test(parent.parent.parent.name.name);

function actionPropName({ identifier }) {
  let signature = identifier.parent;
  while (signature && signature.type !== "TSPropertySignature") signature = signature.parent;
  if (signature?.key.type !== "Identifier") return null;
  const type = signature.typeAnnotation.typeAnnotation;
  const shapes = type.type === "TSUnionType" ? type.types : [type];
  const isAction = (shape) => (shape.type === "TSTypeQuery" && shape === identifier.parent)
    || (shape.type === "TSFunctionType" && identifier.range[0] >= shape.returnType.range[0] && identifier.range[1] <= shape.returnType.range[1]);
  return shapes.some(isAction) ? signature.key.name : null;
}

const destructuredKey = ({ parent }) => {
  const property = parent.type === "AssignmentPattern" ? parent.parent : parent;
  return property.type === "Property" && property.parent.type === "ObjectPattern" && property.key.type === "Identifier" ? property.key.name : null;
};

const callActionsThroughAdapter = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      direct: "Call a Server Action through callAction(action) from @/lib/callAction, or hand it to ActionForm or SignOutForm as `action`, so a lost connection shows the Failure toast and a sign-out leaves the page.",
      directProp: "Call a Server Action prop through callAction(prop) from @/lib/callAction, or pass it on to a component, so a lost connection shows the Failure toast and a sign-out leaves the page.",
    },
  },
  create(context) {
    const actionProps = new Set();
    const handedOn = (node) => handedToAdapter(node) || handedToComponent(node);
    return {
      Program(program) {
        if (!program.body.some((statement) => statement.directive === "use client")) return;
        for (const statement of program.body) {
          if (statement.type !== "ImportDeclaration" || !/(^|\/)actions$/.test(statement.source.value)) continue;
          for (const variable of context.sourceCode.getDeclaredVariables(statement)) {
            for (const reference of variable.references) {
              const prop = actionPropName(reference);
              if (prop) actionProps.add(prop);
              else if (reference.isValueReference && statement.importKind !== "type" && !handedToAdapter(reference.identifier)) {
                context.report({ node: reference.identifier, messageId: "direct" });
              }
            }
          }
        }
        for (const scope of context.sourceCode.scopeManager.scopes) {
          for (const variable of scope.variables) {
            if (!variable.defs.some((def) => actionProps.has(destructuredKey(def.name)))) continue;
            for (const reference of variable.references) {
              if (reference.isRead() && reference.identifier.parent.type !== "TSTypeQuery" && !handedOn(reference.identifier)) {
                context.report({ node: reference.identifier, messageId: "directProp" });
              }
            }
          }
        }
      },
      MemberExpression(node) {
        if (!node.computed && node.property.type === "Identifier" && actionProps.has(node.property.name) && !handedOn(node)) {
          context.report({ node: node.property, messageId: "directProp" });
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
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/components/TestControls.tsx"],
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
