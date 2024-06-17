import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { DataSource } from "../../services/DataSourceService";

import { RECEIVE_ANNOTATIONS, RECEIVE_DATA_SOURCES, RECEIVE_DATASET_MANIFEST } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
    dataSources: DataSource[];
    datasetManifestSource?: DataSource;
}

export const initialState = {
    annotations: [],
    dataSources: [],
    datasetManifestSource: undefined,
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
        [RECEIVE_DATASET_MANIFEST]: (state, action) => ({
            ...state,
            datasetManifestSource: action.payload,
        }),
    },
    initialState
);
