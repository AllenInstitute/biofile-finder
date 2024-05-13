import { isObject } from "lodash";

import { AnnotationName } from "../Annotation";
import FileFilter, { FileFilterJson } from "../FileFilter";
import FileFolder from "../FileFolder";
import { AnnotationValue } from "../../services/AnnotationService";
import { ValueError } from "../../errors";
import FileSort, { SortOrder } from "../FileSort";

export interface Collection {
    name: string;
    version?: number;
    uri?: string;
}

// Components of the application state this captures
export interface FileExplorerURLComponents {
    hierarchy: string[];
    collection?: Collection;
    filters: FileFilter[];
    openFolders: FileFolder[];
    sortColumn?: FileSort;
}

// JSON format this outputs & expects to receive back from the user
interface FileExplorerURLJson {
    groupBy: string[];
    collection?: Collection;
    filters: FileFilterJson[];
    openFolders: AnnotationValue[][];
    sort?: {
        annotationName: string;
        order: SortOrder;
    };
}

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
const DEFAULT_FMS_URL_COMPONENTS = {
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
    public static readonly PROTOCOL = "fms-file-explorer://";
    public static readonly DEFAULT_FMS_URL = FileExplorerURL.encode(DEFAULT_FMS_URL_COMPONENTS);

    /**
     * Encode this FileExplorerURL into a format easily transferable between users
     * that can be decoded back into the data used to create this FileExplorerURL.
     * Ideally the format this is in would be independent of the format/inner-workings
     * of our application state. As in, the names / system we track data in can change
     * without breaking an existing FileExplorerURL.
     * */
    public static encode(urlComponents: Partial<FileExplorerURLComponents>) {
        const groupBy = urlComponents.hierarchy?.map((annotation) => annotation) || [];
        const filters = urlComponents.filters?.map((filter) => filter.toJSON()) || [];
        const openFolders = urlComponents.openFolders?.map((folder) => folder.fileFolder) || [];
        const sort = urlComponents.sortColumn
            ? {
                  annotationName: urlComponents.sortColumn.annotationName,
                  order: urlComponents.sortColumn.order,
              }
            : undefined;

        const dataToEncode: FileExplorerURLJson = {
            groupBy,
            filters,
            openFolders,
            sort,
            collection: urlComponents.collection
                ? {
                      name: urlComponents.collection.name,
                      version: urlComponents.collection.version,
                      uri: urlComponents.collection.uri,
                  }
                : undefined,
        };
        return `${FileExplorerURL.PROTOCOL}${JSON.stringify(dataToEncode)}`;
    }

    /**
     * Decode a previously encoded FileExplorerURL into components that can be rehydrated into the
     * application state
     */
    public static decode(encodedURL: string): FileExplorerURLComponents {
        const trimmedEncodedURL = encodedURL.trim();
        if (!trimmedEncodedURL.startsWith(FileExplorerURL.PROTOCOL)) {
            throw new ValueError(
                "This does not look like an FMS File Explorer URL, invalid protocol."
            );
        }

        const parsedURL: FileExplorerURLJson = JSON.parse(
            trimmedEncodedURL.substring(FileExplorerURL.PROTOCOL.length)
        );

        let sortColumn = undefined;
        if (parsedURL.sort) {
            if (!Object.values(SortOrder).includes(parsedURL.sort.order)) {
                throw new Error(
                    `Unable to decode FileExplorerURL, sort order must be one of ${Object.values(
                        SortOrder
                    )}`
                );
            }
            sortColumn = new FileSort(parsedURL.sort.annotationName, parsedURL.sort.order);
        }

        if (
            parsedURL.collection &&
            (!isObject(parsedURL.collection) ||
                !parsedURL.collection.name ||
                !parsedURL.collection.version)
        ) {
            throw new ValueError(
                `Unable to decode FileExplorerURL, unexpected format (${parsedURL.collection})`
            );
        }

        const hierarchyDepth = parsedURL.groupBy.length;
        return {
            hierarchy: parsedURL.groupBy,
            collection: parsedURL.collection,
            filters: parsedURL.filters.map((filter) => {
                return new FileFilter(filter.name, filter.value);
            }),
            openFolders: parsedURL.openFolders.map((folder) => {
                if (folder.length > hierarchyDepth) {
                    throw new Error(
                        "Unable to decode FileExplorerURL, opened folder depth is greater than hierarchy depth"
                    );
                }
                return new FileFolder(folder);
            }),
            sortColumn,
        };
    }

    public static convertToPython(urlComponents: Partial<FileExplorerURLComponents>) {
        const collectionString = this.convertCollectionToPython(urlComponents?.collection);

        const groupByQueryString =
            urlComponents.hierarchy
                ?.map((annotation) => this.convertGroupByToPython(annotation))
                .join("") || "";

        // Group filters by name and use OR to concatenate same filter values
        const filterGroups = new Map();
        urlComponents.filters?.forEach((filter) => {
            const pythonQueryString = filterGroups.get(filter.name);
            if (!pythonQueryString) {
                filterGroups.set(filter.name, this.convertFilterToPython(filter));
            } else {
                filterGroups.set(
                    filter.name,
                    pythonQueryString.concat(` | ${this.convertFilterToPython(filter)}`)
                );
            }
        });

        // Chain the filters together
        let filterQueryString = "";
        filterGroups.forEach((value) => {
            filterQueryString = filterQueryString.concat(`.query('${value}')`);
        });

        const sortQueryString = urlComponents.sortColumn
            ? this.convertSortToPython(urlComponents.sortColumn)
            : "";
        // const fuzzy = [] // TO DO: support fuzzy filtering

        const hasQueryElements = groupByQueryString || filterQueryString || sortQueryString;
        const imports = "import pandas\n";
        const comment = hasQueryElements ? "#Query on dataframe df" : "#No options selected";
        const fullQueryString = `${comment}${
            hasQueryElements && `\ndf${groupByQueryString}${filterQueryString}${sortQueryString}`
        }`;
        return `${imports}${collectionString}${fullQueryString}`;
    }

    private static convertSortToPython(sortColumn: FileSort) {
        return `.sort_values(by='${sortColumn.annotationName}', ascending=${
            sortColumn.order == "ASC" ? "True" : "False"
        })`;
    }

    private static convertGroupByToPython(annotation: string) {
        return `.groupby('${annotation}', group_keys=True).apply(lambda x: x)`;
    }

    private static convertFilterToPython(filter: FileFilter) {
        // TO DO: Support querying non-string types
        if (filter.value.includes("RANGE")) {
            return;
            //     let begin, end;
            //     return `\`${filter.name}\`>="${begin}"&\`${filter.name}\`<"${end}"`
        }
        return `\`${filter.name}\`=="${filter.value}"`;
    }

    private static convertCollectionToPython(collection: Collection | undefined) {
        if (collection?.uri) {
            const comment = "#Convert current datasource file to a pandas dataframe";
            const extension = collection.uri.substring(collection.uri.lastIndexOf(".") + 1);
            // Currently suggest setting all fields to strings; otherwise pandas assumes type conversions
            // TO DO: Address different non-string type conversions
            const code = `df = pandas.read_${extension}('${collection.uri}').astype('str')`;
            // This only works if we assume that the file types will only be csv, parquet or json
            return `${comment}\n${code}\n\n`;
        }
        return "";
    }
}
