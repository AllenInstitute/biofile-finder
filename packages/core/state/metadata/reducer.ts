import { makeReducer } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { EdgeDefinition } from "../../entity/Graph";
import { DataSource } from "../../services/DataSourceService";

import {
    RECEIVE_ANNOTATIONS,
    RECEIVE_DATA_SOURCES,
    RECEIVE_DATASET_MANIFEST,
    RECEIVE_EDGE_DEFINITIONS,
    RECEIVE_PASSWORD_MAPPING,
    ReceiveEdgeDefinitions,
} from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
    dataSources: DataSource[];
    datasetManifestSource?: DataSource;
    edgeDefinitions: EdgeDefinition[];
    passwordToProgramMap?: Record<string, string>;
}

export const initialState = {
    annotations: [],
    dataSources: [],
    datasetManifestSource: undefined,
    edgeDefinitions: [],
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
        [RECEIVE_EDGE_DEFINITIONS]: (state, action: ReceiveEdgeDefinitions) => ({
            ...state,
            edgeDefinitions: action.payload,
        }),
        [RECEIVE_PASSWORD_MAPPING]: (state, action) => ({
            ...state,
            passwordToProgramMap: action.payload,
        }),
    },
    initialState
);
