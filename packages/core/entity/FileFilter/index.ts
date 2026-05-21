import SQLBuilder from "../SQLBuilder";
import { extractValuesFromRangeOperatorFilterString } from "../AnnotationFormatter/number-formatter";
import { extractDatesFromRangeOperatorFilterString } from "../AnnotationFormatter/date-time-formatter";
import annotationFormatterFactory, { AnnotationType } from "../AnnotationFormatter";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

// Matches the RANGE(min, max) filter encoding used by NumberRangePicker (numeric bounds)
const RANGE_OPERATOR_REGEX = /^RANGE\([\d\-.]+,\s?[\d\-.]+\)$/;
// Matches the RANGE(isoDate,isoDate) filter encoding used by DateRangePicker (ISO 8601 date strings)
const DATE_RANGE_OPERATOR_REGEX = /^RANGE\([\d\-+:TZ.]+,[\d\-+:TZ.]+\)$/;

// TODO: Does this effect decode/encode process?
export interface FileFilterJson {
    column: string;
    value: any;
    type?: FilterType;
}

// Filter with formatted value
export interface Filter {
    name: string;
    value: any;
    displayValue: string;
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
    private readonly annotationPath: string[];
    private readonly annotationValue: any;
    private filterType: FilterType;
    public readonly annotationType?: AnnotationType;

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(
        annotationPath: string[],
        annotationValue: any,
        filterType: FilterType = FilterType.DEFAULT,
        annotationType?: AnnotationType,
    ) {
        this.annotationPath = annotationPath;
        this.annotationValue = annotationValue;
        this.filterType = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : filterType;
        this.annotationType = annotationType;
    }

    public get path() {
        return this.annotationPath;
    }

    /**
     * The column name is the annotation path joined by dots.
     * For example, an annotationPath of ["foo", "bar"] would
     * result in a column name of "foo.bar".
     */
    public get column() {
        return this.annotationPath.join(".");
    }

    public get isNested() {
        return this.annotationPath.length > 1;
    }

    public get value() {
        return this.annotationValue;
    }

    public get type() {
        return this.filterType;
    }

    public set type(filterType: FilterType) {
        this.filterType = filterType;
    }

    public toQueryString(): string {
        // TODO: Unsure about this SQL
        switch (this.type) {
            case FilterType.ANY:
                return `include=${this.column}`;
            case FilterType.EXCLUDE:
                return `exclude=${this.column}`;
            case FilterType.FUZZY:
                if (this.value === "") return `fuzzy=${this.column}`;
                return `${this.column}=${this.annotationValue}&fuzzy=${this.column}`;
        }
        return `${this.column}=${this.annotationValue}`;
    }

    /** Unlike with FileSort, we shouldn't construct a new SQLBuilder since these will
     * be applied to a pre-existing SQLBuilder.
     * Instead, generate the string that can be passed into the .where() clause.
     */
    public toSQLWhereString(): string {
        // TODO: Idk about this SQL
        switch (this.type) {
            case FilterType.ANY:
                return `"${this.column}" IS NOT NULL`;
            case FilterType.EXCLUDE:
                return `"${this.column}" IS NULL`;
            case FilterType.FUZZY:
                return SQLBuilder.regexMatchValueInList(this.column, this.annotationValue);
            default:
                switch (this.annotationType) {
                    case AnnotationType.BOOLEAN:
                        return `"${this.column}" = ${this.annotationValue}`;
                    case AnnotationType.NUMBER:
                        if (RANGE_OPERATOR_REGEX.test(this.annotationValue)) {
                            const {
                                minValue,
                                maxValue,
                            } = extractValuesFromRangeOperatorFilterString(this.annotationValue);
                            return `CAST("${this.column}" AS DOUBLE) >= ${minValue} AND CAST("${this.column}" AS DOUBLE) < ${maxValue}`;
                        }
                        return `CAST("${this.column}" AS DOUBLE) = ${this.annotationValue}`;
                    case AnnotationType.DATE:
                    case AnnotationType.DATETIME:
                        if (DATE_RANGE_OPERATOR_REGEX.test(this.annotationValue)) {
                            const {
                                startDate,
                                endDate,
                            } = extractDatesFromRangeOperatorFilterString(this.annotationValue);
                            return `CAST("${
                                this.column
                            }" AS TIMESTAMPTZ) >= CAST('${startDate?.toISOString()}' AS TIMESTAMPTZ) AND CAST("${
                                this.column
                            }" AS TIMESTAMPTZ) < CAST('${endDate?.toISOString()}' AS TIMESTAMPTZ)`;
                        } else {
                            const dateFormatter = annotationFormatterFactory(this.annotationType);
                            const dateString = dateFormatter.displayValue(this.annotationValue);
                            return `CAST("${
                                this.column
                            }" AS TIMESTAMPTZ) =  CAST('${new Date(
                                dateString
                            ).toISOString()}' as TIMESTAMPTZ)`;
                        }
                    case AnnotationType.DURATION:
                        return `EXTRACT(epoch FROM "${
                            this.column
                        }")::BIGINT * 1000 = ${Number(this.annotationValue)}`;
                }
                return SQLBuilder.regexMatchValueInList(this.column, this.annotationValue);
        }
    }

    public toJSON(): FileFilterJson {
        return {
            column: this.column,
            value: this.annotationValue,
            type: this.filterType,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            this.column === target.column &&
            this.annotationValue === target.annotationValue &&
            this.filterType === target.filterType
        );
    }
}
