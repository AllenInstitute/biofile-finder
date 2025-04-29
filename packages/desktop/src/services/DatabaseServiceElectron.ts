import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import duckdb from "duckdb";

import { DatabaseService } from "../../../core/services";

export default class DatabaseServiceElectron extends DatabaseService {
    private database: duckdb.Database;

    constructor() {
        super();
        this.database = new duckdb.Database(":memory:");
    }

    /**
     * Saves the result of the query to the designated location.
     * May return a value if the location is not a physical location but rather
     * a temporary database location (buffer)
     */
    public saveQuery(
        destination: string,
        sql: string,
        format: "csv" | "json" | "parquet"
    ): Promise<Uint8Array> {
        const saveOptions = [`FORMAT '${format}'`];
        if (format === "csv") {
            saveOptions.push("HEADER");
        }
        return new Promise((resolve, reject) => {
            this.database.run(
                `COPY (${sql}) TO '${destination}.${format}' (${saveOptions.join(", ")});`,
                (err: any, result: any) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
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

    public async reset(): Promise<void> {
        await this.close();
        this.database = new duckdb.Database(":memory:");
    }

    public close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database.close((err) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve();
                }
            });
        });
    }

    protected async addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: string | File
    ): Promise<void> {
        let source: string;
        let tempLocation;
        try {
            if (typeof uri === "string") {
                source = uri;
            } else {
                source = path.resolve(os.tmpdir(), name);
                console.info("source in electron addDS", source);
                const arrayBuffer = await uri.arrayBuffer();
                console.info("arrayBuffer in electron addDS", arrayBuffer);
                const writeStream = fs.createWriteStream(source);
                console.info("writeStream in electron addDS", writeStream);
                await new Promise<void>((resolve, reject) => {
                    writeStream.write(Buffer.from(arrayBuffer), (error) => {
                        if (error) {
                            console.error("error in write stream", error);
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
                tempLocation = source;
            }

            await new Promise<void>((resolve, reject) => {
                const callback = (err: any) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve();
                    }
                };

                if (type === "parquet") {
                    this.database.run(
                        `CREATE TABLE "${name}" AS FROM parquet_scan('${source}');`,
                        callback
                    );
                } else if (type === "json") {
                    this.database.run(
                        `CREATE TABLE "${name}" AS FROM read_json_auto('${source}');`,
                        callback
                    );
                } else {
                    // Default to CSV
                    this.database.exec(
                        `CREATE TABLE "${name}" AS FROM read_csv_auto('${source}', header=true, all_varchar=true);`,
                        callback
                    );
                }
            });
        } finally {
            if (tempLocation) {
                await fs.promises.unlink(tempLocation);
            }
        }
    }

    protected async execute(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.database.exec(sql, (err: any) => {
                    if (err) {
                        reject(err.message);
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                return Promise.reject(`${error}`);
            }
        });
    }
}
