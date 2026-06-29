import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails } from "..";
import DatabaseService, { CancellablePromise } from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation, { AnnotationValue } from "../../../entity/Annotation";
import FileFilter, { FilterType } from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { DEFAULT_COLUMN_WIDTH, MINIMUM_COLUMN_WIDTH, Source } from "../../../entity/SearchParams";
import { hasArrayBeforeLeaf } from "../../../entity/resolvePathIsArray";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
    metadataSource?: Source;
}

/**
 * Service responsible for fetching annotation related metadata directly from a database
 */
export default class DatabaseAnnotationService implements AnnotationService {
    private readonly databaseService: DatabaseService;
    private readonly dataSourceNames: string[];
    private readonly metadataSource: Source | undefined;
    // Get sample character width for computing column widths based on content length.
    // This is a bit hacky but it's nontrivial to get character width without rendering text
    // into the DOM, and we need it to compute column widths before rendering.
    // Grab this one at import to avoid having to re-measure it every time we want
    // to compute optimal column widths for annotations
    private readonly sampleCharWidthInPx = DatabaseAnnotationService.measureTextWidth(
        "S",
        "16px Open Sans"
    );

    /**
     * Measures the width in pixels of the given text rendered with the specified
     * CSS font shorthand (e.g. "14px Arial", "bold 12px sans-serif").
     */
    private static measureTextWidth(text: string, font: string): number {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            return 1; // Fallback width if canvas context can't be created
        }
        context.font = font;
        return context.measureText(text).width;
    }

    constructor(
        config: Config = { dataSourceNames: [], databaseService: new DatabaseServiceNoop() }
    ) {
        this.dataSourceNames = config.dataSourceNames;
        this.databaseService = config.databaseService;
        this.metadataSource = config.metadataSource;
    }

    /**
     * Fetch all annotations.
     */
    public fetchAnnotations(): Promise<Annotation[]> {
        return this.databaseService.fetchAnnotations(this.dataSourceNames, this.metadataSource);
    }

    /**
     * Fetch details about annotations like their type and dropdown options
     * this isn't necessarily something we need to do for database annotations
     * so this might just be cruft we can remove with adjustments to the AICS FMS
     * data flow by having types be passed as is in the annotation response (big lift in FES)
     */
    public async fetchAnnotationDetails(name: string): Promise<AnnotationDetails> {
        const annotationNameToTypeMap = await this.databaseService.fetchAnnotationTypes();
        const type = annotationNameToTypeMap[name];
        // If the annotation type is not recognized, default to string
        if (!Object.values(AnnotationType).includes(type) || type === AnnotationType.LOOKUP) {
            return { type: AnnotationType.STRING };
        }
        if (type === AnnotationType.DROPDOWN) {
            const dropdownOptions = await this.fetchValues(name);
            return { type, dropdownOptions: dropdownOptions as string[] };
        }
        return { type };
    }

    /**
     * Fetch the unique values for a specific annotation.
     */
    public async fetchValues(annotation: string): Promise<AnnotationValue[]> {
        return this.fetchFilteredValuesForAnnotation(annotation);
    }

    public async fetchRootHierarchyValues(
        hierarchy: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        return this.fetchHierarchyValuesUnderPath(hierarchy, [], filters);
    }

    public async fetchHierarchyValuesUnderPath(
        hierarchy: string[],
        path: string[],
        filters: FileFilter[]
    ): Promise<string[]> {
        if (hierarchy.length <= 0) {
            throw new Error("Hierarchy must contain at least one annotation to fetch values for.");
        }

        const nameToAnnotationMap = await this.fetchNameToAnnotationMap();
        const annotationNamesInFilters = new Set(filters.map((f) => f.name));
        const hierarchyAsFilters = hierarchy
            // Map hierarchy annotations to filters
            .map((annotation, index) =>
                index < path.length
                    ? new FileFilter(
                          annotation,
                          path[index],
                          FilterType.DEFAULT,
                          nameToAnnotationMap.get(annotation)?.type
                      )
                    : new IncludeFilter(annotation)
            )
            // Exclude any filters that already exist for these hierarchy annotations
            .filter((filter) => !annotationNamesInFilters.has(filter.name));

        return this.fetchFilteredValuesForAnnotation(hierarchy[path.length], [
            ...filters,
            ...hierarchyAsFilters,
        ]);
    }

    // Given a particular annotation in the hierarchy list, apply filters to the files in that category
    private async fetchFilteredValuesForAnnotation(
        annotation: string,
        filters: FileFilter[] = []
    ): Promise<string[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        // Look up annotation metadata to determine if this is a nested sub-field.
        const nameToAnnotationMap = await this.fetchNameToAnnotationMap();
        const annotationMeta = nameToAnnotationMap.get(annotation);
        if (!annotationMeta) {
            console.error("Annotation metadata not found for annotation:", annotation);
            return [];
        }

        // Get expression for accessing the (potentially) nested annotation value
        const accessExpr = SQLBuilder.buildNestedAccessExpression(
            annotationMeta.path,
            annotationMeta.pathIsArray
        );
        // If the (potentially) nested column is an array, unnest it to get individual values.
        // Otherwise, use built-in DISTINCT
        const selectExpr = annotationMeta.hasNestedArray
            ? `unnest(${accessExpr}) AS "${annotation}"`
            : `DISTINCT ${accessExpr} AS "${annotation}"`;

        const sqlBuilder = new SQLBuilder()
            .select(selectExpr)
            .from(this.dataSourceNames)
            .where(
                FileFilter.toListOfWhereClauses(
                    filters,
                    Annotation.pathIsArrayByName([...nameToAnnotationMap.values()])
                )
            );

        const rows = await this.databaseService.query(sqlBuilder.toSQL()).promise;
        const rowsSplitByDelimiter = rows
            .flatMap((row) => {
                if (isNil(row[annotation])) return [];
                // For array columns (e.g. VARCHAR[]), DuckDB returns JS arrays after
                // the JSON round-trip. Flatten them so each element is treated individually.
                if (Array.isArray(row[annotation])) {
                    return row[annotation].map((v: unknown) => String(v));
                }
                return String(row[annotation]).split(DatabaseService.LIST_DELIMITER);
            })
            .map((value) => value.trim());
        return uniq(rowsSplitByDelimiter);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(
        annotations: string[]
    ): Promise<string[] | null> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        // Arbitrary number, though some DuckDB docs suggest that many small concurrent queries is not
        // ideal, so we batch them to avoid overwhelming the database with too many concurrent queries.
        const MAX_CONCURRENT_QUERIES = 25;
        const TOTAL_TIMEOUT_MS = 30_000; // 30 seconds

        // Look up annotation metadata for nested sub-field handling.
        const nameToAnnotationMap = await this.fetchNameToAnnotationMap();

        // Build proper IS NOT NULL expressions for the current hierarchy annotations:
        // For nested sub-fields, use len(list_transform(...)) > 0 instead of "name" IS NOT NULL
        const hierarchyNotNullExprs = annotations.map((annotation) => {
            const meta = nameToAnnotationMap.get(annotation);
            if (!meta) {
                console.error("Annotation metadata not found for annotation:", annotation);
                return `"${annotation}" IS NOT NULL`;
            }
            const accessExpr = SQLBuilder.buildNestedAccessExpression(meta.path, meta.pathIsArray);
            return meta?.hasNestedArray ? `len(${accessExpr}) > 0` : `${accessExpr} IS NOT NULL`;
        });

        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const annotationsToCheck = Array.from(nameToAnnotationMap.values());
        const compatibleAnnotations: string[] = [];
        const inFlightQueries = new Set<CancellablePromise<{ [key: string]: any }[]>>();
        let timedOut = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const timedQueryPromise = new Promise<null>((resolve) => {
            timeoutId = setTimeout(() => {
                timedOut = true;
                for (const query of inFlightQueries) {
                    query.cancel?.("Timed out while fetching available annotations for hierarchy");
                }
                console.log("Timed out while fetching available annotations for hierarchy");
                resolve(null);
            }, TOTAL_TIMEOUT_MS);
        });

        const batchedQueriesPromise = (async () => {
            for (let i = 0; i < annotationsToCheck.length; i += MAX_CONCURRENT_QUERIES) {
                if (timedOut) return null;

                const batch = annotationsToCheck.slice(i, i + MAX_CONCURRENT_QUERIES);
                const batchResults = await Promise.all(
                    batch.map(async (annotation) => {
                        const columnAccessExpr = SQLBuilder.buildNestedAccessExpression(
                            annotation.path,
                            annotation.pathIsArray
                        );
                        const sql = new SQLBuilder()
                            .select("1")
                            .from(aggregateDataSourceName)
                            .where(
                                annotation.hasNestedArray
                                    ? `len(${columnAccessExpr}) > 0`
                                    : `${columnAccessExpr} IS NOT NULL`
                            )
                            .where(hierarchyNotNullExprs)
                            // This limit is non-deterministic, but we just want to know if
                            // any rows are non-null for this column, and a
                            // non-deterministic query will be faster.
                            .limit(1)
                            .toSQL();

                        const query = this.databaseService.query(sql);
                        inFlightQueries.add(query);
                        try {
                            const result = await query.promise;
                            return result.length === 0 ? null : annotation.name;
                        } finally {
                            inFlightQueries.delete(query);
                        }
                    })
                );

                compatibleAnnotations.push(
                    ...batchResults.filter((result): result is string => result !== null)
                );
            }

            return compatibleAnnotations;
        })();

        try {
            return await Promise.race([batchedQueriesPromise, timedQueryPromise]);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Fetch the optimal width in pixels for a set of annotations based on the length of their longest value
     * and the annotation name, to help compute column widths in the UI.
     */
    public async fetchOptimalWidthForAnnotations(
        annotations: Annotation[],
        ignoreWidthLimit = false
    ): Promise<Map<string, number>> {
        // Try to fetch values for new annotations to compute optimal column widths
        const widthByAnnotation: Map<string, number> = new Map();
        try {
            const annotationNameToLength = await this.fetchLengthiestValues(annotations);
            for (const [name, length] of annotationNameToLength.entries()) {
                // Grab whichever is longer, the longest value or the header
                // to compute the column width needed to fit this column without truncation
                const maxLengthOfColumn = Math.max(length, name.length);
                // Convert this length to a pixel width using our sample character width
                // + some extra pixels for padding
                const maxLengthOfColumnInPx =
                    Math.ceil(maxLengthOfColumn * this.sampleCharWidthInPx) + 8;
                // Avoid letting width get too large for extremely long values by capping it
                const minOptimalWidth = ignoreWidthLimit
                    ? maxLengthOfColumnInPx
                    : Math.min(maxLengthOfColumnInPx, DEFAULT_COLUMN_WIDTH * 3);
                // Avoid letting width get too small by setting a minimum width
                // like in the case of canvas measurement failing
                const width = Math.max(minOptimalWidth, MINIMUM_COLUMN_WIDTH);
                widthByAnnotation.set(name, width);
            }
        } catch {
            // If fetching values fails entirely, fall through to default widths
        }
        for (const annotation of [...annotations, ...TOP_LEVEL_FILE_ANNOTATIONS]) {
            if (!widthByAnnotation.has(annotation.name)) {
                widthByAnnotation.set(annotation.name, DEFAULT_COLUMN_WIDTH);
            }
        }
        return widthByAnnotation;
    }

    /**
     * Fetch the length of the longest value for each annotation, which can be used to compute optimal column widths in the UI.
     * This is a bit of a hack, but it allows us to avoid fetching all values for an annotation just to compute column widths.
     */
    private async fetchLengthiestValues(annotations: Annotation[]): Promise<Map<string, number>> {
        if (!this.dataSourceNames.length || annotations.length === 0) {
            return new Map();
        }

        // Sub-field annotations (e.g. "Well.Column"): use list_max over the
        // extracted element list rather than casting the whole column.
        // Flat annotations: (e.g. "Color"): uses a direct CAST
        const selectExprs = annotations.map((annotation) => {
            const escapedName = annotation.name.replaceAll("'", "''");
            if (hasArrayBeforeLeaf(annotation.pathIsArray)) {
                const listExpr = SQLBuilder.buildNestedAccessExpression(
                    annotation.path,
                    annotation.pathIsArray,
                    (leaf) => `LENGTH(CAST(${leaf} AS VARCHAR))`
                );
                return `MAX(list_max(${listExpr})) AS "${escapedName}"`;
            }

            const accessExpr = SQLBuilder.buildNestedAccessExpression(
                annotation.path,
                annotation.pathIsArray
            );
            return `MAX(LENGTH(CAST(${accessExpr} AS VARCHAR))) AS "${escapedName}"`;
        });

        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const sql = new SQLBuilder()
            .select(selectExprs.join(", "))
            .from(aggregateDataSourceName)
            .toSQL();
        let results = await this.queryWithTimeout<{ [annotation: string]: number }>(sql);

        // Try smaller set for a "good-enough" estimate
        if (!results) {
            const sampleSetSql = `SELECT ${selectExprs.join(
                ", "
            )} FROM (SELECT * FROM "${aggregateDataSourceName}" LIMIT 5000)`;
            results = await this.queryWithTimeout<{ [annotation: string]: number }>(sampleSetSql);
            // Fall-back to empty map if still timing out
            if (!results) return new Map();
        }

        const annotationToLength: Map<string, number> = new Map();
        for (const row of results) {
            for (const [annotation, length] of Object.entries(row)) {
                annotationToLength.set(annotation, length);
            }
        }
        return annotationToLength;
    }

    /**
     * Validate annotation values according the type the annotation they belong to.
     */
    public validateAnnotationValues(_name: string, _values: AnnotationValue[]): Promise<boolean> {
        // At the moment we don't have any constraints we need to adhere to for edits to annotation values
        // eventually we may want to add some validation to make sure dates are in the correct format, etc.
        return Promise.resolve(true);
    }

    public createAnnotation(annotation: Annotation): Promise<void> {
        const tableName = this.dataSourceNames.sort().join(DatabaseService.LIST_DELIMITER);
        return this.databaseService.addNewColumn(
            tableName,
            annotation.name,
            annotation.description
        );
    }

    // Query with a timeout, cancelling the query and returning undefined
    // if the query fails to complete within the specified time limit
    private queryWithTimeout<T>(sql: string, timeoutMs = 1000): Promise<T[] | undefined> {
        const query = this.databaseService.query<T>(sql);
        const timeoutPromise = new Promise<undefined>((resolve) =>
            setTimeout(() => {
                query.cancel?.();
                // Failed to fetch within time
                resolve(undefined);
            }, timeoutMs)
        );
        return Promise.race([query.promise, timeoutPromise]);
    }

    private async fetchNameToAnnotationMap(): Promise<Map<string, Annotation>> {
        const annotations = await this.fetchAnnotations();
        return new Map(annotations.map((a) => [a.name, a]));
    }
}
