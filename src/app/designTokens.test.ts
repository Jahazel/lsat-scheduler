import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const THEME_FILE = path.join(SRC, "app", "globals.css");

const TAILWIND_PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|white|black";
const COLOR_UTILITY =
  "bg|text|border(?:-[trblxyse])?|divide|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|placeholder|caret|accent|shadow";

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "old ink or teal accent token", pattern: /\b(?:ink|accent)-\d{2,3}\b/g },
  { name: "old ambient shadow token", pattern: /proof-ambient/g },
  {
    name: "Tailwind default palette color",
    pattern: new RegExp(
      `(?:\\b(?:${COLOR_UTILITY})-|--color-)(?:${TAILWIND_PALETTE})(?:-\\d{2,3})?\\b`,
      "g",
    ),
  },
  {
    name: "Tailwind default type class",
    pattern:
      /(?<![\w-])(?:text-(?:xs|sm|base|lg|[2-9]?xl)|font-(?:thin|extralight|light|normal|bold|extrabold|black)|tracking-(?:tighter|tight|normal|wide|wider|widest))(?![\w-])/g,
  },
  { name: "raw hex color", pattern: /#[0-9a-fA-F]{3,8}\b(?![-\w])/g },
  { name: "raw color function", pattern: /(?:rgba?|hsla?|oklch|oklab)\(/g },
];

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function findTokenViolations(source: string): string[] {
  const code = withoutComments(source);
  return RULES.flatMap(({ name, pattern }) =>
    [...code.matchAll(pattern)].map((match) => `${name}: ${match[0]}`),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

describe("design tokens", () => {
  it("flags old tokens and raw colors", () => {
    expect(findTokenViolations(`className="bg-ink-25 text-accent-600 hover:border-ink-900/30"`)).toEqual([
      "old ink or teal accent token: ink-25",
      "old ink or teal accent token: accent-600",
      "old ink or teal accent token: ink-900",
    ]);
    expect(findTokenViolations("shadow-proof-ambient")).toEqual(["old ambient shadow token: proof-ambient"]);
    expect(findTokenViolations("bg-white text-red-600 border-s-zinc-200 var(--color-red-500)")).toEqual([
      "Tailwind default palette color: bg-white",
      "Tailwind default palette color: text-red-600",
      "Tailwind default palette color: border-s-zinc-200",
      "Tailwind default palette color: --color-red-500",
    ]);
    expect(findTokenViolations("text-sm sm:text-2xl font-normal tracking-tight")).toEqual([
      "Tailwind default type class: text-sm",
      "Tailwind default type class: text-2xl",
      "Tailwind default type class: font-normal",
      "Tailwind default type class: tracking-tight",
    ]);
    expect(findTokenViolations(`style={{ color: "#0A0A0A" }} shadow-[0_8px_24px_oklch(19%_0.013_205/0.12)]`)).toEqual([
      "raw hex color: #0A0A0A",
      "raw color function: oklch(",
    ]);
  });

  it("allows Paper tokens", () => {
    expect(
      findTokenViolations(
        `className="bg-vellum text-ink border-vellum-line bg-accent/tint text-danger-ink shadow-e2 accent-accent hover:bg-graphite-raised text-chalk text-small sm:text-h2 font-regular tracking-heading"`,
      ),
    ).toEqual([]);
    expect(findTokenViolations("// Fix #202\n/* see #191 */\nconst url = \"https://example.test\";")).toEqual([]);
  });

  it("keeps application code on Paper tokens", () => {
    const violations = sourceFiles(SRC)
      .filter((file) => file !== THEME_FILE && file !== __filename)
      .flatMap((file) =>
        findTokenViolations(readFileSync(file, "utf8")).map(
          (violation) => `${path.relative(SRC, file)}: ${violation}`,
        ),
      );
    expect(violations).toEqual([]);
  });
});
