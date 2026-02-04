import { DatabaseService } from "../../services";

enum QueryMode {
    InMemoryOrFMS,
    DirectFromParquet,
}
export default QueryMode;

export function getRowIDColumn(queryMode: QueryMode) {
    return queryMode == QueryMode.InMemoryOrFMS
        ? DatabaseService.HIDDEN_UID_ANNOTATION
        : DatabaseService.PARQUET_ROW_NUMBER_COL;
}
