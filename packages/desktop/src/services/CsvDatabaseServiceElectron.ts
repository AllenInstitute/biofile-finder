import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import axios from "axios";
const httpAdapter = require("axios/lib/adapters/http"); // exported from lib, but not typed (can't be fixed through typing augmentation)
import duckdb from "duckdb";

import { CsvDatabaseService, DataSource } from "../../../core/services";

export default class CsvDatabaseServiceElectron implements CsvDatabaseService {
    private database: duckdb.Database;

    constructor() {
        this.database = new duckdb.Database(":memory:");
    }

    public async setDataSource(fileURI: string): Promise<void> {
        this.database = new duckdb.Database(":memory:");
        const extension = path.extname(fileURI);
        let sql;
        switch (extension) {
            case "json":
                sql = `CREATE TABLE new_tbl AS FROM read_json_auto('${fileURI}')`;
                break;
            case "parquet":
                sql = `CREATE TABLE new_tbl AS FROM read_parquet('${fileURI}')`;
                break;
            default:
                // csv
                sql = `CREATE TABLE new_tbl AS FROM read_csv_auto('${fileURI}')`;
        }
        await this.query(sql);
    }

    public async getDataSource(csvUri: string): Promise<DataSource> {
        if (csvUri.startsWith("http")) {
            const response = await axios.get(csvUri, {
                // Ensure this runs with the NodeJS http/https client so that testing across code that makes use of Electron/NodeJS APIs
                // can be done with consistent patterns.
                // Requires the Electron renderer process to be run with `nodeIntegration: true`.
                adapter: httpAdapter,
            });

            // TODO: Can we make sure this doesn't just request 30GB suddenly for example?
            if (response.status >= 400 || response.data === undefined) {
                throw new Error(
                    `Failed to fetch CSV from ${csvUri}. Response status text: ${response.statusText}`
                );
            }
            const urlObj = new url.URL(csvUri);

            return {
                name: urlObj.pathname.split("/").pop() || "Unknown",
                created: new Date(),
            };
        } else {
            try {
                await fs.promises.access(csvUri, fs.constants.R_OK);
                const stats = await fs.promises.stat(csvUri);
                return {
                    name: path.parse(csvUri).name,
                    created: stats.birthtime,
                };
            } catch (err) {
                throw new Error(`Failed to access file at ${csvUri}. Exact error: ${err}`);
            }
        }
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
