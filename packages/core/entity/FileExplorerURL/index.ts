import { AnnotationName } from "../Annotation";
import FileFilter from "../FileFilter";
import FileFolder from "../FileFolder";
import FileSort, { SortOrder } from "../FileSort";

export interface Source {
    name: string;
    type: "csv" | "json" | "parquet";
    uri?: string | File;
}

// Components of the application state this captures
export interface FileExplorerURLComponents {
    hierarchy: string[];
    source?: Source;
    filters: FileFilter[];
    openFolders: FileFolder[];
    sortColumn?: FileSort;
}

export const EMPTY_QUERY_COMPONENTS: FileExplorerURLComponents = {
    hierarchy: [],
    filters: [],
    openFolders: [],
};

const BEGINNING_OF_TODAY = new Date();
BEGINNING_OF_TODAY.setHours(0, 0, 0, 0);
const END_OF_TODAY = new Date();
END_OF_TODAY.setHours(23, 59, 59);
const DATE_LAST_YEAR = new Date(BEGINNING_OF_TODAY);
DATE_LAST_YEAR.setMonth(BEGINNING_OF_TODAY.getMonth() - 12);
const DATE_LAST_6_MONTHS = new Date(BEGINNING_OF_TODAY);
DATE_LAST_6_MONTHS.setMonth(BEGINNING_OF_TODAY.getMonth() - 6);
const DATE_LAST_MONTH = new Date(BEGINNING_OF_TODAY);
DATE_LAST_MONTH.setMonth(BEGINNING_OF_TODAY.getMonth() - 1);
const DATE_LAST_WEEK = new Date(BEGINNING_OF_TODAY);
DATE_LAST_WEEK.setDate(BEGINNING_OF_TODAY.getDate() - 7);
export const PAST_YEAR_FILTER = new FileFilter(
    AnnotationName.UPLOADED,
    `RANGE(${DATE_LAST_YEAR.toISOString()},${END_OF_TODAY.toISOString()})`
);
export const DEFAULT_AICS_FMS_QUERY = {
    hierarchy: [],
    openFolders: [],
    filters: [PAST_YEAR_FILTER],
    sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
};

/**
 * This represents a system for encoding application state information in a way
 * that allows users to copy, share, and paste the result back into the app and have the
 * URL decoded & rehydrated back in.
 */
export default class FileExplorerURL {
    /**
     * Encode this FileExplorerURL into a format easily transferable between users
     * that can be decoded back into the data used to create this FileExplorerURL.
     * Ideally the format this is in would be independent of the format/inner-workings
     * of our application state. As in, the names / system we track data in can change
     * without breaking an existing FileExplorerURL.
     * */
    public static encode(urlComponents: Partial<FileExplorerURLComponents>): string {
        const params = new URLSearchParams();

        urlComponents.hierarchy?.forEach((annotation) => {
            params.append("group", annotation);
        });
        urlComponents.filters?.forEach((filter) => {
            params.append("filter", JSON.stringify(filter.toJSON()));
        });
        urlComponents.openFolders?.map((folder) => {
            params.append("openFolder", JSON.stringify(folder.fileFolder));
        });
        if (urlComponents.sortColumn) {
            params.append("sort", JSON.stringify(urlComponents.sortColumn.toJSON()));
        }
        if (urlComponents.source) {
            params.append("source", JSON.stringify(urlComponents.source));
        }

        return params.toString();
    }

    /**
     * Decode a previously encoded FileExplorerURL into components that can be rehydrated into the
     * application state
     */
    public static decode(encodedURL: string): FileExplorerURLComponents {
        const params = new URLSearchParams(encodedURL);

        const unparsedOpenFolders = params.getAll("openFolder");
        const unparsedFilters = params.getAll("filter");
        const unparsedSource = params.get("source");
        const hierarchy = params.getAll("group");
        const unparsedSort = params.get("sort");
        const hierarchyDepth = hierarchy.length;

        const parsedSort = unparsedSort ? JSON.parse(unparsedSort) : undefined;
        return {
            hierarchy,
            sortColumn: parsedSort
                ? new FileSort(parsedSort.annotationName, parsedSort.order)
                : undefined,
            filters: unparsedFilters
                .map((unparsedFilter) => JSON.parse(unparsedFilter))
                .map((parsedFilter) => new FileFilter(parsedFilter.name, parsedFilter.value)),
            source: unparsedSource ? JSON.parse(unparsedSource) : undefined,
            openFolders: unparsedOpenFolders
                .map((unparsedFolder) => JSON.parse(unparsedFolder))
                .filter((parsedFolder) => parsedFolder.length <= hierarchyDepth)
                .map((parsedFolder) => new FileFolder(parsedFolder)),
        };
    }
}
