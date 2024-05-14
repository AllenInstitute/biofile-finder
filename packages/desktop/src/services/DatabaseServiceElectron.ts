import duckdb from "duckdb";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceElectron implements DatabaseService {
    private database: duckdb.Database;

    constructor() {
        this.database = new duckdb.Database(":memory:");
    }

    public async addDataSource(name: string, fileURI: File | string): Promise<void> {
        this.database = new duckdb.Database(":memory:");
        console.log(name, fileURI);
        // const extension = path.extname(fileURI);
        // let sql;
        // switch (extension) {
        //     case ".json":
        //         sql = `CREATE TABLE ${name} AS FROM read_json_auto('${fileURI}')`;
        //         break;
        //     case ".parquet":
        //         sql = `CREATE TABLE ${name} AS FROM read_parquet('${fileURI}')`;
        //         break;
        //     case ".csv":
        //         sql = `CREATE TABLE ${name} AS FROM read_csv_auto('${fileURI}')`;
        //         break;
        //     default:
        //         throw new Error(`Unsupport data source type ${extension} of ${fileURI}`);
        // }
        // await this.query(sql);
    }

    public async saveQueryAsBuffer(): Promise<Uint8Array> {
        throw new Error("Not yet implemented (saveQueryAsBuffer)");
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
