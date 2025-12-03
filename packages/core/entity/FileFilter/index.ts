import SQLBuilder from "../SQLBuilder";
import { NO_VALUE_NODE } from "../../components/DirectoryTree/directory-hierarchy-state";

export interface FileFilterJson {
    name: string;
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
    private readonly annotationName: string;
    private readonly annotationValue: any;
    private filterType: FilterType;

    public static isFileFilter(candidate: any): candidate is FileFilter {
        return candidate instanceof FileFilter;
    }

    constructor(
        annotationName: string,
        annotationValue: any,
        filterType: FilterType = FilterType.DEFAULT
    ) {
        this.annotationName = annotationName;
        this.annotationValue = annotationValue;
        this.filterType = annotationValue === NO_VALUE_NODE ? FilterType.EXCLUDE : filterType;
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
                return `"${this.annotationName}" = '${this.annotationValue}'`
        }
    }

    public toJSON(): FileFilterJson {
        return {
            name: this.annotationName,
            value: this.annotationValue,
            type: this.filterType,
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
