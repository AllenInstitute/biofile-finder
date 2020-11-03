import { configureMockStore, mergeState } from "@aics/redux-utils";
import { expect } from "chai";

import {
    hydrateApplicationState,
    HYDRATE_APPLICATION_STATE,
    setAllenMountPoint,
    setCsvColumns,
    setImageJLocation,
    SET_ALLEN_MOUNT_POINT,
    SET_CSV_COLUMNS,
    SET_IMAGE_J_LOCATION,
} from "../actions";
import persistentLogics from "../logics";
import { initialState } from "../..";
import PersistentConfigService, {
    PersistedConfigKeys,
} from "../../../services/PersistentConfigService";

describe("Persistent logics", () => {
    describe("updatePersistedConfig", () => {
        let persistedData: any;
        class UselessPersistentConfig implements PersistentConfigService {
            set(_: PersistedConfigKeys, value: any) {
                persistedData = value;
            }
            get() {
                return;
            }
        }
        const state = mergeState(initialState, {
            interaction: {
                platformDependentServices: {
                    persistentConfigService: new UselessPersistentConfig(),
                },
            },
        });

        it("persists allen mount point", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: persistentLogics,
            });
            const allenMountPoint = "/some/path/to/somewhere.txt";

            // Act
            store.dispatch(setAllenMountPoint(allenMountPoint));
            await logicMiddleware.whenComplete();

            // Assert
            expect(persistedData).to.equal(allenMountPoint);
            expect(
                actions.includesMatch({
                    type: SET_ALLEN_MOUNT_POINT,
                    payload: {
                        key: PersistedConfigKeys.AllenMountPoint,
                        value: allenMountPoint,
                    },
                })
            ).to.equal(true);
        });

        it("persists csv columns", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: persistentLogics,
            });
            const csvColumns = ["Cell Line", "Date Created", "Cas9"];

            // Act
            store.dispatch(setCsvColumns(csvColumns));
            await logicMiddleware.whenComplete();

            // Assert
            expect(persistedData).to.equal(csvColumns);
            expect(
                actions.includesMatch({
                    type: SET_CSV_COLUMNS,
                    payload: {
                        key: PersistedConfigKeys.CsvColumns,
                        value: csvColumns,
                    },
                })
            ).to.equal(true);
        });

        it("persists ImageJ/Fiji location", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state,
                logics: persistentLogics,
            });
            const imageJLocation = "/some/path/to/some/imageJ";

            // Act
            store.dispatch(setImageJLocation(imageJLocation));
            await logicMiddleware.whenComplete();

            // Assert
            expect(persistedData).to.equal(imageJLocation);
            expect(
                actions.includesMatch({
                    type: SET_IMAGE_J_LOCATION,
                    payload: {
                        key: PersistedConfigKeys.ImageJExecutable,
                        value: imageJLocation,
                    },
                })
            ).to.equal(true);
        });
    });

    describe("hydrateApplicationState", () => {
        it("extracts persisted data into the app state", async () => {
            // Arrange
            const { store, logicMiddleware, actions } = configureMockStore({
                state: initialState,
                logics: persistentLogics,
            });
            const expectedAllenMountPoint = "/some/path/to/allen";
            const expectedCsvColumns = ["Cell Line", "Clone"];
            const expectedImageJLocation = "/some/path/to/imagej";
            class UselessPersistentConfig implements PersistentConfigService {
                get(key: PersistedConfigKeys) {
                    switch (key) {
                        case PersistedConfigKeys.AllenMountPoint:
                            return expectedAllenMountPoint;
                        case PersistedConfigKeys.CsvColumns:
                            return expectedCsvColumns;
                        case PersistedConfigKeys.ImageJExecutable:
                            return expectedImageJLocation;
                    }
                }
                set() {
                    return;
                }
            }
            const persistentConfigService = new UselessPersistentConfig();

            // Act
            store.dispatch(hydrateApplicationState(persistentConfigService));
            await logicMiddleware.whenComplete();

            // Assert
            expect(
                actions.includesMatch({
                    type: HYDRATE_APPLICATION_STATE,
                    payload: {
                        [PersistedConfigKeys.AllenMountPoint]: expectedAllenMountPoint,
                        [PersistedConfigKeys.CsvColumns]: expectedCsvColumns,
                        [PersistedConfigKeys.ImageJExecutable]: expectedImageJLocation,
                    },
                })
            ).to.equal(true);
        });
    });
});
