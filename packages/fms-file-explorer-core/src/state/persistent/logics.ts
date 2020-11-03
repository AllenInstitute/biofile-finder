import { createLogic } from "redux-logic";

import { PersistentStateBranch } from ".";
import {
    HYDRATE_APPLICATION_STATE,
    SET_ALLEN_MOUNT_POINT,
    SET_CSV_COLUMNS,
    SET_IMAGE_J_LOCATION,
} from "./actions";
import { interaction, ReduxLogicDeps } from "../";
import { PersistedConfigKeys } from "../../services/PersistentConfigService";

/**
 * Interceptor responsible for transforming SET_<PERSISTED CONFIG> actions to both exist in the persistent configuration
 * and also in the current application state.
 */
const updatePersistedConfig = createLogic({
    type: [SET_ALLEN_MOUNT_POINT, SET_CSV_COLUMNS, SET_IMAGE_J_LOCATION],
    async transform(deps: ReduxLogicDeps, next) {
        const { action, getState } = deps;
        const { persistentConfigService } = interaction.selectors.getPlatformDependentServices(
            getState()
        );
        persistentConfigService.set(action.payload.key, action.payload.value);
        next(action);
    },
});

/**
 * Interceptor responsible for transforming HYDRATE_APPLICATION_STATE actions by adding persisted config data
 * to the payload
 */
const hydrateApplicationState = createLogic({
    type: HYDRATE_APPLICATION_STATE,
    async transform(deps: ReduxLogicDeps, next) {
        const persistentConfigService = deps.action.payload;
        const persistedConfig = Object.values(PersistedConfigKeys).reduce(
            (acc, key) => ({
                ...acc,
                [key]: persistentConfigService.get(key),
            }),
            {} as PersistentStateBranch
        );
        next({
            ...deps.action,
            payload: persistedConfig,
        });
    },
});

export default [updatePersistedConfig, hydrateApplicationState];
