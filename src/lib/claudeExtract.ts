import Anthropic from "@anthropic-ai/sdk";
import type { ScreenshotMediaType } from "./screenshotUpload";
import type { AnalyticsExtractedRow, AnalyticsSection, LRLogicType, LRType, PriorityTier, RCType, RulesConfig } from "./types";

const TOOL_NAME = "record_analytics_rows";
const MODEL = "claude-haiku-4-5-20251001";

export function categoryFor(type: LRType, rules: RulesConfig): "regular" | "restricted" {
  if (!rules.lrLogicTypes.includes(type as LRLogicType)) return "regular";
  return rules.lrLogicExceptions.includes(type as LRLogicType) ? "regular" : "restricted";
}

const PRIORITY_TIER: Record<"HIGHEST" | "MEDIUM" | "LOW", PriorityTier> = { HIGHEST: "highest", MEDIUM: "medium", LOW: "low" };

interface ExtractedRow {
  type: LRType;
  accuracy?: number;
  priority?: keyof typeof PRIORITY_TIER;
}

function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured");
  }
  return new Anthropic({ apiKey });
}

function imageBlock(imageBuffer: Buffer, mediaType: ScreenshotMediaType) {
  return { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: imageBuffer.toString("base64") } };
}

function toolInput(content: Anthropic.ContentBlock[]) {
  const toolUse = content.find((block) => block.type === "tool_use");
  return toolUse?.type === "tool_use" ? toolUse.input : null;
}

export function extractAnalyticsRowsFromImage(
  imageBuffer: Buffer,
  mediaType: ScreenshotMediaType,
  rules: RulesConfig,
  section: AnalyticsSection,
): Promise<AnalyticsExtractedRow[]> {
  return section === "LR" ? extractLRRows(imageBuffer, mediaType, rules) : extractPassageRows(imageBuffer, mediaType, rules);
}

async function extractLRRows(imageBuffer: Buffer, mediaType: ScreenshotMediaType, rules: RulesConfig): Promise<AnalyticsExtractedRow[]> {
  const client = anthropicClient();

  const allTypes: LRType[] = [...rules.lrStemTypes, ...rules.lrLogicTypes];

  const response = await client.messages.create({
    model: MODEL,
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
            text: `This is a screenshot of a 7Sage LSAT analytics dashboard listing Logical Reasoning question types. Each row shows either an accuracy percentage or a priority tier (HIGHEST, MEDIUM, or LOW).

For every row visible in the image, call ${TOOL_NAME} with one entry per row. Use the exact type name from the allowed list — match it to the closest valid name even if the screenshot's rendering is imperfect. Only report accuracy for rows that show a percentage. Only report priority for rows that show a tier. Do not include rows that aren't visible in the image.`,
          },
        ],
      },
    ],
  });

  const input = toolInput(response.content);
  if (!input) return [];

  const { rows } = input as { rows: ExtractedRow[] };

  return rows.map(({ type, accuracy, priority }) => {
    const row: AnalyticsExtractedRow = { type, category: categoryFor(type, rules), accuracy };
    const priorityTier = priority && PRIORITY_TIER[priority];
    if (!priorityTier) return row;
    return { ...row, isTopPriority: priorityTier === "highest", priorityTier };
  });
}

async function extractPassageRows(imageBuffer: Buffer, mediaType: ScreenshotMediaType, rules: RulesConfig): Promise<AnalyticsExtractedRow[]> {
  const response = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: 512,
    tool_choice: { type: "tool", name: TOOL_NAME },
    tools: [
      {
        name: TOOL_NAME,
        description: "Record the RC passage-type rows visible in a 7Sage analytics screenshot.",
        input_schema: {
          type: "object",
          properties: {
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
            text: `This is a screenshot of a 7Sage LSAT analytics dashboard. Find the Reading Comprehension passage types: ${rules.rcTypes.join(", ")}. Each row shows an accuracy percentage.

Call ${TOOL_NAME} with one entry per passage-type row that is visible and shows a percentage. Do not report Logical Reasoning question types, and do not include rows that aren't visible in the image.`,
          },
        ],
      },
    ],
  });

  const input = toolInput(response.content);
  if (!input) return [];
  const { rows } = input as { rows: { type: RCType; accuracy?: number }[] };
  return rows
    .filter(({ type }) => rules.rcTypes.includes(type))
    .map(({ type, accuracy }) => ({ type, category: "passage", accuracy }));
}
