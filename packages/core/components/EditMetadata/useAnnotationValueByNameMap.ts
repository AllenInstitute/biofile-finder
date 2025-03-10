import * as React from "react";

import useFilteredSelection from "../../hooks/useFilteredSelection";

/**
 * Hook for fetching all annotation values from the selected files
 * and grouping them by annotation name.
 */
export default function useAnnotationValueByNameMap() {
    const fileSelection = useFilteredSelection();
    const [annotationValueMap, setAnnotationValueMap] = React.useState<
        Map<string, Record<string, number>>
    >();

    React.useEffect(() => {
        fileSelection.fetchAllDetails().then((fileDetails) => {
            const annotationMapping = new Map();
            // Group details by annotation with a count for each value
            fileDetails.forEach((file) => {
                file.annotations.map((annotation) => {
                    // For now, if a file has multiple values for an annotation it should be considered a distinct set
                    const joinedValues = annotation.values.join(", ");
                    if (!annotationMapping.has(annotation.name)) {
                        annotationMapping.set(annotation.name, { [joinedValues]: 1 });
                    } else {
                        const existing = annotationMapping.get(annotation.name);
                        annotationMapping.set(annotation.name, {
                            ...existing,
                            [joinedValues]: existing?.[joinedValues]
                                ? existing[joinedValues] + 1
                                : 1,
                        });
                    }
                });
            });
            setAnnotationValueMap(annotationMapping);
        });
    }, [fileSelection]);

    return annotationValueMap;
}
