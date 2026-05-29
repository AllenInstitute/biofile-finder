import * as React from "react";
import { useSelector } from "react-redux";

import Annotation from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileDetail from "../../../entity/FileDetail";
import { MetadataValue, NestedMetadataValue, PrimitiveMetadataValue } from "../../../services/FileService";
import { interaction } from "../../../state";

// TODO: Add unit tests

/**
 * Custom hook responsible for determining the appropriate text to display for a given metadata value in the file details pane.
 * This is responsible for handling any special cases for certain annotation keys where we want to display something other than the default text (e.g. file paths).
 * It also returns whether the text should be emphasized (e.g. italicized) to indicate important information to the user (e.g. that a file is currently being downloaded and its local path is not yet available).
 */
export default function useDisplayText(file: FileDetail, key: string, value: MetadataValue, annotation: Annotation | undefined, childRows: NestedMetadataValue[]): { text: string | null, emphasize: boolean } {
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);
    
    // The path to this file on the host this application is running on
    // may not match the path to this file stored in the database.
    // Determine this local path.
    const [localPath, setLocalPath] = React.useState<string | null>(null);
    React.useEffect(() => {
        if (key !== AnnotationName.LOCAL_FILE_PATH) return;

        let active = true;
        const pathAsIs = value[0] as string | undefined;
        if (!pathAsIs || typeof pathAsIs !== "string") return;
        executionEnvService.formatPathForHost(pathAsIs)
            .then((localPath) => {
                if (!active) return;
                setLocalPath(localPath);
            });

        return () => {
            active = false;
        };
    }, [key, value, executionEnvService]);

    return React.useMemo(() => {
        // Handle special cases for certain annotation keys (e.g., file paths)
        // where we want to display something other than the default text
        if (key === AnnotationName.LOCAL_FILE_PATH) {
            // Show a special message to indicate the path is
            // being prepared still
            if (!!file?.downloadInProgress) {
                return { text: "Copying to VAST in progress…", emphasize: true };
            }
            // localPath hasn't loaded yet or there is no local path annotation
            if (localPath === null) {
                return { text: null, emphasize: false };
            } 
            // Use the user's /allen mount point, if known
            return { text: localPath, emphasize: false };
        }

        // When rendering metadata fields that are arrays of objects, we want to show the number of entries in the array
        // rather than trying to join the objects into a string
        if (childRows.length > 0) {
            const numEntries = childRows.length;
            return { text: `${numEntries} ${numEntries === 1 ? "entry" : "entries"}`, emphasize: false };
        };

        // If for some reason we don't have the annotation handy (which would be an error case)
        // lets at least try to display the value in a reasonable way instead of crashing out
        if (!annotation) {
            console.error(`Unexpected scenario: No annotation found for metadata key: ${key}`);
            return { text: (value as PrimitiveMetadataValue[]).join(Annotation.SEPARATOR), emphasize: false };
        }

        return { text: annotation.joinValuesForDisplay(value as PrimitiveMetadataValue[]), emphasize: false };
    }, [file, key, value, annotation, childRows, localPath])
}
