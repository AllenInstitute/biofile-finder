import { makeReducer } from "@aics/redux-utils";
import { unionBy } from "lodash";

import Annotation from "../../entity/Annotation";

import { RECEIVE_ANNOTATIONS, RECEIVE_ANNOTATION_VALUES } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
    annotationNameToValuesMap: {
        [key: string]: (string | number | boolean)[];
    };
}

export const initialState = {
    annotations: [],
    annotationNameToValuesMap: {},
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: unionBy(
                state.annotations,
                action.payload,
                (annotation) => annotation.name
            ),
        }),
        [RECEIVE_ANNOTATION_VALUES]: (state, action) => ({
            ...state,
            annotationNameToValuesMap: {
                ...state.annotationNameToValuesMap,
                [action.payload.name]: action.payload.values,
            },
        }),
    },
    initialState
);
