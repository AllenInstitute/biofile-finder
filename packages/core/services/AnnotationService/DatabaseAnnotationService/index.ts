import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import DatabaseService, { DatabaseQuery } from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import { DEFAULT_COLUMN_WIDTH, MINIMUM_COLUMN_WIDTH, Source } from "../../../entity/SearchParams";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
    metadataSource?: Source;
}

interface QueryResult {
    column_name: string;
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
            return 0;
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
        const type = annotationNameToTypeMap[name] as AnnotationType;
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
        const filtersByAnnotation = filters.reduce(
            (map, filter) => ({
                ...map,
                [filter.name]: map[filter.name] ? [...map[filter.name], filter] : [filter],
            }),
            {} as { [name: string]: FileFilter[] }
        );

        hierarchy
            // Map before filter because index is important to map to the path
            .forEach((annotation, index) => {
                if (!filtersByAnnotation[annotation]) {
                    filtersByAnnotation[annotation] = [
                        index < path.length
                            ? new FileFilter(annotation, path[index])
                            : new IncludeFilter(annotation), // If no value provided in hierachy, equivalent to Include filter
                    ];
                }
            });

        return this.fetchFilteredValuesForAnnotation(hierarchy[path.length], filtersByAnnotation);
    }

    // Given a particular annotation in the hierarchy list, apply filters to the files in that category
    private async fetchFilteredValuesForAnnotation(
        annotation: string,
        filtersByAnnotation: {
            [name: string]: FileFilter[];
        } = {}
    ): Promise<string[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        const sqlBuilder = new SQLBuilder()
            .select(`DISTINCT "${annotation}"`)
            .from(this.dataSourceNames);

        Object.keys(filtersByAnnotation).forEach((annotationToFilter) => {
            const appliedFilters = filtersByAnnotation[annotationToFilter];
            sqlBuilder.where(
                appliedFilters.map((filter) => filter.toSQLWhereString()).join(" OR ")
            );
        });

        const rows = await this.databaseService.query(sqlBuilder.toSQL()).promise;
        const rowsSplitByDelimiter = rows
            .flatMap((row) =>
                isNil(row[annotation])
                    ? []
                    : `${row[annotation]}`.split(DatabaseService.LIST_DELIMITER)
            )
            .map((value) => value.trim());
        return uniq(rowsSplitByDelimiter);
    }

    /**
     * Fetchs annotations that can be combined with current hierarchy while still producing a non-empty
     * file set
     */
    public async fetchAvailableAnnotationsForHierarchy(annotations: string[]): Promise<string[]> {
        if (!this.dataSourceNames.length) {
            return [];
        }

        // Subquery 1
        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const columnNamesSql = new SQLBuilder().from(aggregateDataSourceName).limit(1).toSQL();
        const queryResult = await this.databaseService.query(columnNamesSql).promise;
        const columnNames = Object.keys(queryResult[0]);

        const queries = columnNames.map((columnName) => {
            const sql = new SQLBuilder()
                .select(`'${columnName}' AS column_name`)
                .from(aggregateDataSourceName)
                .where(`"${columnName}" IS NOT NULL`)
                .where(annotations.map((annotation) => `"${annotation}" IS NOT NULL`))
                // This limit is non-deterministic, but we just want to know if
                // any rows are non-null for this column, and a
                // non-deterministic query will be faster.
                .limit(1)
                .toSQL();
            return this.databaseService.query(sql).promise;
        });
        const results = (await Promise.all(queries)) as QueryResult[][];
        return results.filter((result) => result.length > 0).map((result) => result[0].column_name);
    }

    /**
     * Fetch the length of the longest value for each annotation, which can be used to compute optimal column widths in the UI.
     * This is a bit of a hack, but it allows us to avoid fetching all values for an annotation just to compute column widths.
     */
    public async fetchOptimalWidthForAnnotations(
        annotationNames: string[],
        ignoreWidthLimit = false
    ): Promise<Record<string, number>> {
        // Try to fetch values for new annotations to compute optimal column widths
        const widthByAnnotation: Record<string, number> = {};
        try {
            const fetchQuery = this.fetchLengthiestValues(annotationNames);
            // Set a timeout on this query in case it takes too long to return,
            // since it could potentially be slow for annotations with very long values
            // which is fine and we will just cancel it and fall back to default column widths in that case
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => {
                    fetchQuery.cancel?.();
                    reject(new Error("Timeout fetching annotation values"));
                }, 1000)
            );
            const annotationToLength = await Promise.race([fetchQuery.promise, timeoutPromise]);
            for (const [annotation, length] of Object.entries(annotationToLength)) {
                // Grab whichever is longer, the longest value or the header
                // to compute the column width needed to fit this column without truncation
                const maxLengthOfColumn = Math.max(length, annotation.length);
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
                widthByAnnotation[annotation] = width;
            }
        } catch {
            // If fetching values fails entirely, fall through to default widths
        }
        for (const annotationName of annotationNames) {
            if (!widthByAnnotation.hasOwnProperty(annotationName)) {
                widthByAnnotation[annotationName] = DEFAULT_COLUMN_WIDTH;
            }
        }
        for (const annotation of TOP_LEVEL_FILE_ANNOTATIONS) {
            if (!widthByAnnotation.hasOwnProperty(annotation.name)) {
                widthByAnnotation[annotation.name] = DEFAULT_COLUMN_WIDTH;
            }
        }
        return widthByAnnotation;
    }

    /**
     * Fetch the length of the longest value for each annotation, which can be used to compute optimal column widths in the UI.
     * This is a bit of a hack, but it allows us to avoid fetching all values for an annotation just to compute column widths.
     */
    private fetchLengthiestValues(
        annotationNames: string[]
    ): DatabaseQuery<{ [annotation: string]: number }> {
        if (!this.dataSourceNames.length || annotationNames.length === 0) {
            return { promise: Promise.resolve({}) };
        }

        const aggregateDataSourceName = this.dataSourceNames.sort().join(", ");
        const sql = new SQLBuilder()
            .select(
                annotationNames
                    .map(
                        (annotation) =>
                            `MAX(LENGTH(CAST("${annotation}" AS VARCHAR))) AS "${annotation}"`
                    )
                    .join(", ")
            )
            .from(aggregateDataSourceName)
            .toSQL();

        const query = this.databaseService.query<{ [annotation: string]: number }[]>(sql);
        return {
            promise: query.promise.then((results): { [annotation: string]: number } => {
                const annotationToLength: { [annotation: string]: number } = {};
                for (const row of results) {
                    for (const [annotation, length] of Object.entries(row)) {
                        annotationToLength[annotation] = length;
                    }
                }
                return annotationToLength;
            }),
            cancel: query.cancel,
        };
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
}
