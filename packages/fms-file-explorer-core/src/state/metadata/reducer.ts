import { unionBy } from "lodash";
import { AnyAction } from "redux";

import Annotation from "../../entity/Annotation";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    ReceiveAnnotationAction,
    RECEIVE_ANNOTATIONS,
    RECEIVE_ANNOTATION_VALUES,
    ReceiveAnnotationValuesAction,
} from "./actions";

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

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_ANNOTATIONS]: {
        accepts: (action: AnyAction): action is ReceiveAnnotationAction =>
            action.type === RECEIVE_ANNOTATIONS,
        perform: (
            state: MetadataStateBranch,
            action: ReceiveAnnotationAction
        ): MetadataStateBranch => ({
            ...state,
            annotations: unionBy(
                state.annotations,
                action.payload,
                (annotation) => annotation.name
            ),
        }),
    },
    [RECEIVE_ANNOTATION_VALUES]: {
        accepts: (action: AnyAction): action is ReceiveAnnotationValuesAction =>
            action.type === RECEIVE_ANNOTATION_VALUES,
        perform: (
            state: MetadataStateBranch,
            action: ReceiveAnnotationValuesAction
        ): MetadataStateBranch => {
            return {
                ...state,
                annotationNameToValuesMap: {
                    ...state.annotationNameToValuesMap,
                    [action.payload.name]: action.payload.values,
                },
            };
        },
    },
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
