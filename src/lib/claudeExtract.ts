import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { SectionReading } from "./practiceTestResult";
import type { ScreenshotMediaType } from "./screenshotUpload";
import { isTopPriorityTier, type AnalyticsExtractedRow, type AnalyticsSection, type LRLogicType, type LRType, type PriorityTier, type RCType, type RulesConfig } from "./types";

const TOOL_NAME = "record_analytics_rows";
const MODEL = "claude-haiku-4-5-20251001";
const MODEL_USD_PER_MILLION_TOKENS = { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 };

export type RecordCost = (usd: number) => void;

export function categoryFor(type: LRType, rules: RulesConfig): "regular" | "restricted" {
  if (!rules.lrLogicTypes.includes(type as LRLogicType)) return "regular";
  return rules.lrLogicExceptions.includes(type as LRLogicType) ? "regular" : "restricted";
}

const PRIORITY_TIER: Record<Uppercase<PriorityTier>, PriorityTier> = { HIGHEST: "highest", HIGH: "high", MEDIUM: "medium", LOW: "low" };

const Accuracy = z.number().min(0).max(100);
const Priority = z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW"]);

const lrToolInput = (types: LRType[]) => z.object({
  rows: z.array(z.object({ type: z.enum(types), accuracy: Accuracy.optional(), priority: Priority.optional() })).max(types.length),
});
const passageToolInput = (types: RCType[]) => z.object({
  showsPassageTypes: z.boolean(),
  rows: z.array(z.object({ type: z.enum(types), accuracy: Accuracy })).max(types.length),
});

export type AnalyticsExtraction = { rows: AnalyticsExtractedRow[]; showsPassageTypes?: boolean };

function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured");
  }
  return new Anthropic({ apiKey, maxRetries: 0, timeout: 30_000 });
}

function replyCostUsd(usage: Anthropic.Usage) {
  const price = MODEL_USD_PER_MILLION_TOKENS;
  return (usage.input_tokens * price.input
    + usage.output_tokens * price.output
    + (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite
    + (usage.cache_read_input_tokens ?? 0) * price.cacheRead) / 1_000_000;
}

async function askClaude(request: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">, recordCost: RecordCost) {
  const response = await anthropicClient().messages.create({ model: MODEL, ...request });
  recordCost(replyCostUsd(response.usage));
  return response;
}

function imageBlock(imageBuffer: Buffer, mediaType: ScreenshotMediaType) {
  return { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: imageBuffer.toString("base64") } };
}

export class ModelReplyRefused extends Error {
  name = "ModelReplyRefused";
}

function parseToolInput<T>(content: Anthropic.ContentBlock[], name: string, schema: z.ZodType<T>): T {
  const toolUse = content.find((block) => block.type === "tool_use");
  const parsed = schema.safeParse(toolUse?.type === "tool_use" && toolUse.name === name ? toolUse.input : null);
  if (!parsed.success) throw new ModelReplyRefused(`The model's ${name} reply does not fit its format`);
  return parsed.data;
}

export function extractAnalyticsRowsFromImage(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  section: AnalyticsSection,
  recordCost: RecordCost,
): Promise<AnalyticsExtraction> {
  return section === "LR" ? extractLRRows(imageBuffer, mediaType, rules, recordCost) : extractPassageRows(imageBuffer, mediaType, rules, recordCost);
}

async function extractLRRows(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  recordCost: RecordCost,
): Promise<AnalyticsExtraction> {
  const allTypes: LRType[] = [...rules.lrStemTypes, ...rules.lrLogicTypes];

  const response = await askClaude({
    max_tokens: 1024,
    tool_choice: { type: "tool", name: TOOL_NAME },
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the LR question-type rows visible in a 7Sage analytics screenshot.",
        input_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: allTypes,
                    description: "The exact LR question type name for this row.",
                  },
                  accuracy: {
                    type: "number",
                    description: "Accuracy percentage (0-100) shown for this row, if present.",
                  },
                  priority: {
                    type: "string",
                    enum: Object.keys(PRIORITY_TIER),
                    description: "The priority tier shown for this row, if present.",
                  },
                },
                required: ["type"],
              },
            },
          },
          required: ["rows"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          imageBlock(imageBuffer, mediaType),
          {
            type: "text",
            text: `This is a screenshot of a 7Sage LSAT analytics dashboard listing Logical Reasoning question types. Each row shows either an accuracy percentage or a priority tier (HIGHEST, HIGH, MEDIUM, or LOW).

For every row visible in the image, call ${TOOL_NAME} with one entry per row. Use the exact type name from the allowed list — match it to the closest valid name even if the screenshot's rendering is imperfect. Only report accuracy for rows that show a percentage. Only report priority for rows that show a tier. Do not include rows that aren't visible in the image.`,
          },
        ],
      },
    ],
  }, recordCost);

  const { rows } = parseToolInput(response.content, TOOL_NAME, lrToolInput(allTypes));
  return {
    rows: rows.map(({ type, accuracy, priority }) => {
      const row: AnalyticsExtractedRow = { type, category: categoryFor(type, rules), accuracy };
      const priorityTier = priority && PRIORITY_TIER[priority];
      if (!priorityTier) return row;
      return { ...row, isTopPriority: isTopPriorityTier(priorityTier), priorityTier };
    }),
  };
}

