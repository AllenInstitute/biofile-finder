import { makeReducer } from "@aics/redux-utils";

import {
    RECEIVE_ANNOTATIONS,
    RECEIVE_DATA_SOURCES,
    RECEIVE_DATASET_MANIFEST,
    RECEIVE_PASSWORD_MAPPING,
} from "./actions";

import Annotation from "../../entity/Annotation";
import { DataSource } from "../../services/DataSourceService";

export interface MetadataStateBranch {
    annotations: Annotation[];
    dataSources: DataSource[];
    datasetManifestSource?: DataSource;
    passwordToProgramMap?: Record<string, string>;
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
        [RECEIVE_PASSWORD_MAPPING]: (state, action) => ({
            ...state,
            passwordToProgramMap: action.payload,
        }),
    },
    initialState
);
