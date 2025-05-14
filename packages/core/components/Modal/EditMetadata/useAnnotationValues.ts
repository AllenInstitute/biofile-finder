import * as React from "react";

import FileSelection from "../../../entity/FileSelection";

export default function useAnnotationValues(fileSelection: FileSelection, annotationName: string) {
    const [values, setValues] = React.useState<(string | boolean | number)[]>();
    React.useEffect(() => {
        setValues(undefined);
        fileSelection.fetchAllDetails().then((fileDetails) => {
            const values = fileDetails.reduce((acc, file) => {
                const annotation = file.getAnnotation(annotationName);
                if (!annotation) return acc;
                return [...acc, ...annotation.values];
            }, [] as (string | boolean | number)[]);
            setValues(Array.from(new Set(values)));
        });
    }, [fileSelection, annotationName]);
    return values;
}