async function extractPassageRows(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  recordCost: RecordCost,
): Promise<AnalyticsExtraction> {
  const response = await askClaude({
    max_tokens: 512,
    tool_choice: { type: "tool", name: TOOL_NAME },
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the RC passage-type rows visible in a 7Sage analytics screenshot.",
        input_schema: {
          type: "object",
          properties: {
            showsPassageTypes: {
              type: "boolean",
              description: "True when the screenshot is a 7Sage Reading Comprehension passage-type page, even if no row shows a percentage. False for any other page, such as a Logical Reasoning page.",
            },
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: rules.rcTypes, description: "The RC passage type for this row." },
                  accuracy: { type: "number", description: "Accuracy percentage (0-100) shown for this row." },
                },
                required: ["type", "accuracy"],
              },
            },
          },
          required: ["showsPassageTypes", "rows"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          imageBlock(imageBuffer, mediaType),
          {
            type: "text",
            text: `This is a screenshot of a 7Sage LSAT analytics dashboard. Find the Reading Comprehension passage types: ${rules.rcTypes.join(", ")}. Each row shows an accuracy percentage.

Call ${TOOL_NAME} once. Set showsPassageTypes to true if the screenshot is the Reading Comprehension passage-type page, even when no row shows a percentage. Set it to false for any other page, such as a Logical Reasoning page. Then list one entry per passage-type row that is visible, shows a percentage, and is named exactly as one of the passage types above. 7Sage also lists other passage types, such as Critique or debate, Implied, and Single position. Leave those rows out; never record one under a listed type. The percentage is the "Your accuracy" value. The number on the Review button is a question count, not an accuracy, so leave out a row that shows no accuracy percentage. Do not report Logical Reasoning question types, and do not include rows that aren't visible in the image.`,
          },
        ],
      },
    ],
  }, recordCost);

  const { rows, showsPassageTypes } = parseToolInput(response.content, TOOL_NAME, passageToolInput(rules.rcTypes));
  return {
    rows: rows.map(({ type, accuracy }) => ({ type, category: "passage", accuracy })),
    showsPassageTypes,
  };
}

const SECTION_TOOL_NAME = "record_practice_test_section";
const QUESTION_RESULTS = ["correct", "wrong", "unanswered", "hidden"] as const;

const MAX_SECTION_QUESTIONS = 30;
const SectionHeader = {
  page: z.literal("section_review"),
  prepTest: z.number().int().min(1).max(999),
  section: z.number().int().min(1).max(4),
  score: z.number().int().min(-MAX_SECTION_QUESTIONS).max(MAX_SECTION_QUESTIONS).transform((score) => (score > 0 ? -score : score)),
  reachesEnd: z.boolean(),
};
const ToolSectionReading = z.union([
  z.object({
    ...SectionHeader,
    kind: z.literal("LR"),
    rows: z.array(z.object({
      question: z.number().int().min(1).max(MAX_SECTION_QUESTIONS),
      result: z.enum(QUESTION_RESULTS),
      tags: z.array(z.string().max(40)).max(8),
    })).max(MAX_SECTION_QUESTIONS),
  }),
  z.object({ ...SectionHeader, kind: z.literal("RC") }),
  z.object({ page: z.enum(["analytics", "other"]) }),
]);

export async function readPracticeTestSectionFromImage(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  recordCost: RecordCost,
): Promise<SectionReading> {
  const response = await askClaude({
    max_tokens: 4096,
    tool_choice: { type: "tool", name: SECTION_TOOL_NAME },
    tools: [
      {
        name: SECTION_TOOL_NAME,
        description: "Record what a 7Sage screenshot shows: one practice-test section review, or another page.",
        input_schema: {
          type: "object",
          properties: {
            page: {
              type: "string",
              enum: ["section_review", "analytics", "other"],
              description: "section_review for one section of a practice-test review, analytics for the 7Sage analytics dashboard, other for anything else.",
            },
            prepTest: { type: "integer", description: "The PrepTest number, such as 158 from PT158.S2.Q18." },
            section: { type: "integer", description: "The section number, such as 2 from PT158.S2.Q18." },
            kind: { type: "string", enum: ["LR", "RC"], description: "The badge beside the section title." },
            score: { type: "integer", description: "The SCORE box at the top right, as shown. It is zero or negative, such as -4." },
            reachesEnd: { type: "boolean", description: "True when the bottom edge of the question table is visible after the last row." },
            rows: {
              type: "array",
              description: "Every LR question row visible, top to bottom. Leave empty for RC.",
              items: {
                type: "object",
                properties: {
                  question: { type: "integer", description: "The question number, such as 18 from PT158.S2.Q18." },
                  result: { type: "string", enum: QUESTION_RESULTS },
                  tags: { type: "array", items: { type: "string" }, description: "Every tag under the question id, exactly as written." },
                },
                required: ["question", "result", "tags"],
              },
            },
          },
          required: ["page"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          imageBlock(imageBuffer, mediaType),
          {
            type: "text",
            text: `This should be a screenshot of one section of a 7Sage LSAT practice-test review page. The page title reads "Section N" with an LR or RC badge. A SCORE box sits at the top right. Each question row starts with an id such as PT158.S2.Q18: PrepTest 158, section 2, question 18. RC ids include a passage, such as PT158.S1.P1.Q1. Small tags under each id name the question type, such as Flaw, NA, or CausR.

The RESULT column shows a green check for correct, a red X for wrong, and a red minus for unanswered. A row with no result icon, where the cursor hover shows answer-popularity percentages instead, is hidden.

Call ${SECTION_TOOL_NAME} once. For an LR section, report every visible row in order with its result and all of its tags. For an RC section, do not report rows. If the screenshot shows the 7Sage analytics dashboard, set page to analytics. If it shows anything else, set page to other.`,
          },
        ],
      },
    ],
  }, recordCost);

  return parseToolInput(response.content, SECTION_TOOL_NAME, ToolSectionReading);
}
