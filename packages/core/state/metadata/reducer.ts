import { makeReducer } from "@aics/redux-utils";
import { interaction } from "..";

import Annotation from "../../entity/Annotation";
import { Dataset } from "../../services/DatasetService";

import { RECEIVE_ANNOTATIONS, RECEIVE_DATASETS } from "./actions";

export interface View {
    id: string;
    name: string;
}

export interface MetadataStateBranch {
    annotations: Annotation[];
    datasets: Dataset[];
    views: View[];
}

export const initialState = {
    annotations: [],
    datasets: [],
    views: [],
};

export default makeReducer<MetadataStateBranch>(
    {
        [interaction.actions.SUCCEED_SHAREABLE_FILE_SELECTION_LINK_GENERATION]: (
            state,
            action
        ) => ({
            ...state,
            datasets: [...state.datasets, action.payload.dataset],
        }),
        [RECEIVE_ANNOTATIONS]: (state, action) => ({
            ...state,
            annotations: action.payload,
        }),
        [RECEIVE_DATASETS]: (state, action) => ({
            ...state,
            datasets: action.payload,
        }),
    },
    initialState
);
