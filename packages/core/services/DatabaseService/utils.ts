import { AnnotationType } from "../../entity/AnnotationFormatter";

export enum PreDefinedColumn {
    FILE_ID = "File ID",
    FILE_PATH = "File Path",
    FILE_NAME = "File Name",
    FILE_SIZE = "File Size",
    THUMBNAIL = "Thumbnail",
    UPLOADED = "Uploaded",
}

const PRE_DEFINED_COLUMNS = Object.values(PreDefinedColumn);
const HIDDEN_UID_ANNOTATION = "hidden_bff_uid";
const RAW_SUFFIX = "__bff_raw";
const SOURCE_METADATA_TABLE = "source_metadata";
const SOURCE_PROVENANCE_TABLE = "source_provenance";
export {
    PRE_DEFINED_COLUMNS,
    HIDDEN_UID_ANNOTATION,
    RAW_SUFFIX,
    SOURCE_METADATA_TABLE,
    SOURCE_PROVENANCE_TABLE,
};

// Map each actual column name to the predefined column name when they fuzzy-match.
export function getActualToPreDefinedColumnMap(columns: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const preDefinedColumn of PRE_DEFINED_COLUMNS) {
        const preDefinedColumnSimplified = preDefinedColumn.toLowerCase().replace(" ", "");
        // Grab near matches to the pre-defined columns like "file_name" for "File Name"
        const matches = [...columns].filter(
            (column) =>
                preDefinedColumnSimplified ===
                // Matches regardless of caps, whitespace, hyphens, or underscores
                column.toLowerCase().replaceAll(/\s|-|_/g, "")
        );

        // Doesn't seem like we should guess at a pre-defined column match in this case
        // so just toss up a user-actionable error to try to get them to retry
        if (matches.length > 1) {
            throw new Error(
                `Too many columns similar to pre-defined column: "${preDefinedColumn}", narrow
                these down to just one column exactly equal or similar to "${preDefinedColumn}".
                Found: ${matches}.`
            );
        }
        if (matches.length === 1) {
            map.set(matches[0], preDefinedColumn);
        }
    }
    return map;
}

/**
 * Derive a "File Name" from a path-like column (local path or URL).
 */
export function getFileNameFromPathExpression(quotedPathColumn: string): string {
    const cleaned = `REGEXP_REPLACE(
        REGEXP_REPLACE(${quotedPathColumn}, '[?#].*$', ''),
        '/+$',
        ''
    )`;
    const basename = `REGEXP_EXTRACT(${cleaned}, '([^/]+)$', 1)`;
    const stripOme = `REGEXP_REPLACE(${basename}, '(?i)\\\\.ome$', '')`;

    return `COALESCE(NULLIF(${stripOme}, ''), ${quotedPathColumn})`;
}

/**
 * For parquets: add a computed "File Name" when we have "File Path" but not "File Name".
 */
export function getParquetFileNameSelectPart(
    actualToPreDefined: Map<string, string>
): string | null {
    const hasFileName = [...actualToPreDefined.values()].includes(PreDefinedColumn.FILE_NAME);
    if (hasFileName) return null;

    const pathColumn = [...actualToPreDefined.entries()].find(
        ([, predefined]) => predefined === PreDefinedColumn.FILE_PATH
    )?.[0];
    if (!pathColumn) return null;

    return `${getFileNameFromPathExpression(`"${pathColumn}"`)} AS "${PreDefinedColumn.FILE_NAME}"`;
}

export function getUpdateHiddenUIDSQL(tableName: string): string {
    // Altering tables to add primary keys or serially generated columns
    // isn't yet supported in DuckDB, so this does a serially generated
    // column addition manually
    return `
        UPDATE "${tableName}"
        SET "${HIDDEN_UID_ANNOTATION}" = SQ.row
        FROM (
            SELECT "${PreDefinedColumn.FILE_PATH}", ROW_NUMBER() OVER (ORDER BY "${PreDefinedColumn.FILE_PATH}") AS row
            FROM "${tableName}"
        ) AS SQ
        WHERE "${tableName}"."${PreDefinedColumn.FILE_PATH}" = SQ."${PreDefinedColumn.FILE_PATH}";
    `;
}

export function truncateString(str: string, length: number): string {
    return str.length > length
        ? `${str.slice(0, length / 2)}...${str.slice(str.length - length / 2)}`
        : str;
}

export function columnTypeToAnnotationType(columnType: string): AnnotationType {
    switch (columnType) {
        case "INTEGER":
        case "BIGINT":
        // TODO: Add support for column types
        // https://github.com/AllenInstitute/biofile-finder/issues/60
        // return AnnotationType.NUMBER;
        case "VARCHAR":
        case "TEXT":
        default:
            return AnnotationType.STRING;
    }
}
