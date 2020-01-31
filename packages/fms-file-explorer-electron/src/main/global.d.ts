declare namespace NodeJS {
    export interface Global {
        // necessary in order to do: global.fileExplorerServiceBaseUrl = "..."
        fileExplorerServiceBaseUrl: string;
    }
}
