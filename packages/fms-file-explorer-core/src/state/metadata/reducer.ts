import { unionBy } from "lodash";
import { AnyAction } from "redux";

import Annotation from "../../entity/Annotation";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { ReceiveAnnotationAction, RECEIVE_ANNOTATIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
}

export const initialState = {
    annotations: [],
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
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
