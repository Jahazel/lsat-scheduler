import Anthropic from "@anthropic-ai/sdk";
import type { AnalyticsExtractedRow, LRLogicType, LRType, RulesConfig } from "./types";

const client = new Anthropic();

const TOOL_NAME = "record_analytics_rows";

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function isSupportedMediaType(mediaType: string): mediaType is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mediaType);
}

// Category is a deterministic lookup off the rules config, not something the
// model should guess — a type is either a Question Stem type, a Stimulus
// Logic exception, or a restricted Stimulus Logic type.
function categoryFor(type: LRType, rules: RulesConfig): "regular" | "restricted" {
  if (!rules.lrLogicTypes.includes(type as LRLogicType)) return "regular";
  return rules.lrLogicExceptions.includes(type as LRLogicType) ? "regular" : "restricted";
}

interface ExtractedRow {
  type: LRType;
  accuracy?: number;
  isTopPriority?: boolean;
}

export async function extractAnalyticsRowsFromImage(
  imageBuffer: Buffer,
  mediaType: string,
  rules: RulesConfig
): Promise<AnalyticsExtractedRow[]> {
  if (!isSupportedMediaType(mediaType)) {
    throw new Error(`Unsupported image type: ${mediaType}`);
  }

  const allTypes: LRType[] = [...rules.lrStemTypes, ...rules.lrLogicTypes];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
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
                  isTopPriority: {
                    type: "boolean",
                    description: "True only if this row is explicitly flagged HIGHEST priority.",
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
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBuffer.toString("base64") },
          },
          {
            type: "text",
            text: `This is a screenshot of a 7Sage LSAT analytics dashboard listing Logical Reasoning question types. Each row shows either an accuracy percentage or a priority tier (HIGHEST, MEDIUM, or LOW).

For every row visible in the image, call ${TOOL_NAME} with one entry per row. Use the exact type name from the allowed list — match it to the closest valid name even if the screenshot's rendering is imperfect. Only report accuracy for rows that show a percentage. Only set isTopPriority to true for rows explicitly marked HIGHEST — never for MEDIUM or LOW. Do not include rows that aren't visible in the image.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];

  const { rows } = toolUse.input as { rows: ExtractedRow[] };

  return rows.map((row) => ({
    type: row.type,
    category: categoryFor(row.type, rules),
    accuracy: row.accuracy,
    isTopPriority: row.isTopPriority,
  }));
}
