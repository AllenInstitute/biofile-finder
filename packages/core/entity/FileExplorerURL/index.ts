import { isObject } from "lodash";

import Annotation, { AnnotationName } from "../Annotation";
import FileFilter, { FileFilterJson } from "../FileFilter";
import FileFolder from "../FileFolder";
import { AnnotationValue } from "../../services/AnnotationService";
import { ValueError } from "../../errors";
import FileSort, { SortOrder } from "../FileSort";

interface Collection {
    name: string;
    version?: number;
    uri?: string;
}

// Components of the application state this captures
export interface FileExplorerURLComponents {
    hierarchy: Annotation[];
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
        const groupBy = urlComponents.hierarchy?.map((annotation) => annotation.name) || [];
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
    public static decode(encodedURL: string, annotations: Annotation[]): FileExplorerURLComponents {
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
        const annotationNameSet = new Set(annotations.map((annotation) => annotation.name));
        return {
            hierarchy: parsedURL.groupBy.map((annotationName) => {
                if (!annotationNameSet.has(annotationName)) {
                    throw new ValueError(
                        `Unable to decode FileExplorerURL, couldn't find Annotation(${annotationName})`
                    );
                }
                const matchingAnnotation = annotations.filter((a) => a.name === annotationName)[0];
                return matchingAnnotation;
            }),
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
}
