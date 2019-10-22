import { unionBy } from "lodash";
import { AnyAction } from "redux";

import Annotation from "../../entity/Annotation";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import { ReceiveAnnotationAction, RECEIVE_ANNOTATIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
}

export const initialState = {
    // Manually add a few annotations as initial state. These are important to include as initial state because we need
    // them also as initial state for the annotations to display in the file list.
    annotations: [
        new Annotation({
            annotation_display_name: "File name", // eslint-disable-line @typescript-eslint/camelcase
            annotation_name: "file_name", // eslint-disable-line @typescript-eslint/camelcase
            description: "name of file",
            type: "string",
        }),
        new Annotation({
            annotation_display_name: "Size", // eslint-disable-line @typescript-eslint/camelcase
            annotation_name: "file_size", // eslint-disable-line @typescript-eslint/camelcase
            description: "size of file on disk",
            type: "number",
            units: "bytes",
        }),
        new Annotation({
            annotation_display_name: "Date created", // eslint-disable-line @typescript-eslint/camelcase
            annotation_name: "created", // eslint-disable-line @typescript-eslint/camelcase
            description: "date file was created",
            type: "date/time",
        }),
    ],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [RECEIVE_ANNOTATIONS]: {
        accepts: (action: AnyAction): action is ReceiveAnnotationAction =>
            action.type === RECEIVE_ANNOTATIONS,
        perform: (
            state: MetadataStateBranch,
            action: ReceiveAnnotationAction
        ): MetadataStateBranch => ({
            ...state,
            annotations: unionBy(
                state.annotations,
                action.payload,
                (annotation) => annotation.name
            ),
        }),
    },
};

export default makeReducer<MetadataStateBranch>(actionToConfigMap, initialState);
