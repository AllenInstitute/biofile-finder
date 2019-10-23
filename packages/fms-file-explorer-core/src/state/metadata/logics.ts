import { compact, find, map } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import Annotation from "../../entity/Annotation";

import { selectDisplayAnnotation } from "../selection/actions";
import { ReduxLogicDeps } from "../types";

import { receiveAnnotations, REQUEST_ANNOTATIONS } from "./actions";

/**
 * Interceptor responsible for turning REQUEST_ANNOTATIONS action into a network call for available annotations. Outputs
 * RECEIVE_ANNOTATIONS actions.
 */
const requestAnnotations = createLogic({
    process(deps: ReduxLogicDeps, dispatch: (action: AnyAction) => void, done: () => void) {
        // (GM 10/22/2019) Temporary until we have a query service.
        Promise.resolve(require("../../../assets/annotations.json"))
            .then((annotationsResponse) =>
                map(
                    annotationsResponse.data,
                    (annotationsResponse) => new Annotation(annotationsResponse)
                )
            )
            .then((annotations) => {
                const initialAnnotationsToDisplay = [
                    find(annotations, (annotation) => annotation.name === "file_name"),
                    find(annotations, (annotation) => annotation.name === "created"),
                    find(annotations, (annotation) => annotation.name === "created_by"),
                    find(annotations, (annotation) => annotation.name === "file_size"),
                ];

                dispatch(receiveAnnotations(annotations));
                dispatch(selectDisplayAnnotation(compact(initialAnnotationsToDisplay)));
            })
            .catch((err) =>
                console.error("Something went wrong, nobody knows why. But here's a hint:", err)
            )
            .finally(done);
    },
    type: REQUEST_ANNOTATIONS,
});

export default [requestAnnotations];
