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
        this.filterType = filterType;
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
