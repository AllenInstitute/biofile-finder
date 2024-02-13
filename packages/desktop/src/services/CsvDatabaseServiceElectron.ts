import duckdb from "duckdb";

import { CsvDatabaseService } from "../../../core/services";

export default class CsvDatabaseServiceElectron implements CsvDatabaseService {
    private database: duckdb.Database;

    constructor() {
        this.database = new duckdb.Database(":memory:");
    }

    public async setDataSource(csvFile: string): Promise<void> {
        this.database = new duckdb.Database(":memory:");
        const sql = `CREATE TABLE new_tbl AS FROM read_csv_auto('${csvFile}')`;
        await this.query(sql);
    }

    public query(sql: string): Promise<duckdb.TableData> {
        return new Promise((resolve, reject) => {
            try {
                this.database.all(sql, (err: any, tableData: any) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve(tableData);
                    }
                });
            } catch (error) {
                return Promise.reject(`${error}`);
            }
        });
    }
}
