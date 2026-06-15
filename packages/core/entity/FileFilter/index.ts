import { isEqual } from "lodash";

import SQLBuilder from "../SQLBuilder";
import { extractValuesFromRangeOperatorFilterString } from "../AnnotationFormatter/number-formatter";
import { extractDatesFromRangeOperatorFilterString } from "../AnnotationFormatter/date-time-formatter";
import annotationFormatterFactory, { AnnotationType } from "../AnnotationFormatter";
import defaultPathIsArray from "../pathIsArray";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

// Matches the RANGE(min, max) filter encoding used by NumberRangePicker (numeric bounds)
const RANGE_OPERATOR_REGEX = /^RANGE\([\d\-.]+,\s?[\d\-.]+\)$/;
// Matches the RANGE(isoDate,isoDate) filter encoding used by DateRangePicker (ISO 8601 date strings)
const DATE_RANGE_OPERATOR_REGEX = /^RANGE\([\d\-+:TZ.]+,[\d\-+:TZ.]+\)$/;

export interface FileFilterJson {
    path: string[];
    // TODO: Narrow this type to PrimitiveMetadataValue
    value: any;
    type?: FilterType;
}

// These also correspond to query param names
export enum FilterType {
    ANY = "include",
    EXCLUDE = "exclude",
    FUZZY = "fuzzy",
    DEFAULT = "default",
}

/**
 * Stub for a filter used to constrain a listing of files to those that match a particular condition. Should be
 * serializable to a URL query string-friendly format.
 */
export default class FileFilter {
    public readonly path: string[];
    public readonly value: any;
    public type: FilterType;
    public readonly valueType?: AnnotationType;
    /**
     * Which non-leaf path segments are arrays (STRUCT[]). Length = path.length - 1.
     * Defaults to [true, false, ...] (root is array, rest are scalar structs).
     */
    public readonly pathIsArray: boolean[];

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(
        path: string[],
        // TODO: Follow-up: narrow this type to PrimitiveMetadataValue
        annotationValue: any,
        type: FilterType = FilterType.DEFAULT,
        valueType?: AnnotationType,
        pathIsArray?: boolean[]
    ) {
        this.path = path;
        if (this.path.length > 1) {
            throw new Error(
                `Nested annotation filters are not yet supported (path: ${this.path.join(".")})`
            );
        }
        this.value = annotationValue;
        this.type = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : type;
        this.valueType = valueType;
        // See defaultPathIsArray: schema-derived flags (Annotation.pathIsArray) are authoritative;
        // this default is only a fallback for paths lacking schema metadata.
        this.pathIsArray = pathIsArray ?? defaultPathIsArray(this.path);
    }

    // TODO: Remove or replace when we stop using dot notation
    public get name(): string {
        return this.path.join(".");
    }

    public toQueryString(): string {
        // Use the dotted name (not the JSON path array): this string is sent to the FES HTTP
        // API and used in FileSet cache keys, both of which expect `annotation=value` form.
        // URL-sharing serialization uses toJSON()/path instead.
        const name = this.name;
        switch (this.type) {
            case FilterType.ANY:
                return `include=${name}`;
            case FilterType.EXCLUDE:
                return `exclude=${name}`;
            case FilterType.FUZZY:
                if (this.value === "") return `fuzzy=${name}`;
                return `${name}=${this.value}&fuzzy=${name}`;
        }
        return `${name}=${this.value}`;
    }

    /** Unlike with FileSort, we shouldn't construct a new SQLBuilder since these will
     * be applied to a pre-existing SQLBuilder.
     * Instead, generate the string that can be passed into the .where() clause.
     */
    public toSQLWhereString(): string {
        const columnName = this.path[0];
        switch (this.type) {
            case FilterType.ANY:
                return `"${columnName}" IS NOT NULL`;
            case FilterType.EXCLUDE:
                return `"${columnName}" IS NULL`;
            case FilterType.FUZZY:
                return SQLBuilder.regexMatchValueInList(columnName, this.value);
            default:
                switch (this.valueType) {
                    case AnnotationType.BOOLEAN:
                        return `"${columnName}" = ${this.value}`;
                    case AnnotationType.NUMBER:
                        if (RANGE_OPERATOR_REGEX.test(this.value)) {
                            const {
                                minValue,
                                maxValue,
                            } = extractValuesFromRangeOperatorFilterString(this.value);
                            return `CAST("${columnName}" AS DOUBLE) >= ${minValue} AND CAST("${columnName}" AS DOUBLE) < ${maxValue}`;
                        }
                        return `CAST("${columnName}" AS DOUBLE) = ${this.value}`;
                    case AnnotationType.DATE:
                    case AnnotationType.DATETIME:
                        if (DATE_RANGE_OPERATOR_REGEX.test(this.value)) {
                            const {
                                startDate,
                                endDate,
                            } = extractDatesFromRangeOperatorFilterString(this.value);
                            return `CAST("${columnName}" AS TIMESTAMPTZ) >= CAST('${startDate?.toISOString()}' AS TIMESTAMPTZ) AND CAST("${columnName}" AS TIMESTAMPTZ) < CAST('${endDate?.toISOString()}' AS TIMESTAMPTZ)`;
                        } else {
                            const dateFormatter = annotationFormatterFactory(
                                this.valueType as AnnotationType
                            );
                            const dateString = dateFormatter.displayValue(this.value);
                            return `CAST("${columnName}" AS TIMESTAMPTZ) =  CAST('${new Date(dateString).toISOString()}' as TIMESTAMPTZ)`;
                        }
                    case AnnotationType.DURATION:
                        return `EXTRACT(epoch FROM "${columnName}")::BIGINT * 1000 = ${Number(this.value)}`;
                }
                return SQLBuilder.regexMatchValueInList(columnName, this.value);
        }
    }

    public toJSON(): FileFilterJson {
        return {
            path: this.path,
            value: this.value,
            type: this.type,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            isEqual(this.path, target.path) &&
            this.value === target.value &&
            this.type === target.type
        );
    }
}
