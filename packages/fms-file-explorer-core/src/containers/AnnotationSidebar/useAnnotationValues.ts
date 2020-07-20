import * as React from "react";

import AnnotationService, { AnnotationValue } from "../../services/AnnotationService";

/**
 * Custom React hook to accomplish requesting the unique values for annotations. This hook will request values for the given
 * annotation if nothing has been cached in the service. This hooks also exposes the loading and error states for this request.
 * While the network request is in flight the second element in the return array will be true.
 * If there was an error the third element will contain the message from the error.
 */
export default function useAnnotationValues(
    annotation: string,
    annotationService: AnnotationService
): [AnnotationValue[] | undefined, boolean, string | undefined] {
    const [annotationValues, setAnnotationValues] = React.useState<AnnotationValue[]>();
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState();

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setAnnotationValues (which triggers a re-render) if the
        // effect is re-run prior to a successful network response. This could be the case if a user selects another
        // annotation to filter on quickly
        let ignoreResponse = false;
        // if we already have the values or we encountered an error, we likely shouldn't continue
        // trying to constantly retrieve the values
        if (annotationValues || errorMessage) {
            // a previous request was cancelled
            if (isLoading) {
                setIsLoading(false);
            }
        } else {
            // cache miss, request values using AnnotationService
            setIsLoading(true);
            annotationService
                .fetchValues(annotation)
                .then((response: AnnotationValue[]) => {
                    if (!ignoreResponse) {
                        setAnnotationValues(response);
                    }
                })
                .catch((error) => setErrorMessage(error.message))
                .finally(() => {
                    if (!ignoreResponse) {
                        setIsLoading(false);
                    }
                });
        }

        return function cleanup() {
            ignoreResponse = true;
        };
    }, [annotation, annotationValues, isLoading, errorMessage]);

    React.useDebugValue(annotationValues); // display annotationValues in React DevTools when this hook is inspected
    return [annotationValues, isLoading, errorMessage];
}
