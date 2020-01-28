import { makeReducer } from "@aics/redux-utils";
import { unionBy } from "lodash";

import Annotation from "../../entity/Annotation";

import { RECEIVE_ANNOTATIONS } from "./actions";

export interface MetadataStateBranch {
    annotations: Annotation[];
}

export const TOP_LEVEL_FILE_ANNOTATIONS = [
    new Annotation({
        annotation_display_name: "File name",
        annotation_name: "file_name",
        description: "Name of file",
        type: "Text",
        values: [],
    }),
    new Annotation({
        annotation_display_name: "File path",
        annotation_name: "file_path",
        description: "Path to file in storage.",
        type: "Text",
        values: [],
    }),
    new Annotation({
        annotation_display_name: "Size",
        annotation_name: "file_size",
        description: "Size of file on disk.",
        type: "Number",
        units: "bytes",
        values: [],
    }),
    new Annotation({
        annotation_display_name: "Type",
        annotation_name: "file_type",
        description: "Type of file.",
        type: "Text",
        values: [],
    }),
    new Annotation({
        annotation_display_name: "Uploaded",
        annotation_name: "uploaded",
        description: "Date and time file was uploaded.",
        type: "Date/Time",
        values: [],
    }),
    new Annotation({
        annotation_display_name: "Uploaded by",
        annotation_name: "uploaded_by",
        description: "Person or process who uploaded this file.",
        type: "Text",
        values: [],
    }),
];

export const initialState = {
    annotations: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: unionBy(
                state.annotations,
                action.payload,
                (annotation) => annotation.name
            ),
        }),
    },
    initialState
);
