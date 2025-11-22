import { makeConstant } from "@aics/redux-utils";

import Annotation, { AnnotationResponseMms } from "../../entity/Annotation";
import { DataSource } from "../../services/DataSourceService";
import { EdgeDefinition } from "../../entity/GraphGenerator";

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
        user?: string;
    };
    type: string;
}

export function createAnnotation(
    annotation: Annotation,
    annotationOptions?: string[],
    user?: string
): CreateAnnotationAction {
    return {
        payload: { annotation, annotationOptions, user },
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
    };
    type: string;
}

export function requestDatasetManifest(name: string): RequestDatasetManifest {
    return {
        payload: { name },
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
 * RECEIVE_EDGE_DEFINITIONS
 *
 * Intention to store the listing of edge definitions present from the provenance definition supplied
 */
export const RECEIVE_EDGE_DEFINITIONS = makeConstant(STATE_BRANCH_NAME, "receive-edge-definitions");

export interface ReceiveEdgeDefinitions {
    payload: EdgeDefinition[];
    type: string;
}

export function receiveEdgeDefinitions(payload: EdgeDefinition[]): ReceiveEdgeDefinitions {
    return {
        payload,
        type: RECEIVE_EDGE_DEFINITIONS,
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

/**
 * REQUEST_PASSWORD_MAPPING
 *
 * Intention to request password mapping for AICS FMS - this is a temporary solution
 * until we have a more robust solution for handling passwords in the app.
 */
export const REQUEST_PASSWORD_MAPPING = makeConstant(STATE_BRANCH_NAME, "request-password-mapping");

export interface RequestPasswordMappingAction {
    type: string;
}

export function requestPasswordMapping(): RequestPasswordMappingAction {
    return {
        type: REQUEST_PASSWORD_MAPPING,
    };
}

/**
 * RECEIVE_PASSWORD_MAPPING
 *
 * Intention to store password mapping for AICS FMS - this is a temporary solution
 * until we have a more robust solution for handling passwords in the app.
 */
export const RECEIVE_PASSWORD_MAPPING = makeConstant(STATE_BRANCH_NAME, "receive-password-mapping");

export interface ReceivePasswordMappingAction {
    payload: Record<string, string>;
    type: string;
}

export function receivePasswordMapping(
    passwordToProgramMap: Record<string, string>
): ReceivePasswordMappingAction {
    return {
        payload: passwordToProgramMap,
        type: RECEIVE_PASSWORD_MAPPING,
    };
}
