import Annotation from "../Annotation";
import FileFilter, { FileFilterJson } from "../FileFilter";
import FileFolder from "../FileFolder";
import { AnnotationValue } from "../../services/AnnotationService";
import { find } from "lodash";
import { ValueError } from "../../errors";

interface FileExplorerURLComponents {
    hierarchy: Annotation[];
    filters: FileFilter[];
    openFolders: FileFolder[];
}

interface FileExplorerUrlJson {
    hierarchy: string[];
    filters: FileFilterJson[];
    openFolders: AnnotationValue[][];
}

export default class FileExplorerURL {
    // Returns true if the given string can be decoded into a valid FileExplorerURL
    public static validateEncodedFileExplorerURL(encodedURL: string) {
        try {
            FileExplorerURL.decode(encodedURL);
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
        const hierarchy = urlComponents.hierarchy.map((annotation) => annotation.name);
        const filters = urlComponents.filters.map((filter) => filter.toJSON());
        const openFolders = urlComponents.openFolders.map((folder) => folder.fileFolder);

        const dataToEncode: FileExplorerUrlJson = {
            hierarchy,
            filters,
            openFolders,
        };
        return JSON.stringify(dataToEncode); //  `Hierarchy(${hierarchyDisplay}), Filters(${filtersDisplay}), OpenFolders(${openFolderDisplay})`;
    }

    /**
     * Decode a previously encoded FileExplorerURL into components that can be rehydrated into the
     * application state
     */
    public static decode(
        encodedURL: string,
        annotations?: Annotation[]
    ): FileExplorerURLComponents {
        const parsedURL: FileExplorerUrlJson = JSON.parse(encodedURL);

        return {
            hierarchy: parsedURL.hierarchy.map((annotationName) => {
                const matchingAnnotation = find(
                    annotations,
                    (annotation) => annotation.name === annotationName
                );
                if (!matchingAnnotation) {
                    // throw new ValueError(`Unable to decode FileExplorerURL, couldn't find Annotation(${annotationName})`);
                }
                return (matchingAnnotation as unknown) as Annotation;
            }),
            filters: parsedURL.filters.map(FileFilter.fromJSON),
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
