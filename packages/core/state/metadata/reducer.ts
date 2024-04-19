import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { Dataset } from "../../services/DatasetService";

import { RECEIVE_ANNOTATIONS, RECEIVE_COLLECTIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
    collections: Dataset[];
}

export const initialState = {
    annotations: [],
    collections: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
        [RECEIVE_COLLECTIONS]: (state, action) => ({
            ...state,
            collections: action.payload,
        }),
    },
    initialState
);
