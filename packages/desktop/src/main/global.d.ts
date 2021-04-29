// necessary in order to do: global.fileExplorerServiceBaseUrl = "..."
declare namespace NodeJS {
    export interface Global {
        fileDownloadServiceBaseUrl: string;
        fileExplorerServiceAllenMountPoint?: string;
        fileExplorerServiceBaseUrl: string;
    }
}
