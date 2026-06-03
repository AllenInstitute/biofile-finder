import { isObject, uniq } from "lodash";
import * as React from "react";

import FileSelection from "../../../entity/FileSelection";
import { PrimitiveMetadataValue } from "../../../services/FileService";


/**
 * Custom hook for fetching the values of a particular annotation across all files in a FileSelection.
 * 
 * Returns `undefined` while loading.
 */
export default function useAnnotationValues(fileSelection: FileSelection, annotationName: string): PrimitiveMetadataValue[] | undefined {
    const [values, setValues] = React.useState<PrimitiveMetadataValue[]>();
    React.useEffect(() => {
        setValues(undefined);
        fileSelection
            .fetchAllDetails()
            .then((fileDetails) => {
                const allValues = fileDetails.reduce((acc, file) => {
                    const keyValues = file.getAnnotation(annotationName);
                    // If the annotation doesn't exist or isn't an array of primitive values, skip it.
                    // Otherwise, add all of its values to the list of values for this annotation.
                    if (!keyValues?.[0] || !isObject(keyValues[0])) return acc;
                    return [...acc, ...keyValues as PrimitiveMetadataValue[]];
                }, [] as PrimitiveMetadataValue[]);
                setValues(uniq(allValues));
            });
    }, [fileSelection, annotationName]);
    return values;
}
