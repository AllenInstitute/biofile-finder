export default class DataSourcePreparationError extends Error {
    public sourceName: string;
    public isLocalDataSourceLost: boolean;

    constructor(message: string, sourceName: string, isLocalDataSourceLost = false) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DataSourcePreparationError);
        }

        this.name = "DataSourcePreparationError";
        this.sourceName = sourceName;
        this.isLocalDataSourceLost = isLocalDataSourceLost;
    }
}
