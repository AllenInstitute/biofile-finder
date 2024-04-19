import { AnnotationResponse } from "../../entity/Annotation";
import { Query } from "../../state/selection/actions";

/**
 * Keys for the data saved by this service
 */
export enum PersistedConfigKeys {
    AllenMountPoint = "ALLEN_MOUNT_POINT",
    CsvColumns = "CSV_COLUMNS",
    DisplayAnnotations = "DISPLAY_ANNOTATIONS",
    ImageJExecutable = "IMAGE_J_EXECUTABLE", // Deprecated
    HasUsedApplicationBefore = "HAS_USED_APPLICATION_BEFORE",
    UserSelectedApplications = "USER_SELECTED_APPLICATIONS",
    Queries = "QUERIES",
}

export interface UserSelectedApplication {
    defaultFileKinds: string[];
    filePath: string;
}

export interface PersistedConfig {
    [PersistedConfigKeys.AllenMountPoint]?: string;
    [PersistedConfigKeys.CsvColumns]?: string[];
    [PersistedConfigKeys.DisplayAnnotations]?: AnnotationResponse[];
    [PersistedConfigKeys.ImageJExecutable]?: string; // Deprecated
    [PersistedConfigKeys.HasUsedApplicationBefore]?: boolean;
    [PersistedConfigKeys.Queries]?: Query[];
    [PersistedConfigKeys.UserSelectedApplications]?: UserSelectedApplication[];
}

/**
 * Interface that defines a platform-dependent service for persistent configuration data.
 */
export default interface PersistentConfigService {
    /**
     * Retrieve the config value for the given key. Returns undefined if not present.
     */
    get(key: PersistedConfigKeys): any;

    /**
     * Retrieve the config value for all possible keys.
     */
    getAll(): PersistedConfig;

    /**
     * Save the config value at the given key. Overwrites any existing data for the key.
     */
    persist(config: PersistedConfig): void;
    persist(key: PersistedConfigKeys, value: any): void;
}
