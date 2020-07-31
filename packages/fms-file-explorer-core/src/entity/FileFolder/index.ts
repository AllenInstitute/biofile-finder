// Interface for map necessary to re-order annotations
export interface AnnotationIndexMap {
    [oldIndex: number]: number;
}

/**
 * Entity representing a folder in the folder tree. Contains the path to a folder along with
 * methods to handle changes to the folder from the annotation hierarchy.
 */
export default class FileFolder {
    private readonly fileFolderPath: string[];

    constructor(fileFolderPath: string[]) {
        this.fileFolderPath = fileFolderPath;
    }

    public get fileFolder() {
        return this.fileFolderPath;
    }

    /**
     * This returns true if the open file folder given is the same
     * as this open file folder.
     */
    public equals(otherFileFolder: FileFolder) {
        if (this.fileFolderPath.length !== otherFileFolder.fileFolder.length) {
            return false;
        }
        return this.fileFolderPath.some(
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
        return !otherFileFolder.fileFolder.some(
            (value, index) => value !== this.fileFolderPath[index]
        );
    }

    /**
     * If an annotation was added to the hierarchy everything that is open above
     * the level where the annotation was added should be able to remain open
     */

    public addAnnotationAtIndex(modifiedIndex: number): FileFolder | undefined {
        const newFileFolderValues = this.fileFolderPath.filter((_, index) => index < modifiedIndex);
        if (!newFileFolderValues.length) {
            return undefined;
        }
        return new FileFolder(newFileFolderValues);
    }

    /**
     * If an annotation was removed from the hierarchy everything that is open
     * should be able to remain open
     */

    public removeAnnotationAtIndex(modifiedIndex: number): FileFolder | undefined {
        const newFileFolderValues = this.fileFolderPath.filter(
            (_, index) => index !== modifiedIndex
        );
        if (!newFileFolderValues.length) {
            return undefined;
        }
        return new FileFolder(newFileFolderValues);
    }

    //

    /**
     * If the annotation ordering has change then we can re-map the values in the file folder
     * paths, closing any that fall under now closed paths. To ensure that we keep as many
     * folders open as possible some file folders have to be split into many file folders
     * containing their sub-paths.
     */

    public moveAnnotationToIndex(annotationIndexMap: AnnotationIndexMap): FileFolder[] {
        // Initialize array with empty slots to easily swap indexes
        let newFileFolderValues = [...new Array(this.fileFolderPath.length)];

        // Swap indexes of values based on new annotation hierarchy
        this.fileFolderPath.forEach((value, index) => {
            newFileFolderValues[annotationIndexMap[index]] = value;
        });

        // Cut off the file folder path at the first index with a undefined element
        const undefinedIndex = newFileFolderValues.findIndex((f) => f === undefined);
        if (undefinedIndex !== -1) {
            newFileFolderValues = newFileFolderValues.slice(0, undefinedIndex);
        }

        // Add each sub-folder tree in the new folder tree as its own folder
        // Ex. "CellLine" & "Balls?" are swapped in hierarchy
        //     Current open file folders: ["AICS-40.false", "AICS-40"]
        //     "AICS-40" -> would be filtered out as we can determine what to do with it anymore
        //     "AICS-40.false" -> "false.AICS-40" & "false" are both created
        const openFileFolders: FileFolder[] = [];
        for (let i = 0; i < newFileFolderValues.length; i++) {
            const subFileFolderValues = newFileFolderValues.slice(0, i + 1);
            openFileFolders.push(new FileFolder(subFileFolderValues));
        }
        return openFileFolders;
    }
}
