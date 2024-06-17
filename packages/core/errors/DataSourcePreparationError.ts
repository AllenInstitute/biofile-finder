export default class DataSourcePreparationError extends Error {
    public sourceName: string;

    constructor(message: string, sourceName: string) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DataSourcePreparationError);
        }

        this.name = "DataSourcePreparationError";
        this.sourceName = sourceName;
    }
}
