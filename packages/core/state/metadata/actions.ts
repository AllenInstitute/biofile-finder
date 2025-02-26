import { makeConstant } from "@aics/redux-utils";

import Annotation, { AnnotationResponseMms } from "../../entity/Annotation";
import { DataSource } from "../../services/DataSourceService";

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
 * CREATE_ANNOTATION
 *
 * Intention to create a new annotation in the data service that will become available for grouping, filtering, and sorting files.
 */
export const CREATE_ANNOTATION = makeConstant(STATE_BRANCH_NAME, "create-annotation");

export interface CreateAnnotationAction {
    payload: {
        annotation: Annotation;
        annotationOptions?: string[];
    };
    type: string;
}

export function createAnnotation(
    annotation: Annotation,
    annotationOptions?: string[]
): CreateAnnotationAction {
    return {
        payload: { annotation, annotationOptions },
        type: CREATE_ANNOTATION,
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
    payload: DataSource[];
    type: string;
}

export function receiveDataSources(payload: DataSource[]): ReceiveDataSourcesAction {
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

/**
 * REQUEST_DATASET_MANIFEST
 *
 * Intention to request listing of dataset manifests containing
 * metadata about available open-source datasets.
 *
 * Used in web only
 */
export const REQUEST_DATASET_MANIFEST = makeConstant(STATE_BRANCH_NAME, "request-dataset-manifest");

export interface RequestDatasetManifest {
    payload: {
        name: string;
        uri: string;
    };
    type: string;
}

export function requestDatasetManifest(name: string, uri: string): RequestDatasetManifest {
    return {
        payload: { name, uri },
        type: REQUEST_DATASET_MANIFEST,
    };
}

/**
 * RECEIVE_DATASET_MANIFEST
 *
 * Intention to store dataset manifest containing metadata about available open-source datasets
 */
export const RECEIVE_DATASET_MANIFEST = makeConstant(STATE_BRANCH_NAME, "receive-dataset-manifest");

export interface ReceiveDatasetManifestAction {
    payload: {
        name: string;
        uri: string;
    };
    type: string;
}

export function receiveDatasetManifest(name: string, uri: string): ReceiveDatasetManifestAction {
    return {
        payload: { name, uri },
        type: RECEIVE_DATASET_MANIFEST,
    };
}

/**
 * STORE_NEW_ANNOTATION
 * Temporarily cache a newly created annotation before it is ingested to FES
 */
export const STORE_NEW_ANNOTATION = makeConstant(STATE_BRANCH_NAME, "store-new-annotation");

export interface StoreNewAnnotationAction {
    payload: {
        annotation: AnnotationResponseMms;
    };
    type: string;
}

export function storeNewAnnotation(annotation: AnnotationResponseMms): StoreNewAnnotationAction {
    return {
        payload: { annotation },
        type: STORE_NEW_ANNOTATION,
    };
}
