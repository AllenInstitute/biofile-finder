/**
 * TODO
 */
export default interface CsvDatabaseService {
    setDataSource(csvFile: string): Promise<void>;

    query(sql: string): Promise<{ [key: string]: string }[]>;
}
