import DatabaseService from ".";

export default class DatabaseServiceNoop implements DatabaseService {
    public table = "noop";

    public setDataSource() {
        return Promise.reject("DatabaseServiceNoop:setDataSource");
    }

    public getDataSource() {
        return Promise.reject("DatabaseServiceNoop:getDataSource");
    }

    public query() {
        return Promise.reject("DatabaseServiceNoop:query");
    }
}
