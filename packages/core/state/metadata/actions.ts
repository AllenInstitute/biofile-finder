import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";
import { Dataset } from "../../services/DatasetService";

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
 * RECEIVE_DATASETS
 *
 * TODO
 */
export const RECEIVE_DATASETS = makeConstant(STATE_BRANCH_NAME, "receive-datasets");

export interface ReceiveDatasetAction {
    payload: Dataset[];
    type: string;
}

export function receiveDatasets(payload: Dataset[]): ReceiveDatasetAction {
    return {
        payload,
        type: RECEIVE_DATASETS,
    };
}

/**
 * REQUEST_DATASETS
 *
 * Intention to request listing of available datasets usable as a data source for files.
 */
export const REQUEST_DATASETS = makeConstant(STATE_BRANCH_NAME, "request-datasets");

export interface RequestDatasetAction {
    type: string;
}

export function requestDatasets(): RequestDatasetAction {
    return {
        type: REQUEST_DATASETS,
    };
}
