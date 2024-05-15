import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { DataSource } from "../../services/DataSourceService";

import { RECEIVE_ANNOTATIONS, RECEIVE_DATA_SOURCES } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
    dataSources: DataSource[];
}

export const initialState = {
    annotations: [],
    dataSources: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
        [RECEIVE_DATA_SOURCES]: (state, action) => ({
            ...state,
            dataSources: action.payload,
        }),
    },
    initialState
);
