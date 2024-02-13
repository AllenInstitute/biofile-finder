import CsvDatabaseService from ".";

export default class CsvDatabaseServiceNoop implements CsvDatabaseService {
    public setDataSource() {
        return Promise.resolve();
    }

    public query() {
        return Promise.reject("CsvDatabaseServiceNoop:query");
    }
}
