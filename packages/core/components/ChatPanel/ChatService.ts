import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter from "../../entity/FileFilter";
import { AnnotationValue } from "../../services/AnnotationService";
import { ChatMessage, LLMResponse } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// Max values to show per annotation to avoid prompt bloat
const MAX_VALUES_PER_ANNOTATION = 50;

// Annotation types worth fetching values for
const VALUE_TYPES = new Set([
    AnnotationType.STRING,
    AnnotationType.DROPDOWN,
    AnnotationType.LOOKUP,
    AnnotationType.BOOLEAN,
]);

export function shouldFetchValues(annotation: Annotation): boolean {
    return VALUE_TYPES.has(annotation.type as AnnotationType);
}

function serializeAnnotations(
    annotations: Annotation[],
    annotationValues: Record<string, AnnotationValue[]>
): string {
    return annotations
        .map((a) => {
            let line = `- "${a.name}" (display: "${a.displayName}", type: ${a.type}${
                a.units ? `, units: ${a.units}` : ""
            }${a.description ? `, description: ${a.description}` : ""})`;
            const values = annotationValues[a.name];
            if (values && values.length > 0) {
                const displayValues = values.slice(0, MAX_VALUES_PER_ANNOTATION);
                line += `\n  Known values: ${displayValues.map((v) => `"${v}"`).join(", ")}`;
                if (values.length > MAX_VALUES_PER_ANNOTATION) {
                    line += ` ... and ${values.length - MAX_VALUES_PER_ANNOTATION} more`;
                }
            }
            return line;
        })
        .join("\n");
}

function serializeCurrentFilters(filters: FileFilter[]): string {
    if (filters.length === 0) return "None";
    return filters.map((f) => `- ${f.name} ${f.type} "${f.value}"`).join("\n");
}

function buildSystemPrompt(
    annotations: Annotation[],
    currentFilters: FileFilter[],
    annotationValues: Record<string, AnnotationValue[]>
): string {
    const today = new Date();
    const todayISO = today.toISOString();
    return `You are a file search assistant for a scientific data management application. Users describe files they want to find using natural language, and you translate their requests into structured filter and sort instructions.

IMPORTANT: Today's date is ${
        todayISO.split("T")[0]
    } (${todayISO}). Use this for all relative date calculations ("last month", "past week", "yesterday", etc.).

This is a multi-turn conversation. The user may refine their search incrementally across messages. Pay attention to context:
- "also show X" or "add X" means ADD filters to existing ones
- "only show X" or "change to X" means REMOVE old related filters and ADD new ones
- "remove X" or "drop X" means REMOVE that specific filter
- "clear all" or "reset" means remove ALL current filters
- "sort by X" changes sorting without affecting filters
- "what filters are active?" or "what am I looking at?" means describe current state in the message, no filter changes needed

## Available Annotations
The following annotations (columns) are available for filtering and sorting. For text/dropdown annotations, known valid values are listed. When the user's input has a typo or is close to a known value, use the correct known value instead (e.g., "imaege" → "Image", "csv" → "CSV").
${serializeAnnotations(annotations, annotationValues)}

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
  "message": "A brief human-readable description of what you did",
  "suggestions": ["suggested follow-up query 1", "suggested follow-up query 2"]
}

## Filter Type Guide
- "default": Exact match. Use for specific known values (e.g., Kind = "csv", file_name = "foo.csv")
- "fuzzy": Regex/partial match. Use when the user says "contains", "like", "matching", or provides partial text. The value is used as a regex pattern.
- "include": Selects files where the annotation IS NOT NULL (has any value). Use for "has a value for X", "show files with X".
- "exclude": Selects files where the annotation IS NULL. Use for "missing X", "without X", "no value for X".

## Type-Specific Value Formatting
- Date/DateTime: For date range queries (which is the most common case), use the RANGE format: "RANGE(startISO,endISO)" where both dates are full ISO 8601 strings with timezone. Examples:
  - "last month": "RANGE(2026-02-01T00:00:00.000Z,2026-02-28T23:59:59.999Z)"
  - "past week": "RANGE(2026-03-20T00:00:00.000Z,${todayISO})"
  - "since January 2026": "RANGE(2026-01-01T00:00:00.000Z,${todayISO})"
  - "past year": "RANGE(2025-03-27T00:00:00.000Z,${todayISO})"
  Use filterType "default" (not "fuzzy") for RANGE values. Always use full ISO strings with .000Z timezone suffix.
- Number: Use plain numbers without units. For file_size, use bytes (1 MB = 1000000). For numeric ranges use "RANGE(min,max)" with filterType "default".
- YesNo: Use "true" or "false"
- Text/Dropdown/Lookup: Use string values. For fuzzy matching, provide a regex pattern.

## Important Rules
1. ONLY use annotationName values from the "Available Annotations" list above. Never invent annotation names.
2. If the user's request doesn't map to any available annotation, say so in the message field and return empty filters array.
3. If ambiguous, pick the most likely annotation and explain your choice in the message.
4. For "clear filters" or "reset" requests, return removeFilters for all currently active filter annotation names.
5. Always include a helpful "message" explaining what you did. Summarize the current filter state after changes.
6. For numeric range filtering (e.g., "larger than 1MB"), use the RANGE format: "RANGE(min,max)" with filterType "default". For "larger than 1MB": "RANGE(1000000,999999999999)". For "between 1MB and 10MB": "RANGE(1000000,10000000)".
7. The "sort" field is optional. Only include it if the user asks for sorting. Set it to null if not needed.
8. The "removeFilters" field is optional. Only include it if the user wants to remove specific filters.
9. When refining, only output the CHANGES (new filters to add, filters to remove). Do NOT re-emit filters that are already active.
10. If the user asks a question about the data or current state without requesting changes, return empty filters array and answer in the message field.
11. Always include 2-3 "suggestions" — short, clickable follow-up queries the user might want to try next. Make them contextually relevant (e.g., after filtering by Kind, suggest sorting or filtering by another annotation). Keep each suggestion under 40 characters.`;
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
    apiKey: string,
    annotationValues: Record<string, AnnotationValue[]> = {}
): Promise<LLMResponse> {
    const systemPrompt = buildSystemPrompt(annotations, currentFilters, annotationValues);

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
        let errorMessage = `API error ${response.status}`;
        try {
            const parsed = JSON.parse(errorBody);
            errorMessage = parsed?.error?.message || errorMessage;
        } catch {
            // Use raw text if not JSON
            errorMessage = errorBody || errorMessage;
        }
        throw new Error(errorMessage);
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
