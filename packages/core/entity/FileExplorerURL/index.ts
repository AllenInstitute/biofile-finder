import Annotation from "../Annotation";
import FileFilter, { FileFilterJson } from "../FileFilter";
import FileFolder from "../FileFolder";
import { AnnotationValue } from "../../services/AnnotationService";
import { ValueError } from "../../errors";
import FileSort, { SortOrder } from "../FileSort";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../constants";
import { Dataset } from "../../services/DatasetService";

// Components of the application state this captures
export interface FileExplorerURLComponents {
    hierarchy: Annotation[];
    fileSetSourceId?: string;
    filters: FileFilter[];
    openFolders: FileFolder[];
    sortColumn?: FileSort;
}

// JSON format this outputs & expects to receive back from the user
interface FileExplorerURLJson {
    groupBy: string[];
    fileSetSourceId?: string;
    filters: FileFilterJson[];
    openFolders: AnnotationValue[][];
    sort?: {
        annotationName: string;
        order: SortOrder;
    };
}

/**
 * This represents a system for encoding application state information in a way
 * that allows users to copy, share, and paste the result back into the app and have the
 * URL decoded & rehydrated back in.
 */
export default class FileExplorerURL {
    public static PROTOCOL = "fms-file-explorer://";

    // Returns an error message if the URL is invalid, returns undefined otherwise
    public static validateEncodedFileExplorerURL(
        encodedURL: string,
        annotations: Annotation[],
        datasets: Dataset[]
    ) {
        try {
            FileExplorerURL.decode(encodedURL, annotations, datasets);
            return undefined;
        } catch (error) {
            return error.message;
        }
    }

    /**
     * Encode this FileExplorerURL into a format easily transferable between users
     * that can be decoded back into the data used to create this FileExplorerURL.
     * Ideally the format this is in would be independent of the format/inner-workings
     * of our application state. As in, the names / system we track data in can change
     * without breaking an existing FileExplorerURL.
     * */
    public static encode(urlComponents: FileExplorerURLComponents) {
        const groupBy = urlComponents.hierarchy.map((annotation) => annotation.name);
        const filters = urlComponents.filters.map((filter) => filter.toJSON());
        const openFolders = urlComponents.openFolders.map((folder) => folder.fileFolder);
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
            fileSetSourceId: urlComponents.fileSetSourceId,
        };
        return `${FileExplorerURL.PROTOCOL}${JSON.stringify(dataToEncode)}`;
    }

    /**
     * Decode a previously encoded FileExplorerURL into components that can be rehydrated into the
     * application state
     */
    public static decode(
        encodedURL: string,
        annotations: Annotation[],
        datasets: Dataset[]
    ): FileExplorerURLComponents {
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
            if (!TOP_LEVEL_FILE_ANNOTATION_NAMES.includes(parsedURL.sort.annotationName)) {
                throw new ValueError(
                    `Unable to decode FileExplorerURL, sort column must be one of ${TOP_LEVEL_FILE_ANNOTATION_NAMES}`
                );
            }
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
            parsedURL.fileSetSourceId &&
            !datasets.find((dataset) => dataset.id === parsedURL.fileSetSourceId)
        ) {
            throw new ValueError(
                `Unable to decode FileExplorerURL, couldn't find File Set Source (${parsedURL.fileSetSourceId})`
            );
        }

        const hierarchyDepth = parsedURL.groupBy.length;
        const annotationNameSet = new Set([
            ...annotations.map((annotation) => annotation.name),
            ...TOP_LEVEL_FILE_ANNOTATION_NAMES,
        ]);
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
            fileSetSourceId: parsedURL.fileSetSourceId,
            filters: parsedURL.filters.map((filter) => {
                if (!annotationNameSet.has(filter.name)) {
                    throw new ValueError(
                        `Unable to decode FileExplorerURL, couldn't find Annotation(${filter.name})`
                    );
                }
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
