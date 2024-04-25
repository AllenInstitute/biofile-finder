export interface DataSource {
    name: string;
    created: Date;
}

/**
 * Service reponsible for querying against a database
 */
export default interface DatabaseService {
    table: string;

    setDataSource(uri: string): Promise<void>;

    getDataSource(uri: string): Promise<DataSource>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
