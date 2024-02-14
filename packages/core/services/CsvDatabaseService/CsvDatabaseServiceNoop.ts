import CsvDatabaseService from ".";

export default class CsvDatabaseServiceNoop implements CsvDatabaseService {
    public setDataSource() {
        return Promise.reject("CsvDatabaseServiceNoop:setDataSource");
    }

    public getDataSource() {
        return Promise.reject("CsvDatabaseServiceNoop:getDataSource");
    }

    public query() {
        return Promise.reject("CsvDatabaseServiceNoop:query");
    }
}
