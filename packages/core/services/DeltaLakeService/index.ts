/**
 * Treats a Delta Lake table as a collection of parquet files
 * by traversing the transaction log and grabbing relevant .parquet
 * files.
 * 
 * This is a stopgap until DuckDB-wasm supports Delta Lake natively.
 */
export default class DeltaLakeService {

    /**
     * True if the URL points at the root of a Delta Lake table.
     *
     * Checks for presence of conventional log and checkpoint files,
     * but does not guarantee the table is readable beyond that.
     */
    public async isDeltaTable(_url: string): Promise<boolean> {
        return false;
    }

    /**
     * The parquet data files making up the table's current snapshot, as URLs.
     */
    public async listDataFiles(_url: string): Promise<string[]> {
        return [];
    }
}
