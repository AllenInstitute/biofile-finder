declare namespace NodeJS {
    export interface Global {
        // necessary in order to do: global.fileExplorerServiceConnection = {...}
        fileExplorerServiceConnection: {
            protocol: string;
            host: string;
            port: number;
        };
    }
}
