import DatabaseService from ".";

export default class DatabaseServiceNoop implements DatabaseService {
    public addDataSource() {
        return Promise.reject("DatabaseServiceNoop:addDataSource");
    }

    public saveQuery(): Promise<Uint8Array> {
        return Promise.reject("DatabaseServiceNoop:saveQuery");
    }

    public query(): Promise<{ [key: string]: string }[]> {
        return Promise.reject("DatabaseServiceNoop:query");
    }
}
