import FileFilter, { FilterType } from "./index";

/**
 * A single field=value condition within a nested JSON annotation.
 *
 * `path` is the dot-separated path to the target field from the top of each array element,
 * e.g. `"Gene"` or `"Dose.Value"`.
 * `jsonPath` is the full DuckDB JSONPath to use when testing that field from within a single
 * array element (passed as `x` in the lambda), e.g. `"$.Gene"` or `"$.Dose[*].Value"`.
 */
export interface NestedCondition {
    /** Human-readable path, e.g. "Gene" or "Dose.Value". */
    path: string[];
    /** DuckDB JSONPath relative to a single array element, e.g. "$.Gene" or "$.Dose[*].Value". */
    elementJsonPath: string;
    value: string | number | boolean;
}

/**
 * A filter that applies multiple field=value conditions to a single JSON array annotation
 * and requires ALL conditions to be satisfied **within the same array element**.
 *
 * This is distinct from adding independent `FileFilter` instances—those independently check
 * `$[*].<path>` across every array element, so different elements could satisfy different
 * conditions. `NestedCombinationFilter` ensures all conditions hold for the same element.
 *
 * Example
 * -------
 * ```
 * new NestedCombinationFilter("Well", [
 *   { path: ["Gene"],          elementJsonPath: "$.Gene",            value: "TP53" },
 *   { path: ["Dose", "Value"], elementJsonPath: "$.Dose[*].Value",   value: 0.5   },
 * ])
 * ```
 * Matches files where at least one entry in the `Well` JSON array has Gene = "TP53"
 * **and** (within that same entry) Dose[*].Value contains 0.5.
 *
 * SQL generated (DuckDB list_filter with lambda over json_extract array):
 * ```sql
 * len(list_filter(
 *   json_extract("Well"::JSON, '$[*]'),
 *   x -> json_extract_string(x, '$.Gene') = 'TP53'
 *        AND json_contains(CAST(json_extract(x, '$.Dose[*].Value') AS VARCHAR)::JSON, '0.5'::JSON)
 * )) > 0
 * ```
 */
export default class NestedCombinationFilter extends FileFilter {
    private readonly conditions: NestedCondition[];

    public static isNestedCombinationFilter(
        candidate: unknown
    ): candidate is NestedCombinationFilter {
        return candidate instanceof NestedCombinationFilter;
    }

    constructor(annotationName: string, conditions: NestedCondition[]) {
        super(annotationName, JSON.stringify(conditions), FilterType.DEFAULT);
        this.conditions = conditions;
    }

    public get nestedConditions(): NestedCondition[] {
        return this.conditions;
    }

    public toSQLWhereString(): string {
        if (this.conditions.length === 0) {
            return "1=1";
        }

        const col = this.name;

        // Build a lambda expression over each element `x` of the JSON array.
        // Scalar fields use json_extract_string; array sub-fields use json_contains.
        const conditionExprs = this.conditions.map(({ elementJsonPath, value }) => {
            const escapedValue = `${value}`.replaceAll("'", "''");
            // If the element JSONPath itself traverses an array (contains [*]), the result is
            // another JSON array — use json_contains to check membership.
            if (elementJsonPath.includes("[*]")) {
                const jsonElement =
                    typeof value === "string"
                        ? `'"${escapedValue}"'`
                        : `'${escapedValue}'`;
                return (
                    `json_contains(` +
                    `CAST(json_extract(x, '${elementJsonPath}') AS VARCHAR)::JSON, ` +
                    `${jsonElement}::JSON)`
                );
            }
            // Scalar field: direct string equality via json_extract_string.
            return `json_extract_string(x, '${elementJsonPath}') = '${escapedValue}'`;
        });

        const lambda = conditionExprs.join(" AND ");
        return `len(list_filter(json_extract("${col}"::JSON, '$[*]'), x -> ${lambda})) > 0`;
    }

    public toJSON() {
        return {
            ...super.toJSON(),
            nestedConditions: this.conditions,
        };
    }
}
