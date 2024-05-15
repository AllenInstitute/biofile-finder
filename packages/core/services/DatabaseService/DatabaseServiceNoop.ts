import DatabaseService from ".";

export default class DatabaseServiceNoop implements DatabaseService {
    public addDataSource() {
        return Promise.reject("DatabaseServiceNoop:addDataSource");
    }

    public saveQueryAsBuffer(): Promise<Uint8Array> {
        return Promise.reject("DatabaseServiceNoop:saveQueryAsBuffer");
    }

    public query(): Promise<{ [key: string]: string }[]> {
        return Promise.reject("DatabaseServiceNoop:query");
    }
}
