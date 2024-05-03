import DatabaseService from ".";

export default class DatabaseServiceNoop implements DatabaseService {
    public table = "noop";

    public setDataSource() {
        return Promise.reject("DatabaseServiceNoop:setDataSource");
    }

    public getDataSource() {
        return Promise.reject("DatabaseServiceNoop:getDataSource");
    }

    public saveQueryAsBuffer(): Promise<Uint8Array> {
        return Promise.reject("DatabaseServiceNoop:saveQueryAsBuffer");
    }

    public query(): Promise<{ [key: string]: string }[]> {
        return Promise.reject("DatabaseServiceNoop:query");
    }
}
