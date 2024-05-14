export interface DataSource {
    name: string;
    created: Date;
}

/**
 * Service reponsible for querying against a database
 */
export default interface DatabaseService {
    addDataSource(name: string, uri: File | string): Promise<void>;

    saveQueryAsBuffer(sql: string): Promise<Uint8Array>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
