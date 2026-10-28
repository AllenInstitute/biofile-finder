import {
    RECEIVE_ANNOTATIONS,
    RECEIVE_DATA_SOURCES,
    RECEIVE_DATASET_MANIFEST,
    RECEIVE_EDGE_DEFINITIONS,
    RECEIVE_PASSWORD_MAPPING,
    ReceiveEdgeDefinitions,
    REQUEST_ANNOTATIONS,
    SET_IS_LOADING_ANNOTATIONS,
    SetIsLoadingAnnotations,
} from "./actions";
import { CHANGE_DATA_SOURCES, CHANGE_QUERY } from "../selection/actions";
import Annotation from "../../entity/Annotation";
import { EdgeDefinition } from "../../entity/Graph";
import { DataSource } from "../../services/DataSourceService";
import { makeReducer } from "../../util/redux-utils";

export interface MetadataStateBranch {
    annotations: Annotation[];
    dataSources: DataSource[];
    isLoadingAnnotations: boolean;
    datasetManifestSource?: DataSource;
    edgeDefinitions: EdgeDefinition[];
    passwordToProgramMap?: Record<string, string>;
}

export const initialState = {
    annotations: [],
    dataSources: [],
    isLoadingAnnotations: false,
    datasetManifestSource: undefined,
    edgeDefinitions: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
        [REQUEST_ANNOTATIONS]: (state) => ({
            ...state,
            isLoadingAnnotations: true,
        }),
        [SET_IS_LOADING_ANNOTATIONS]: (state, action: SetIsLoadingAnnotations) => ({
            ...state,
            isLoadingAnnotations: action.payload.isLoading,
        }),
        [CHANGE_DATA_SOURCES]: (state) => ({
            ...state,
            annotations: [],
            isLoadingAnnotations: true,
        }),
        [CHANGE_QUERY]: (state, action) => ({
            ...state,
            isLoadingAnnotations: !!action.payload,
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
