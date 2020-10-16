import { AnnotationValue } from "../../services/AnnotationService";

// Interface for map necessary to re-order annotations.
// Maps the new index of an annotation to its old index.
export interface AnnotationIndexMap {
    [newIndex: number]: number;
}

/**
 * Entity representing a folder in the folder tree. Contains the path to a folder along with
 * methods to handle changes to the folder from the annotation hierarchy.
 */
export default class FileFolder {
    // Path to the file folder this represents. Each value in the array is the value for
    // the annotation at that index.
    private readonly fileFolderPath: AnnotationValue[];

    constructor(fileFolderPath: AnnotationValue[]) {
        this.fileFolderPath = fileFolderPath;
    }

    public get fileFolder() {
        return this.fileFolderPath;
    }

    public isEmpty() {
        return this.fileFolderPath.length === 0;
    }

    /**
     * This returns true if the open file folder given is the same
     * as this open file folder.
     */
    public equals(otherFileFolder: any) {
        if (
            !(otherFileFolder instanceof FileFolder) ||
            this.fileFolderPath.length !== otherFileFolder.fileFolder.length
        ) {
            return false;
        }
        return this.fileFolderPath.every(
            (value, index) => value === otherFileFolder.fileFolder[index]
        );
    }

    /**
     * File folders may contain paths to other file folders. If the given folder
     * is contained within this file folder return true;
     *
     * Ex. "AICS-0" -> "false" means that "AICS-0" must be open so therefore it contains the
     *     sub-path "AICS-0"
     */
    public includesSubFileFolder(otherFileFolder: FileFolder) {
        if (this.fileFolderPath.length < otherFileFolder.fileFolder.length) {
            return false;
        }
        return otherFileFolder.fileFolder.every(
            (value, index) => value === this.fileFolderPath[index]
        );
    }

    /**
     * If an annotation was added to the hierarchy everything that is open above
     * the level where the annotation was added should be able to remain open.
     *
     * Returns empty FileFolder if the annotation is added to the top of the hierarchy
     */

    public addAnnotationAtIndex(modifiedIndex: number): FileFolder {
        return new FileFolder(this.fileFolderPath.filter((_, index) => index < modifiedIndex));
    }

    /**
     * If an annotation was removed from the hierarchy everything that is open
     * should be able to remain open.
     *
     * Returns empty FileFolder if the annotation removed is at the top of the hierarchy
     * and this folder only has values for that annotation
     */

    public removeAnnotationAtIndex(modifiedIndex: number): FileFolder {
        return new FileFolder(this.fileFolderPath.filter((_, index) => index !== modifiedIndex));
    }

    //

    /**
     * If the annotation ordering has change then we can re-map the values in the file folder
     * paths, closing any that fall under now closed paths. To ensure that we keep as many
     * folders open as possible some file folders have to be split into many file folders
     * containing their sub-paths.
     */

    public reorderAnnotations(annotationIndexMap: AnnotationIndexMap): FileFolder[] {
        let index = 0;
        let folderIsClosed = false;
        const newFileFolderPath: AnnotationValue[] = [];
        // While the folder still has sections open and values remaining to pick from
        // build up the new file folder path by rearranging the indexes
        while (!folderIsClosed && index < this.fileFolderPath.length) {
            // Get the original index for the current index
            const originalIndex = annotationIndexMap[index];
            if (originalIndex < this.fileFolderPath.length) {
                // Push the value into the array at its new index effectively swapping it
                newFileFolderPath.push(this.fileFolderPath[originalIndex]);
                index += 1;
            } else {
                // If the current file folder path does not have a value for this index
                // consider the rest of the folder closed
                folderIsClosed = true;
            }
        }

        // Add each sub-folder path in the new folder path as its own folder
        // Ex. "CellLine" & "Balls?" are swapped in hierarchy
        //     Current open file folders: ["AICS-40.false", "AICS-40"]
        //     "AICS-40" -> would be filtered out as we can determine what to do with it anymore
        //     "AICS-40.false" -> "false.AICS-40" & "false" are both created
        return newFileFolderPath.map((_, i) => new FileFolder(newFileFolderPath.slice(0, i + 1)));
    }
}
