declare namespace NodeJS {
    export interface Global {
        // necessary in order to do: global.fileExplorerServiceBaseUrl = "..."
        fileExplorerServiceAllenMountPoint?: string;
        fileExplorerServiceBaseUrl: string;
        fileExplorerServiceImageJExecutable?: string;
    }
}
