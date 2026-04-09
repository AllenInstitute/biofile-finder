import SQLBuilder from "../SQLBuilder";
import { extractValuesFromRangeOperatorFilterString } from "../AnnotationFormatter/number-formatter";
import { extractDatesFromRangeOperatorFilterString } from "../AnnotationFormatter/date-time-formatter";
import annotationFormatterFactory, { AnnotationType } from "../AnnotationFormatter";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

// Matches the RANGE(min, max) filter encoding used by NumberRangePicker (numeric bounds)
const RANGE_OPERATOR_REGEX = /^RANGE\([\d\-.]+,\s?[\d\-.]+\)$/;
// Matches the RANGE(isoDate,isoDate) filter encoding used by DateRangePicker (ISO 8601 date strings)
const DATE_RANGE_OPERATOR_REGEX = /^RANGE\([\d\-+:TZ.]+,[\d\-+:TZ.]+\)$/;

export interface FileFilterJson {
    name: string;
    value: any;
    type?: FilterType;
    annotationType?: AnnotationType;
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
    private readonly annotationName: string;
    private readonly annotationValue: any;
    private filterType: FilterType;
    public readonly annotationType?: AnnotationType;

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(
        annotationName: string,
        annotationValue: any,
        filterType: FilterType = FilterType.DEFAULT,
        annotationType?: AnnotationType
    ) {
        this.annotationName = annotationName;
        this.annotationValue = annotationValue;
        this.filterType = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : filterType;
        this.annotationType = annotationType;
    }

    public get name() {
        return this.annotationName;
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
        switch (this.type) {
            case FilterType.ANY:
                return `include=${this.annotationName}`;
            case FilterType.EXCLUDE:
                return `exclude=${this.annotationName}`;
            case FilterType.FUZZY:
                if (this.value === "") return `fuzzy=${this.annotationName}`;
                return `${this.annotationName}=${this.annotationValue}&fuzzy=${this.annotationName}`;
        }
        return `${this.annotationName}=${this.annotationValue}`;
    }

    /** Unlike with FileSort, we shouldn't construct a new SQLBuilder since these will
     * be applied to a pre-existing SQLBuilder.
     * Instead, generate the string that can be passed into the .where() clause.
     */
    public toSQLWhereString(): string {
        switch (this.type) {
            case FilterType.ANY:
                return `"${this.annotationName}" IS NOT NULL`;
            case FilterType.EXCLUDE:
                return `"${this.annotationName}" IS NULL`;
            case FilterType.FUZZY:
                return SQLBuilder.regexMatchValueInList(this.annotationName, this.annotationValue);
            default:
                switch (this.annotationType) {
                    case AnnotationType.BOOLEAN:
                        return `"${this.annotationName}" = ${this.annotationValue}`;
                    case AnnotationType.NUMBER:
                        if (RANGE_OPERATOR_REGEX.test(this.annotationValue)) {
                            const {
                                minValue,
                                maxValue,
                            } = extractValuesFromRangeOperatorFilterString(this.annotationValue);
                            return `CAST("${this.annotationName}" AS DOUBLE) >= ${minValue} AND CAST("${this.annotationName}" AS DOUBLE) < ${maxValue}`;
                        }
                        return `CAST("${this.annotationName}" AS DOUBLE) = ${this.annotationValue}`;
                    case AnnotationType.DATE:
                    case AnnotationType.DATETIME:
                        if (DATE_RANGE_OPERATOR_REGEX.test(this.annotationValue)) {
                            const {
                                startDate,
                                endDate,
                            } = extractDatesFromRangeOperatorFilterString(this.annotationValue);
                            return `CAST("${
                                this.annotationName
                            }" AS TIMESTAMPTZ) >= CAST('${startDate?.toISOString()}' AS TIMESTAMPTZ) AND CAST("${
                                this.annotationName
                            }" AS TIMESTAMPTZ) < CAST('${endDate?.toISOString()}' AS TIMESTAMPTZ)`;
                        } else {
                            const dateFormatter = annotationFormatterFactory(this.annotationType);
                            const dateString = dateFormatter.displayValue(this.annotationValue);
                            return `CAST("${
                                this.annotationName
                            }" AS TIMESTAMPTZ) =  CAST('${new Date(
                                dateString
                            ).toISOString()}' as TIMESTAMPTZ)`;
                        }
                    case AnnotationType.DURATION:
                        return `EXTRACT(epoch FROM "${
                            this.annotationName
                        }")::BIGINT * 1000 = ${Number(this.annotationValue)}`;
                }
                return SQLBuilder.regexMatchValueInList(this.annotationName, this.annotationValue);
        }
    }

    public toJSON(): FileFilterJson {
        return {
            name: this.annotationName,
            value: this.annotationValue,
            type: this.filterType,
            annotationType: this.annotationType,
        };
    }

    public equals(target: FileFilter): boolean {
        return (
            this.annotationName === target.annotationName &&
            this.annotationValue === target.annotationValue &&
            this.filterType === target.filterType
        );
    }
}
