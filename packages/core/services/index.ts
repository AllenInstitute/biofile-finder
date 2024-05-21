import FrontendInsights from "@aics/frontend-insights";
import ApplicationInfoService from "./ApplicationInfoService";
import DatabaseService from "./DatabaseService";
import ExecutionEnvService from "./ExecutionEnvService";
import FileDownloadService from "./FileDownloadService";
import FileViewerService from "./FileViewerService";
import NotificationService from "./NotificationService";

export { default as AnnotationService } from "./AnnotationService";
export type { default as ApplicationInfoService } from "./ApplicationInfoService";
export { default as DatabaseService } from "./DatabaseService";
export { default as DatasetService } from "./DataSourceService";
export type { default as ExecutionEnvService } from "./ExecutionEnvService";
export { ExecutableEnvCancellationToken, SystemDefaultAppLocation } from "./ExecutionEnvService";
export type { SaveLocationResolution } from "./ExecutionEnvService";
export type {
    default as FileDownloadService,
    DownloadResult,
    FileInfo,
} from "./FileDownloadService";
export { DownloadResolution, FileDownloadCancellationToken } from "./FileDownloadService";
export { default as FileService } from "./FileService";
export type { default as FileViewerService } from "./FileViewerService";
export { FileViewerCancellationToken } from "./FileViewerService";
export { default as HttpServiceBase } from "./HttpServiceBase";
export type { default as NotificationService } from "./NotificationService";
export type {
    default as PersistentConfigService,
    PersistedConfig,
    UserSelectedApplication,
} from "./PersistentConfigService";
export { PersistedConfigKeys } from "./PersistentConfigService";

export interface PlatformDependentServices {
    applicationInfoService: ApplicationInfoService;
    databaseService: DatabaseService;
    fileDownloadService: FileDownloadService;
    fileViewerService: FileViewerService;
    frontendInsights: FrontendInsights;
    executionEnvService: ExecutionEnvService;
    notificationService: NotificationService;
}
