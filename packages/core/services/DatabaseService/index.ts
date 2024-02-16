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

    setDataSource(uri: string): Promise<void>;

    getDataSource(uri: string): Promise<DataSource>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
