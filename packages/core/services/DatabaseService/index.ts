/**
 * TODO
 */
export interface DataSource {
    name: string;
    created: Date;
}

// TODO: Rename to LocalDatabaseService
export default interface DatabaseService {
    table: string;

    setDataSource(csvUri: string): Promise<void>;

    getDataSource(csvUri: string): Promise<DataSource>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
