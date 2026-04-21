import DatabaseService from "./DatabaseService";
import FileDownloadService from "./FileDownloadService";
import NotificationService from "./NotificationService";
import PersistentConfigService from "./PersistentConfigService";

export { default as AnnotationService } from "./AnnotationService";
export { default as DatabaseService } from "./DatabaseService";
export type { DownloadResult, FileInfo } from "./FileDownloadService";
export { DownloadResolution, FileDownloadCancellationToken } from "./FileDownloadService";
export { default as FileService } from "./FileService";
export { default as FileDownloadService } from "./FileDownloadService";
export type { default as NotificationService } from "./NotificationService";
export type {
    default as PersistentConfigService,
    PersistedConfig,
    UserSelectedApplication,
} from "./PersistentConfigService";
export { PersistedConfigKeys } from "./PersistentConfigService";

export interface PlatformDependentServices {
    databaseService: DatabaseService;
    fileDownloadService: FileDownloadService;
    notificationService: NotificationService;
    persistentConfigService: PersistentConfigService;
}

