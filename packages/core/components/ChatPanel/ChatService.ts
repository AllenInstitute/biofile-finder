import Annotation from "../../entity/Annotation";
import FileFilter from "../../entity/FileFilter";
import { ChatMessage, LLMResponse } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

function serializeAnnotations(annotations: Annotation[]): string {
    return annotations
        .map(
            (a) =>
                `- "${a.name}" (display: "${a.displayName}", type: ${a.type}${
                    a.units ? `, units: ${a.units}` : ""
                }${a.description ? `, description: ${a.description}` : ""})`
        )
        .join("\n");
}

function serializeCurrentFilters(filters: FileFilter[]): string {
    if (filters.length === 0) return "None";
    return filters.map((f) => `- ${f.name} ${f.type} "${f.value}"`).join("\n");
}

function buildSystemPrompt(annotations: Annotation[], currentFilters: FileFilter[]): string {
    return `You are a file search assistant for a scientific data management application. Users describe files they want to find using natural language, and you translate their requests into structured filter and sort instructions.

## Available Annotations
The following annotations (columns) are available for filtering and sorting:
${serializeAnnotations(annotations)}

## Current Filters
These filters are currently applied:
${serializeCurrentFilters(currentFilters)}

## Output Format
You MUST respond with a JSON object wrapped in <filters> tags. The JSON has this schema:
{
  "filters": [
    {
      "annotationName": "exact annotation name from the list above",
      "annotationValue": "the value to filter on",
      "filterType": "default" | "fuzzy" | "include" | "exclude"
    }
  ],
  "sort": {
    "annotationName": "exact annotation name",
    "order": "ASC" | "DESC"
  },
  "removeFilters": [
    {
      "annotationName": "annotation name to remove all filters for"
    }
  ],
  "message": "A brief human-readable description of what you did"
}

## Filter Type Guide
- "default": Exact match. Use for specific known values (e.g., Kind = "csv", file_name = "foo.csv")
- "fuzzy": Regex/partial match. Use when the user says "contains", "like", "matching", or provides partial text. The value is used as a regex pattern.
- "include": Selects files where the annotation IS NOT NULL (has any value). Use for "has a value for X", "show files with X".
- "exclude": Selects files where the annotation IS NULL. Use for "missing X", "without X", "no value for X".

## Type-Specific Value Formatting
- Date/DateTime: Use ISO format strings like "2024-01-15" or "2024-01-15T10:30:00"
- Number: Use plain numbers without units. For file_size, use bytes (1 MB = 1000000).
- YesNo: Use "true" or "false"
- Text/Dropdown/Lookup: Use string values. For fuzzy matching, provide a regex pattern.

## Important Rules
1. ONLY use annotationName values from the "Available Annotations" list above. Never invent annotation names.
2. If the user's request doesn't map to any available annotation, say so in the message field and return empty filters array.
3. If ambiguous, pick the most likely annotation and explain your choice in the message.
4. For "clear filters" or "reset" requests, return removeFilters for all currently active filter annotation names.
5. Always include a helpful "message" explaining what you did.
6. For numeric range filtering (e.g., "larger than 1MB"), note that exact numeric comparisons are not supported. Use fuzzy filters where possible or suggest using the sidebar controls for precise ranges.
7. The "sort" field is optional. Only include it if the user asks for sorting. Set it to null if not needed.
8. The "removeFilters" field is optional. Only include it if the user wants to remove specific filters.`;
}

export function parseResponse(text: string): LLMResponse | null {
    const match = text.match(/<filters>([\s\S]*?)<\/filters>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

export async function sendChatMessage(
    messages: ChatMessage[],
    annotations: Annotation[],
    currentFilters: FileFilter[],
    apiKey: string
): Promise<LLMResponse> {
    const systemPrompt = buildSystemPrompt(annotations, currentFilters);

    const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: apiMessages,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const assistantText = data.content?.[0]?.text;

    if (!assistantText) {
        throw new Error("No response text from API");
    }

    const parsed = parseResponse(assistantText);
    if (!parsed) {
        // If the LLM didn't use the structured format, return the raw text as a message
        return {
            filters: [],
            message: assistantText,
        };
    }

    return parsed;
}
