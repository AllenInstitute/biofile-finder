import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { Source } from "../../entity/FileExplorerURL";

const STATE_BRANCH_NAME = "metadata";

/**
 * RECEIVE_ANNOTATIONS
 *
 * Intention to store listing of available annotations returned from data service. These are the attributes on FmsFiles
 * that are available for grouping, filtering, and sorting.
 */
export const RECEIVE_ANNOTATIONS = makeConstant(STATE_BRANCH_NAME, "receive-annotations");

export interface ReceiveAnnotationAction {
    payload: Annotation[];
    type: string;
}

export function receiveAnnotations(payload: Annotation[]): ReceiveAnnotationAction {
    return {
        payload,
        type: RECEIVE_ANNOTATIONS,
    };
}

/**
 * REQUEST_ANNOTATIONS
 *
 * Intention to request listing of available annotations that are available for grouping, filtering, and sorting files.
 */
export const REQUEST_ANNOTATIONS = makeConstant(STATE_BRANCH_NAME, "request-annotations");

export interface RequestAnnotationAction {
    type: string;
}

export function requestAnnotations(): RequestAnnotationAction {
    return {
        type: REQUEST_ANNOTATIONS,
    };
}

/**
 * RECEIVE_DATA_SOURCES
 *
 * Intention to store listing of data sources returned from data service. These are sets of file metadata
 * that can be used to narrow the set of explorable files down.
 */
export const RECEIVE_DATA_SOURCES = makeConstant(STATE_BRANCH_NAME, "receive-data-sources");

export interface ReceiveDataSourcesAction {
    payload: Source[];
    type: string;
}

export function receiveDataSources(payload: Source[]): ReceiveDataSourcesAction {
    return {
        payload,
        type: RECEIVE_DATA_SOURCES,
    };
}

/**
 * REQUEST_DATA_SOURCES
 *
 * Intention to request listing of available data sources usable as a data source for files.
 */
export const REQUEST_DATA_SOURCES = makeConstant(STATE_BRANCH_NAME, "request-data-sources");

export interface RequestDataSourcesAction {
    type: string;
}

export function requestDataSources(): RequestDataSourcesAction {
    return {
        type: REQUEST_DATA_SOURCES,
    };
}
