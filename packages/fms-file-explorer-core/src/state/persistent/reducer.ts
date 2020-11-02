import { makeReducer } from "@aics/redux-utils";

import {
    HYDRATE_APPLICATION_STATE,
    SET_ALLEN_MOUNT_POINT,
    SET_CSV_COLUMNS,
    SET_IMAGE_J_LOCATION,
} from "./actions";
import { PersistedConfigKeys } from "../../services/PersistentConfigService";

export interface PersistentStateBranch {
    [PersistedConfigKeys.AllenMountPoint]?: string;
    [PersistedConfigKeys.CsvColumns]?: string[];
    [PersistedConfigKeys.ImageJExecutable]?: string;
}

export const initialState = {};

export default makeReducer<PersistentStateBranch>(
    {
        [SET_ALLEN_MOUNT_POINT]: (state, action) => ({
            ...state,
            ALLEN_MOUNT_POINT: action.payload.value,
        }),
        [SET_CSV_COLUMNS]: (state, action) => ({
            ...state,
            CSV_COLUMNS: action.payload.value,
        }),
        [SET_IMAGE_J_LOCATION]: (state, action) => ({
            ...state,
            IMAGE_J_EXECUTABLE: action.payload.value,
        }),
        [HYDRATE_APPLICATION_STATE]: (state, action) => ({
            ...state,
            ...action.payload,
        }),
    },
    initialState
);
