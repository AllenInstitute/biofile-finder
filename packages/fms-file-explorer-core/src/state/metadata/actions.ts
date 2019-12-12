import { makeConstant } from "@aics/redux-utils";

import Annotation from "../../entity/Annotation";

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
 * RECEIVE_ANNOTATION_VALUES
 *
 * Intention to store all unique values assigned to an annotation (across all of its usages in FMS). These values are requested when
 * an annotation is dropped into the annotation hierarchy.
 */
export const RECEIVE_ANNOTATION_VALUES = makeConstant(
    STATE_BRANCH_NAME,
    "receive-annotation-values"
);

export interface ReceiveAnnotationValuesAction {
    payload: {
        name: string;
        values: (string | number | boolean)[];
    };
    type: string;
}

export function receiveAnnotationValues(
    name: string,
    values: (string | number | boolean)[]
): ReceiveAnnotationValuesAction {
    return {
        payload: {
            name,
            values,
        },
        type: RECEIVE_ANNOTATION_VALUES,
    };
}
