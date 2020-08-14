import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";

import { RECEIVE_ANNOTATIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
}

export const initialState = {
    annotations: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
    },
    initialState
);
