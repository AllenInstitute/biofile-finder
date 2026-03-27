import axios from "axios";

import OllamaService, { AnnotationContext, OllamaFilterResult } from "../";
import { FilterType } from "../../../entity/FileFilter";

const DEFAULT_BASE_URL = "/llm";
const DEFAULT_MODEL = "llama3.2";

function buildSystemPrompt(
    annotations: AnnotationContext[],
    currentFilters?: { name: string; value: string; type: string }[]
): string {
    const today = new Date();
    const todayISO = today.toISOString();

    const annotationDescription = annotations
        .map((a) => {
            let line = `- "${a.name}" (display: "${a.displayName}", type: ${a.type})`;
            if (a.description) {
                line += `\n  Description: ${a.description}`;
            }
            if (a.sampleValues && a.sampleValues.length > 0) {
                const samples = a.sampleValues.slice(0, 20).map((v) => JSON.stringify(v));
                line += `\n  Sample values: [${samples.join(", ")}]`;
            }
            return line;
        })
        .join("\n");

    let currentFilterDescription = "";
    if (currentFilters && currentFilters.length > 0) {
        currentFilterDescription = `\n\nCurrently applied filters:\n${currentFilters
            .map((f) => `- ${f.name} = ${f.value} (type: ${f.type})`)
            .join("\n")}`;
    }

    return `You are a data filtering assistant. Today's date is ${todayISO}.

The user has a dataset with the following annotation columns:

${annotationDescription}
${currentFilterDescription}

The user will describe in natural language how they want to filter or group the data. You must respond with ONLY a JSON object matching this exact schema:

{
  "filters": [
    {
      "name": "<exact annotation name from the list above>",
      "value": "<the value to filter on>",
      "type": "<one of: default, fuzzy, include, exclude>"
    }
  ],
  "hierarchy": ["<annotation name>", "<annotation name>"],
  "clear": false
}

If the user asks to clear, reset, start over, or remove all filters/grouping/sorting, respond with:
{"filters": [], "hierarchy": [], "clear": true}

Filter type meanings:
- "default": exact match on the value. Use when the user wants a specific value that matches a sample value exactly.
- "fuzzy": regex/pattern match. Use for partial text matches (e.g. file names containing a word). The value is treated as a regular expression.
- "include": show only rows where this annotation has any non-null value. Use when the user says "has a value" or "is not empty".
- "exclude": show only rows where this annotation is null. Use when the user says "is empty" or "has no value".

CRITICAL RULES:
1. Only use annotation names that EXACTLY match the "name" field (not the display name) from the list above.
2. "hierarchy" is an ordered list of annotation names to group/organize the data by (like folders). Leave empty [] if the user didn't ask for grouping.
3. "filters" should contain constraints the user described. Leave empty [] if none requested.
4. For date/time filters (type DateTime), use ISO 8601 format in a RANGE operator: "RANGE(startISO,endISO)". 
   Examples:
   - "last month" -> "RANGE(${new Date(
       today.getFullYear(),
       today.getMonth() - 1,
       1
   ).toISOString()},${new Date(today.getFullYear(), today.getMonth(), 1).toISOString()})"
   - "last 30 days" -> "RANGE(${new Date(
       Date.now() - 30 * 24 * 60 * 60 * 1000
   ).toISOString()},${todayISO})"
   - "this year" -> "RANGE(${new Date(today.getFullYear(), 0, 1).toISOString()},${todayISO})"
   Always use type "default" with RANGE values.
5. For numeric ranges, also use "RANGE(min,max)" with type "default".
6. When filtering by file type or kind, look at the sample values of annotations like "Kind" or "Type" and use an exact match ("default" type) with the matching sample value. For example, if the user says "ome-zarr files" and "OME-ZARR" is a sample value of the "Kind" annotation, use {"name": "Kind", "value": "OME-ZARR", "type": "default"}.
7. When the user mentions a concept that maps to a specific annotation value from the samples, always prefer an exact "default" match over "fuzzy".
8. Respond with ONLY the JSON object, no explanation or markdown.

EXAMPLES:

User: "show me only ome-zarr files uploaded in the last month"
(assuming Kind has sample value "OME-ZARR" and uploaded is a DateTime annotation)
{
  "filters": [
    {"name": "Kind", "value": "OME-ZARR", "type": "default"},
    {"name": "uploaded", "value": "RANGE(${new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
    ).toISOString()},${new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    ).toISOString()})", "type": "default"}
  ],
  "hierarchy": []
}

User: "group by cell line and structure"
(assuming Gene is an annotation name)
{
  "filters": [],
  "hierarchy": ["Cell Line", "Structure"]
}

User: "show files larger than 1GB"
{
  "filters": [
    {"name": "file_size", "value": "RANGE(1073741824,Infinity)", "type": "default"}
  ],
  "hierarchy": []
}`;
}

export default class HttpOllamaService implements OllamaService {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = DEFAULT_BASE_URL, model: string = DEFAULT_MODEL) {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    public async isAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/models`, { timeout: 3000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    public async generateFilterQuery(
        prompt: string,
        annotations: AnnotationContext[],
        currentFilters?: { name: string; value: string; type: string }[]
    ): Promise<OllamaFilterResult> {
        const systemPrompt = buildSystemPrompt(annotations, currentFilters);

        console.log("[LLMService] === SYSTEM PROMPT ===\n", systemPrompt);
        console.log("[LLMService] === USER PROMPT ===\n", prompt);
        console.log("[LLMService] === ANNOTATIONS ===\n", JSON.stringify(annotations, null, 2));
        console.log(
            "[LLMService] === CURRENT FILTERS ===\n",
            JSON.stringify(currentFilters, null, 2)
        );

        const response = await axios.post(
            `${this.baseUrl}/v1/chat/completions`,
            {
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0,
            },
            { timeout: 480000 }
        );

        const rawResponse = response.data?.choices?.[0]?.message?.content;
        console.log("[LLMService] === RAW RESPONSE ===\n", rawResponse);
        if (!rawResponse) {
            throw new Error("Empty response from Ollama");
        }

        let parsed: any;
        try {
            parsed = JSON.parse(rawResponse);
        } catch {
            throw new Error(`Failed to parse Ollama response as JSON: ${rawResponse}`);
        }

        return this.validateAndNormalize(parsed, annotations);
    }

    private validateAndNormalize(
        parsed: any,
        annotations: AnnotationContext[]
    ): OllamaFilterResult {
        const validAnnotationNames = new Set(annotations.map((a) => a.name));

        const filters = Array.isArray(parsed.filters)
            ? parsed.filters
                  .filter(
                      (f: any) =>
                          f &&
                          typeof f.name === "string" &&
                          validAnnotationNames.has(f.name) &&
                          f.value !== undefined
                  )
                  .map((f: any) => ({
                      name: f.name,
                      value: String(f.value),
                      type: this.normalizeFilterType(f.type),
                  }))
            : [];

        const hierarchy = Array.isArray(parsed.hierarchy)
            ? parsed.hierarchy.filter(
                  (name: any) => typeof name === "string" && validAnnotationNames.has(name)
              )
            : [];

        return { filters, hierarchy, clear: !!parsed.clear };
    }

    private normalizeFilterType(type: string | undefined): FilterType {
        switch (type) {
            case "fuzzy":
                return FilterType.FUZZY;
            case "include":
                return FilterType.ANY;
            case "exclude":
                return FilterType.EXCLUDE;
            case "default":
            default:
                return FilterType.DEFAULT;
        }
    }
}
