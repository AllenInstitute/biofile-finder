import { isNil, uniq } from "lodash";

import AnnotationService, { AnnotationDetails, AnnotationValue } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import Annotation from "../../../entity/Annotation";
import FileFilter from "../../../entity/FileFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import SQLBuilder from "../../../entity/SQLBuilder";

interface Config {
    databaseService: DatabaseService;
    dataSourceNames: string[];
}

interface SummarizeQueryResult {
    [key: string]: string;
    column_name: string;
    null_percentage: string;
}

/**
 * Service responsible for fetching annotation related metadata directly from a database
 */
export default class DatabaseAnnotationService implements AnnotationService {
    private readonly databaseService: DatabaseService;
    private readonly dataSourceNames: string[];

    constructor(
        config: Config = { dataSourceNames: [], databaseService: new DatabaseServiceNoop() }
    ) {
        this.dataSourceNames = config.dataSourceNames;
        this.databaseService = config.databaseService;
    }

    /**
     * Fetch all annotations.
     */
    public fetchAnnotations(): Promise<Annotation[]> {
        return this.databaseService.fetchAnnotations(this.dataSourceNames);
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
        // this may happen for types like "Open file link"
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

        const rows = await this.databaseService.query(sqlBuilder.toSQL());
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

        const sql = new SQLBuilder()
            .summarize()
            .from(this.dataSourceNames)
            .where(annotations.map((annotation) => `"${annotation}" IS NOT NULL`))
            .toSQL();
        const rows = (await this.databaseService.query(sql)) as SummarizeQueryResult[];
        const annotationSet = new Set(annotations);
        return rows
            .reduce((annotations, row) => {
                if (row["null_percentage"] !== "100.0%") {
                    annotations.push(row["column_name"]);
                }
                return annotations;
            }, [] as string[])
            .filter((annotation) => !annotationSet.has(annotation));
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
