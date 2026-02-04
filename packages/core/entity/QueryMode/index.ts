import { DatabaseService } from "../../services";

enum QueryMode {
    // Values of QueryMode are set to strings so that the values are always
    // truthy
    IN_MEMORY_OR_FMS = "IN_MEMORY_OR_FMS",
    DIRECT_FROM_PARQUET = "DIRECT_FROM_PARQUET",
}
export default QueryMode;

export function getRowIDColumn(queryMode: QueryMode) {
    return queryMode == QueryMode.IN_MEMORY_OR_FMS
        ? DatabaseService.HIDDEN_UID_ANNOTATION
        : DatabaseService.PARQUET_ROW_NUMBER_COL;
}
