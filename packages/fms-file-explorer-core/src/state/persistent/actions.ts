import { makeConstant } from "@aics/redux-utils";

import PersistentConfigService, {
    PersistedConfigKeys,
} from "../../services/PersistentConfigService";

const STATE_BRANCH_NAME = "persistent";

/**
 * SET_ALLEN_MOUNT_POINT
 *
 * Intention to set the allen mount point.
 */
export const SET_ALLEN_MOUNT_POINT = makeConstant(STATE_BRANCH_NAME, "set-allen-mount-point");

export interface SetAllenMountPointAction {
    payload: {
        key: PersistedConfigKeys.AllenMountPoint;
        value: string;
    };
    type: string;
}

export function setAllenMountPoint(allenMountPoint: string): SetAllenMountPointAction {
    return {
        payload: {
            key: PersistedConfigKeys.AllenMountPoint,
            value: allenMountPoint,
        },
        type: SET_ALLEN_MOUNT_POINT,
    };
}
/**
 * SET_CSV_COLUMNS
 *
 * Intention to set the csv columns
 */
export const SET_CSV_COLUMNS = makeConstant(STATE_BRANCH_NAME, "set-csv-columns");

export interface SetCsvColumnsAction {
    payload: {
        key: PersistedConfigKeys.CsvColumns;
        value: string[];
    };
    type: string;
}

export function setCsvColumns(csvColumns: string[]): SetCsvColumnsAction {
    return {
        payload: {
            key: PersistedConfigKeys.CsvColumns,
            value: csvColumns,
        },
        type: SET_CSV_COLUMNS,
    };
}

/**
 * SET_IMAGE_J_LOCATION
 *
 * Intention to the ImageJ/Fiji location
 */
export const SET_IMAGE_J_LOCATION = makeConstant(STATE_BRANCH_NAME, "set-image-j-location");

export interface SetImageJLocationAction {
    payload: {
        key: PersistedConfigKeys.ImageJExecutable;
        value: string;
    };
    type: string;
}

export function setImageJLocation(imageJLocation: string): SetImageJLocationAction {
    return {
        payload: {
            key: PersistedConfigKeys.ImageJExecutable,
            value: imageJLocation,
        },
        type: SET_IMAGE_J_LOCATION,
    };
}

/**
 * HYDRATE_APPLICATION_STATE
 *
 * Intention to hydrate the application state using the given persisted config service
 */
export const HYDRATE_APPLICATION_STATE = makeConstant(
    STATE_BRANCH_NAME,
    "hydrate-application-state"
);

export interface HydrateApplicationStateAction {
    payload: PersistentConfigService;
    type: string;
}

export function hydrateApplicationState(
    persistentConfigService: PersistentConfigService
): HydrateApplicationStateAction {
    return {
        payload: persistentConfigService,
        type: HYDRATE_APPLICATION_STATE,
    };
}
