import DatabaseService from ".";

export default class DatabaseServiceNoop extends DatabaseService {
    public deleteSourceMetadata(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:deleteSourceMetadata");
    }

    public execute(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:execute");
    }

    public prepareDataSources() {
        return Promise.resolve();
    }

    public saveQuery(): Promise<Uint8Array> {
        return Promise.reject("DatabaseServiceNoop:saveQuery");
    }

    public query(): Promise<{ [key: string]: string }[]> {
        return Promise.reject("DatabaseServiceNoop:query");
    }

    protected addDataSource(): Promise<void> {
        return Promise.reject("DatabaseServiceNoop:addDataSource");
    }
}
