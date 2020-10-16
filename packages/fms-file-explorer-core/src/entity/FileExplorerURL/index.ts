import Annotation from "../Annotation";
import FileFilter, { FileFilterJson } from "../FileFilter";
import FileFolder from "../FileFolder";
import { AnnotationValue } from "../../services/AnnotationService";
import { find } from "lodash";
import { ValueError } from "../../errors";

export interface FileExplorerURLComponents {
    hierarchy: Annotation[];
    filters: FileFilter[];
    openFolders: FileFolder[];
}

interface FileExplorerUrlJson {
    groupBy: string[];
    filters: FileFilterJson[];
    openFolders: AnnotationValue[][];
}

export default class FileExplorerURL {
    public static PROTOCOL = "fms-file-explorer://";

    // Returns an error message if the URL is invalid, returns undefined otherwise
    public static validateEncodedFileExplorerURL(encodedURL: string, annotations: Annotation[]) {
        try {
            FileExplorerURL.decode(encodedURL, annotations);
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

        const dataToEncode: FileExplorerUrlJson = {
            groupBy,
            filters,
            openFolders,
        };
        return FileExplorerURL.PROTOCOL + JSON.stringify(dataToEncode); // TODO: Make compact
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

        const parsedURL: FileExplorerUrlJson = JSON.parse(
            trimmedEncodedURL.substring(FileExplorerURL.PROTOCOL.length)
        );
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
            filters: parsedURL.filters.map((filter) => {
                if (!annotationNameSet.has(filter.name)) {
                    throw new ValueError(
                        `Unable to decode FileExplorerURL, couldn't find Annotation(${filter.name})`
                    );
                }
                return new FileFilter(filter.name, filter.value);
            }),
            openFolders: parsedURL.openFolders.map((folder) => new FileFolder(folder)),
        };
    }

    // TODO: I am wondering if we even want to reject outright some cases... if the data is missing what do we do / how do we know
    public static decodeHierarchy(encodedHierarchy: string[], annotations: Annotation[]) {
        return encodedHierarchy.map((annotationName) => {
            const matchingAnnotation = find(
                annotations,
                (annotation) => annotation.name === annotationName
            );
            if (!matchingAnnotation) {
                throw new ValueError(
                    `Unable to decode FileExplorerURL, couldn't find Annotation(${annotationName})`
                );
            }
            return matchingAnnotation;
        });
    }
}
