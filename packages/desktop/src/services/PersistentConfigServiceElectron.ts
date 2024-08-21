import Store, { Options } from "electron-store";
import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
    UserSelectedApplication,
} from "../../../core/services";
import { find } from "lodash";

const OPTIONS: Options<Record<string, unknown>> = {
    // Defines a validation schema for data inserted into the persistent storage
    schema: {
        [PersistedConfigKeys.AllenMountPoint]: {
            type: "string",
        },
        [PersistedConfigKeys.CsvColumns]: {
            type: "array",
            items: {
                type: "string",
            },
        },
        [PersistedConfigKeys.DisplayAnnotations]: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    annotationDisplayName: {
                        type: "string",
                    },
                    annotationName: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    type: {
                        type: "string",
                    },
                },
            },
        },
        [PersistedConfigKeys.ImageJExecutable]: {
            type: "string",
        },
        [PersistedConfigKeys.Queries]: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                    },
                    url: {
                        type: "string",
                    },
                },
            },
        },
        [PersistedConfigKeys.HasUsedApplicationBefore]: {
            type: "boolean",
        },
        [PersistedConfigKeys.RecentAnnotations]: {
            type: "array",
            items: {
                type: "string",
            },
        },
        [PersistedConfigKeys.UserSelectedApplications]: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    defaultFileKinds: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                    filePath: {
                        type: "string",
                    },
                },
            },
        },
    },
    migrations: {
        ">4.3.0": (store) => {
            if (store.has(PersistedConfigKeys.ImageJExecutable)) {
                const fijiExePath = store.get(PersistedConfigKeys.ImageJExecutable) as string;
                const userSelectedApplications = store.get(
                    PersistedConfigKeys.UserSelectedApplications,
                    []
                ) as UserSelectedApplication[];
                const fijiConfig = find(
                    userSelectedApplications,
                    (config) => config.filePath === fijiExePath
                );
                if (!fijiConfig) {
                    store.set(PersistedConfigKeys.UserSelectedApplications, [
                        ...userSelectedApplications,
                        { filePath: fijiExePath, defaultFileKinds: [] },
                    ]);
                }

                store.delete(PersistedConfigKeys.ImageJExecutable);
            }
        },
        ">5.2.0": (store) => {
            if (store.has(PersistedConfigKeys.AllenMountPoint)) {
                store.delete(PersistedConfigKeys.AllenMountPoint);
            }
        },
    },
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private store: Store;

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store(OPTIONS);
        if (options.clearExistingData) {
            this.store.clear();
        }
    }

    public get(key: PersistedConfigKeys): any {
        return this.store.get(key);
    }

    public getAll(): PersistedConfig {
        // Initialize default values
        const defaultConfig: PersistedConfig = {
            [PersistedConfigKeys.AllenMountPoint]: "",
            [PersistedConfigKeys.CsvColumns]: [],
            [PersistedConfigKeys.DisplayAnnotations]: [],
            [PersistedConfigKeys.ImageJExecutable]: "",
            [PersistedConfigKeys.HasUsedApplicationBefore]: false,
            [PersistedConfigKeys.Queries]: [],
            [PersistedConfigKeys.RecentAnnotations]: [],
            [PersistedConfigKeys.UserSelectedApplications]: [],
        };

        // Merge defaults with persisted values
        return Object.values(PersistedConfigKeys).reduce(
            (config: PersistedConfig, key) => ({
                ...config,
                [key as string]: this.get(key) ?? defaultConfig[key],
            }),
            defaultConfig
        );
    }

    public clear(): void {
        this.store.clear();
    }

    public persist(config: PersistedConfig): void;
    public persist(key: PersistedConfigKeys, value: any): void;
    public persist(arg: PersistedConfigKeys | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg as PersistedConfig).forEach(([key, value]) => {
                this.persist(key as PersistedConfigKeys, value);
            });
        } else if (value === undefined || value === null) {
            this.store.delete(arg);
        } else {
            this.store.set(arg, value);
        }
    }
}
