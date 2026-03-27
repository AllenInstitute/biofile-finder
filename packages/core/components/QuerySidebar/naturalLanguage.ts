import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import FileSort, { SortOrder } from "../../entity/FileSort";
import { AnnotationValue } from "../../services/AnnotationService";

export interface SharedAnnotationValue {
    annotationName: string;
    value: AnnotationValue;
}

export interface ParsedNaturalLanguageQuery {
    ambiguities: AnnotationAmbiguity[];
    filters: FileFilter[];
    hierarchy: string[];
    sortColumn?: FileSort;
    touchedFilters: boolean;
    touchedHierarchy: boolean;
    touchedSort: boolean;
}

interface ParserOptions {
    annotations: Annotation[];
    annotationValuesByName?: Record<string, AnnotationValue[]>;
    availableAnnotationNames?: string[];
    resolvedAnnotationsByPhrase?: Record<string, string>;
}

interface AnnotationAlias {
    annotation: Annotation;
    aliases: string[];
}

export interface AnnotationAmbiguity {
    kind: "annotation";
    phrase: string;
    matches: Annotation[];
}

const QUERY_PREFIX_PATTERN = /\b(?:show|find|list|search|filter|files?|items?|results?|that|matching|me|all)\b/g;
const CLAUSE_BOUNDARY_PATTERN = /\b(?:group(?:ed)?(?:\s+results)?\s+by|sort(?:ed)?\s+by|order(?:ed)?\s+by|where|with|having|filter(?:ed)?(?:\s+by)?)\b/;

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeNaturalLanguageText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_/]/g, " ")
        .replace(/["'`]/g, "")
        .replace(/[^\w\s,-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function createAnnotationAliases(annotations: Annotation[]): AnnotationAlias[] {
    return annotations.map((annotation) => {
        const aliases = Array.from(
            new Set(
                [annotation.name, annotation.displayName]
                    .map(normalizeNaturalLanguageText)
                    .filter((alias) => !!alias)
            )
        ).sort((left, right) => right.length - left.length);

        return { annotation, aliases };
    });
}

function getMatchingAnnotations(
    candidate: string,
    aliases: AnnotationAlias[],
    availableAnnotationNames: Set<string>
): Annotation[] {
    const normalizedCandidate = normalizeNaturalLanguageText(candidate);
    if (!normalizedCandidate) {
        return [];
    }

    const exactMatches = aliases
        .filter(({ aliases: annotationAliases }) =>
            annotationAliases.some((alias) => alias === normalizedCandidate)
        )
        .map(({ annotation }) => annotation);
    if (exactMatches.length) {
        const availableExactMatches = exactMatches.filter((annotation) =>
            availableAnnotationNames.has(annotation.name)
        );
        return availableExactMatches.length ? availableExactMatches : exactMatches;
    }

    const partialMatches = aliases.filter(({ aliases: annotationAliases }) =>
        annotationAliases.some(
            (alias) => alias.includes(normalizedCandidate) || normalizedCandidate.includes(alias)
        )
    );

    const mappedPartialMatches = partialMatches.map(({ annotation }) => annotation);
    const availablePartialMatches = mappedPartialMatches.filter((annotation) =>
        availableAnnotationNames.has(annotation.name)
    );

    return availablePartialMatches.length ? availablePartialMatches : mappedPartialMatches;
}

function resolveAnnotation(
    candidate: string,
    aliases: AnnotationAlias[],
    ambiguities: AnnotationAmbiguity[],
    resolvedAnnotationsByPhrase: Record<string, string>,
    availableAnnotationNames: Set<string>
): Annotation | undefined {
    const normalizedCandidate = normalizeNaturalLanguageText(candidate);
    if (!normalizedCandidate) {
        return undefined;
    }

    const resolvedAnnotationName = resolvedAnnotationsByPhrase[normalizedCandidate];
    if (resolvedAnnotationName) {
        return aliases.find(({ annotation }) => annotation.name === resolvedAnnotationName)
            ?.annotation;
    }

    const matches = Array.from(
        new Map(
            getMatchingAnnotations(
                normalizedCandidate,
                aliases,
                availableAnnotationNames
            ).map((annotation) => [annotation.name, annotation])
        ).values()
    );
    if (matches.length === 1) {
        return matches[0];
    }

    if (matches.length > 1) {
        if (!ambiguities.some((ambiguity) => ambiguity.phrase === normalizedCandidate)) {
            ambiguities.push({
                kind: "annotation",
                phrase: normalizedCandidate,
                matches,
            });
        }
    }

    return undefined;
}

function splitClauseValues(value: string): string[] {
    return value
        .split(/\s*(?:,|\band\b|\bthen\b)\s*/)
        .map((part) => normalizeNaturalLanguageText(part))
        .filter((part) => !!part);
}

function coerceAnnotationValue(annotation: Annotation, value: string): AnnotationValue {
    return annotation.valueOf(value);
}

function isDateLikeAnnotation(annotation: Annotation): boolean {
    return annotation.type === AnnotationType.DATE || annotation.type === AnnotationType.DATETIME;
}

function formatDateRangeValue(
    annotation: Annotation,
    operator: "since" | "after" | "before",
    value: string
) {
    if (!isDateLikeAnnotation(annotation)) {
        return undefined;
    }

    const startOfInputDate = new Date(
        annotation.type === AnnotationType.DATE ? `${value}T00:00:00.000Z` : value
    );
    if (Number.isNaN(startOfInputDate.valueOf())) {
        return undefined;
    }

    const absoluteMin = new Date("2000-01-01T00:00:00.000Z");
    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(0, 0, 0, 0);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    if (operator === "before") {
        return `RANGE(${absoluteMin.toISOString()},${startOfInputDate.toISOString()})`;
    }

    return `RANGE(${startOfInputDate.toISOString()},${startOfTomorrow.toISOString()})`;
}

function parseGroupClause(
    query: string,
    annotationAliases: AnnotationAlias[],
    ambiguities: AnnotationAmbiguity[],
    resolvedAnnotationsByPhrase: Record<string, string>,
    availableAnnotationNames: Set<string>
): { hierarchy: string[]; touched: boolean } {
    const match = query.match(
        /\bgroup(?:ed)?(?:\s+results)?\s+by\s+(.+?)(?=(?:\b(?:sort(?:ed)?|order(?:ed)?)\s+by\b|\b(?:where|with|having|filter(?:ed)?(?:\s+by)?)\b|$))/i
    );

    if (!match?.[1]) {
        return { hierarchy: [], touched: false };
    }

    const hierarchy = Array.from(
        new Set(
            splitClauseValues(match[1])
                .map(
                    (part) =>
                        resolveAnnotation(
                            part,
                            annotationAliases,
                            ambiguities,
                            resolvedAnnotationsByPhrase,
                            availableAnnotationNames
                        )?.name
                )
                .filter((value): value is string => !!value)
        )
    );

    return { hierarchy, touched: hierarchy.length > 0 };
}

function parseSortClause(
    query: string,
    annotationAliases: AnnotationAlias[],
    ambiguities: AnnotationAmbiguity[],
    resolvedAnnotationsByPhrase: Record<string, string>,
    availableAnnotationNames: Set<string>
): { sortColumn?: FileSort; touched: boolean } {
    const match = query.match(
        /\b(?:sort(?:ed)?|order(?:ed)?)\s+by\s+(.+?)(?=(?:\bgroup(?:ed)?(?:\s+results)?\s+by\b|\b(?:where|with|having|filter(?:ed)?(?:\s+by)?)\b|$))/i
    );
    if (!match?.[1]) {
        return { touched: false };
    }

    const normalizedClause = normalizeNaturalLanguageText(match[1]);
    if (/\b(?:none|clear|reset)\b/.test(normalizedClause)) {
        return { sortColumn: undefined, touched: true };
    }

    const descending = /\b(?:desc|descending|latest|newest)\b/.test(normalizedClause);
    const ascending = /\b(?:asc|ascending|oldest)\b/.test(normalizedClause);
    const cleanedClause = normalizedClause
        .replace(/\b(?:desc|descending|asc|ascending|latest|newest|oldest)\b/g, "")
        .trim();
    const annotation = resolveAnnotation(
        cleanedClause,
        annotationAliases,
        ambiguities,
        resolvedAnnotationsByPhrase,
        availableAnnotationNames
    );

    return annotation
        ? {
              sortColumn: new FileSort(
                  annotation.name,
                  descending && !ascending ? SortOrder.DESC : SortOrder.ASC
              ),
              touched: true,
          }
        : { touched: false };
}

function stripRecognizedClauses(query: string): string {
    return normalizeNaturalLanguageText(query)
        .replace(
            /\b(?:sort(?:ed)?|order(?:ed)?)\s+by\s+.+?(?=(?:\bgroup(?:ed)?(?:\s+results)?\s+by\b|\b(?:where|with|having|filter(?:ed)?(?:\s+by)?)\b|$))/g,
            " "
        )
        .replace(/\bgroup(?:ed)?(?:\s+results)?\s+by\b/g, " ")
        .replace(/\b(?:where|with|having|filter(?:ed)?(?:\s+by)?)\b/g, " ")
        .replace(QUERY_PREFIX_PATTERN, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseConditionChunk(
    chunk: string,
    annotationAliases: AnnotationAlias[],
    ambiguities: AnnotationAmbiguity[],
    resolvedAnnotationsByPhrase: Record<string, string>,
    availableAnnotationNames: Set<string>
): FileFilter[] {
    const normalizedChunk = normalizeNaturalLanguageText(chunk);
    if (!normalizedChunk) {
        return [];
    }

    const buildFilter = (
        annotationCandidate: string,
        value: string,
        type: FilterType = FilterType.DEFAULT
    ) => {
        const annotation = resolveAnnotation(
            annotationCandidate,
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        return annotation
            ? [new FileFilter(annotation.name, coerceAnnotationValue(annotation, value), type)]
            : [];
    };

    const buildRangeFilter = (
        annotationCandidate: string,
        operator: "since" | "after" | "before",
        value: string
    ) => {
        const annotation = resolveAnnotation(
            annotationCandidate,
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        if (!annotation) {
            return [];
        }

        const rangeValue = formatDateRangeValue(annotation, operator, value.trim());
        return rangeValue ? [new FileFilter(annotation.name, rangeValue)] : [];
    };

    const excludeLeading = normalizedChunk.match(/^(?:no value for|without|missing) (.+)$/);
    if (excludeLeading?.[1]) {
        const annotation = resolveAnnotation(
            excludeLeading[1],
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        return annotation ? [new FileFilter(annotation.name, "", FilterType.EXCLUDE)] : [];
    }

    const excludeTrailing = normalizedChunk.match(/^(.+) (?:is )?(?:empty|missing|null|no value)$/);
    if (excludeTrailing?.[1]) {
        const annotation = resolveAnnotation(
            excludeTrailing[1],
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        return annotation ? [new FileFilter(annotation.name, "", FilterType.EXCLUDE)] : [];
    }

    const includeLeading = normalizedChunk.match(/^(?:any value for|has) (.+)$/);
    if (includeLeading?.[1]) {
        const annotation = resolveAnnotation(
            includeLeading[1],
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        return annotation ? [new FileFilter(annotation.name, "", FilterType.ANY)] : [];
    }

    const includeTrailing = normalizedChunk.match(/^(.+) (?:has |is )?any value$/);
    if (includeTrailing?.[1]) {
        const annotation = resolveAnnotation(
            includeTrailing[1],
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNames
        );
        return annotation ? [new FileFilter(annotation.name, "", FilterType.ANY)] : [];
    }

    const fuzzyMatch = normalizedChunk.match(/^(.+) (?:contains|including|matches?) (.+)$/);
    if (fuzzyMatch?.[1] && fuzzyMatch?.[2]) {
        return buildFilter(fuzzyMatch[1], fuzzyMatch[2].trim(), FilterType.FUZZY);
    }

    const sinceMatch = normalizedChunk.match(/^(.+) (since|after|before) (\d{4}-\d{2}-\d{2})$/);
    if (sinceMatch?.[1] && sinceMatch?.[2] && sinceMatch?.[3]) {
        return buildRangeFilter(
            sinceMatch[1],
            sinceMatch[2] as "since" | "after" | "before",
            sinceMatch[3]
        );
    }

    const equalsMatch = normalizedChunk.match(/^(.+) (?:=|equals?|is|are) (.+)$/);
    if (equalsMatch?.[1] && equalsMatch?.[2]) {
        return buildFilter(equalsMatch[1], equalsMatch[2].trim());
    }

    const prefixMatches = annotationAliases
        .flatMap(({ annotation, aliases }) =>
            aliases
                .filter(
                    (alias) => normalizedChunk === alias || normalizedChunk.startsWith(`${alias} `)
                )
                .map((alias) => ({ annotation, alias }))
        )
        .sort((left, right) => right.alias.length - left.alias.length);

    if (prefixMatches.length) {
        const longestLength = prefixMatches[0].alias.length;
        const longestMatches = prefixMatches.filter(
            (match) => match.alias.length === longestLength
        );
        const remainder = normalizedChunk.slice(longestLength).trim();
        if (!remainder) {
            return [];
        }

        const startsWithAnotherAlias = annotationAliases.some(({ aliases }) =>
            aliases.some((alias) =>
                new RegExp(`^${escapeForRegex(alias)}(?:\\s|$)`).test(remainder)
            )
        );
        if (startsWithAnotherAlias) {
            return [];
        }

        const uniqueMatches = Array.from(
            new Map(
                longestMatches.map((match) => [match.annotation.name, match.annotation])
            ).values()
        );
        if (uniqueMatches.length > 1) {
            const phrase = normalizeNaturalLanguageText(prefixMatches[0].alias);
            if (!ambiguities.some((ambiguity) => ambiguity.phrase === phrase)) {
                ambiguities.push({
                    kind: "annotation",
                    phrase,
                    matches: uniqueMatches,
                });
            }
            return [];
        }

        return [
            new FileFilter(
                uniqueMatches[0].name,
                coerceAnnotationValue(uniqueMatches[0], remainder)
            ),
        ];
    }

    return [];
}

function buildSharedValueIndex(
    annotationValuesByName: Record<string, AnnotationValue[]>
): Map<string, SharedAnnotationValue[]> {
    const byValue = new Map<string, SharedAnnotationValue[]>();

    Object.entries(annotationValuesByName).forEach(([annotationName, values]) => {
        values.forEach((value) => {
            const normalizedValue = normalizeNaturalLanguageText(String(value));
            if (!normalizedValue) {
                return;
            }

            byValue.set(normalizedValue, [
                ...(byValue.get(normalizedValue) || []),
                { annotationName, value },
            ]);
        });
    });

    return byValue;
}

function inferFiltersFromSharedValues(
    query: string,
    annotationValuesByName: Record<string, AnnotationValue[]>,
    existingFilters: FileFilter[]
): FileFilter[] {
    const normalizedQuery = normalizeNaturalLanguageText(query);
    if (!normalizedQuery) {
        return [];
    }

    const existingKeys = new Set(
        existingFilters.map((filter) => `${filter.name}::${filter.value}`)
    );
    const inferredFilters: FileFilter[] = [];
    const valueIndex = buildSharedValueIndex(annotationValuesByName);
    const candidates = Array.from(valueIndex.entries()).sort(
        ([left], [right]) => right.length - left.length
    );

    candidates.forEach(([normalizedValue, matches]) => {
        if (matches.length !== 1) {
            return;
        }

        const [match] = matches;
        if (!new RegExp(`(^|\\s)${escapeForRegex(normalizedValue)}(\\s|$)`).test(normalizedQuery)) {
            return;
        }

        const key = `${match.annotationName}::${match.value}`;
        if (existingKeys.has(key)) {
            return;
        }

        inferredFilters.push(new FileFilter(match.annotationName, match.value));
        existingKeys.add(key);
    });

    return inferredFilters;
}

function canonicalizeFiltersFromSharedValues(
    filters: FileFilter[],
    annotationValuesByName: Record<string, AnnotationValue[]>
): FileFilter[] {
    return filters.map((filter) => {
        const knownValues = annotationValuesByName[filter.name] || [];
        const matchingValue = knownValues.find(
            (value) =>
                normalizeNaturalLanguageText(String(value)) ===
                normalizeNaturalLanguageText(String(filter.value))
        );

        return matchingValue === undefined
            ? filter
            : new FileFilter(filter.name, matchingValue, filter.type);
    });
}

export function parseNaturalLanguageQuery(
    query: string,
    {
        annotations,
        annotationValuesByName = {},
        availableAnnotationNames = [],
        resolvedAnnotationsByPhrase = {},
    }: ParserOptions
): ParsedNaturalLanguageQuery {
    const annotationAliases = createAnnotationAliases(annotations);
    const availableAnnotationNameSet = new Set(availableAnnotationNames);
    const ambiguities: AnnotationAmbiguity[] = [];
    const { hierarchy, touched: touchedHierarchy } = parseGroupClause(
        query,
        annotationAliases,
        ambiguities,
        resolvedAnnotationsByPhrase,
        availableAnnotationNameSet
    );
    const { sortColumn, touched: touchedSort } = parseSortClause(
        query,
        annotationAliases,
        ambiguities,
        resolvedAnnotationsByPhrase,
        availableAnnotationNameSet
    );

    const strippedQuery = stripRecognizedClauses(query);
    const chunks = strippedQuery
        .split(/\s*(?:,|\band\b)\s*/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => !!chunk && !CLAUSE_BOUNDARY_PATTERN.test(chunk));

    const explicitFilters = chunks.flatMap((chunk) =>
        parseConditionChunk(
            chunk,
            annotationAliases,
            ambiguities,
            resolvedAnnotationsByPhrase,
            availableAnnotationNameSet
        )
    );
    const inferredFilters = inferFiltersFromSharedValues(
        strippedQuery,
        annotationValuesByName,
        explicitFilters
    );
    const canonicalExplicitFilters = canonicalizeFiltersFromSharedValues(
        explicitFilters,
        annotationValuesByName
    );

    const filtersByKey = new Map<string, FileFilter>();
    [...canonicalExplicitFilters, ...inferredFilters].forEach((filter) => {
        filtersByKey.set(`${filter.name}::${filter.type}::${filter.value}`, filter);
    });

    return {
        ambiguities,
        filters: Array.from(filtersByKey.values()),
        hierarchy,
        sortColumn,
        touchedFilters: filtersByKey.size > 0,
        touchedHierarchy,
        touchedSort,
    };
}
