import * as duckdb from "@duckdb/duckdb-wasm";
import axios from "axios";
import { isEmpty, mapKeys } from "lodash";

import { AICS_FMS_DATA_SOURCE_NAME, HIDDEN_UID_ANNOTATION } from "../../constants";
import Annotation from "../../entity/Annotation";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import { EdgeDefinition } from "../../entity/Graph";
import { Source } from "../../entity/SearchParams";
import SQLBuilder from "../../entity/SQLBuilder";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

enum PreDefinedColumn {
    FILE_ID = "File ID",
    FILE_PATH = "File Path",
    FILE_NAME = "File Name",
    FILE_SIZE = "File Size",
    THUMBNAIL = "Thumbnail",
    UPLOADED = "Uploaded",
}
const PRE_DEFINED_COLUMNS = Object.values(PreDefinedColumn);

// Map each actual column name to the predefined column name when they fuzzy-match.
function getActualToPreDefinedColumnMap(columns: string[]): Map<string, string> {
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
function getFileNameFromPathExpression(quotedPathColumn: string): string {
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

function splitAtTopLevel(input: string): string[] {
    const parts: string[] = [];
    let current = "";
    let depth = 0;

    for (const character of input) {
        if (character === "(") {
            depth += 1;
            current += character;
            continue;
        }

        if (character === ")") {
            depth = Math.max(0, depth - 1);
            current += character;
            continue;
        }

        if (character === "," && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) {
                parts.push(trimmed);
            }
            current = "";
            continue;
        }

        current += character;
    }

    const trimmed = current.trim();
    if (trimmed) {
        parts.push(trimmed);
    }

    return parts;
}

type StructField = {
    name: string;
    typeExpression: string;
};

function parseStructFields(typeExpression: string): StructField[] {
    // const match = typeExpression.match(/^STRUCT\((.*)\)$/i);
    // if (!match) {
    //     console.log("no match")
    //     return [];
    // }

    return splitAtTopLevel(typeExpression.substring("STRUCT(".length, typeExpression.length - 1))
        .map((fieldDef) => {
            const quoted = fieldDef.match(/^"([^"]+)"\s+(.+)$/);
            if (quoted) {
                return {
                    name: quoted[1],
                    typeExpression: quoted[2].trim(),
                };
            }

            const unquoted = fieldDef.match(/^([^\s]+)\s+(.+)$/);
            if (unquoted) {
                return {
                    name: unquoted[1],
                    typeExpression: unquoted[2].trim(),
                };
            }

            return {
                name: "",
                typeExpression: "",
            };
        })
        .filter((field) => field.name.length > 0);
}

function collectNestedStructPaths(typeExpression: string, currentPath: string[] = []): string[][] {
    const fields = parseStructFields(typeExpression);
    if (fields.length === 0) {
        return [];
    }

    return fields.flatMap((field) => {
        const nextPath = [...currentPath, field.name];
        const nestedPaths = collectNestedStructPaths(field.typeExpression, nextPath);
        return nestedPaths.length > 0 ? nestedPaths : [nextPath];
    });
}

/**
 * A discovered sub-field path within a STRUCT[] annotation column, with both the
 * human-readable display path and the DuckDB list expression for extracting values.
 */
interface StructArraySchemaPath {
    displayPath: string;
    /** DuckDB JSONPath (e.g. "$[*].Gene") — kept for JSON VARCHAR fallback / serialization. */
    jsonPath: string;
    /** Native DuckDB list expression using list_transform + flatten. */
    listExpression: string;
}

/**
 * Build a native DuckDB list expression that extracts all values of a leaf field from
 * a STRUCT(...)[] column without converting to JSON.
 *
 * For a column "Well" of type STRUCT(Gene VARCHAR, Dose STRUCT(Unit VARCHAR, Value FLOAT)[])[]
 *   fieldPath ["Gene"]         → `list_transform("Well", __x0 -> __x0."Gene")`
 *   fieldPath ["Dose","Value"] → `flatten(list_transform("Well", __x0 -> list_transform(__x0."Dose", __x1 -> __x1."Value")))`
 *
 * Each nested STRUCT[] traversal adds a `list_transform` layer wrapped in `flatten`.
 */
function buildListTransformExpression(
    columnName: string,
    fieldPath: string[],
    typeExpression: string
): string {
    // Walk the type tree alongside the field path to detect array boundaries.
    let expr = quoteIdentifier(columnName);
    let currentType = typeExpression; // Initially the full STRUCT(...)[] type
    let varIdx = 0;

    // Strip the outer [] since the column itself is already the array we iterate over.
    // currentType holds the element type of the outermost array.
    if (currentType.trimEnd().endsWith("[]")) {
        currentType = currentType.trimEnd().slice(0, -2).trim();
    }

    for (let i = 0; i < fieldPath.length; i++) {
        const fieldName = fieldPath[i];
        const varName = `__x${varIdx++}`;
        const fields = parseStructFields(currentType);
        const field = fields.find((f) => f.name === fieldName);
        const fieldType = field?.typeExpression ?? "";

        if (i === fieldPath.length - 1) {
            // Last segment — just access the field.
            expr = `list_transform(${expr}, ${varName} -> ${varName}.${quoteIdentifier(
                fieldName
            )})`;
        } else {
            // Intermediate segment. Check if it's array-typed (STRUCT(...)[]); if so we need
            // list_transform + flatten at this level.
            const isArrayField = fieldType.trimEnd().endsWith("[]");
            if (isArrayField) {
                // Access the field (returns an array per row), then flatten after the outer transform.
                expr = `list_transform(${expr}, ${varName} -> ${varName}.${quoteIdentifier(
                    fieldName
                )})`;
                expr = `flatten(${expr})`;
                // Advance currentType to the element type of the nested array.
                currentType = fieldType.trimEnd().slice(0, -2).trim();
            } else {
                // Scalar struct — just descend with a single transform wrapping the remainder.
                // For deeper nesting we continue building up the lambda.
                expr = `list_transform(${expr}, ${varName} -> ${varName}.${quoteIdentifier(
                    fieldName
                )})`;
                currentType = fieldType;
            }
            continue;
        }
    }

    return expr;
}

/**
 * Discover all leaf sub-field paths from a STRUCT(...)[] type expression and produce
 * both the human-readable display path, a JSONPath string (for compatibility), and
 * a native DuckDB list expression.
 */
function collectStructArraySchemaPaths(
    columnName: string,
    structArrayType: string
): StructArraySchemaPath[] {
    // The type is e.g. "STRUCT(Gene VARCHAR, Dose STRUCT(...)[])[]"
    // collectNestedStructPaths works on the inner STRUCT(...) without the trailing [].
    const innerType = structArrayType.trimEnd().endsWith("[]")
        ? structArrayType.trimEnd().slice(0, -2).trim()
        : structArrayType;
    const fieldPaths = collectNestedStructPaths(innerType);

    return fieldPaths.map((fieldPath) => {
        const displayPath = fieldPath.join(".");
        // Build a JSONPath for backward compat / serialization.
        // Simple case: "$[*].Gene"; nested arrays: "$[*].Dose[*].Value".
        // We approximate by checking the type tree for array boundaries.
        let jsonSegments = "$[*]";
        let curType = innerType;
        for (const seg of fieldPath) {
            const fields = parseStructFields(curType);
            const f = fields.find((x) => x.name === seg);
            const ft = f?.typeExpression ?? "";
            jsonSegments += `.${seg}`;
            if (ft.trimEnd().endsWith("[]")) {
                jsonSegments += "[*]";
                curType = ft.trimEnd().slice(0, -2).trim();
            } else {
                curType = ft;
            }
        }

        return {
            displayPath,
            jsonPath: jsonSegments,
            listExpression: buildListTransformExpression(columnName, fieldPath, structArrayType),
        };
    });
}

/**
 * A discovered path within an array-of-objects annotation column.
 *
 * `displayPath`  – dot-separated schema key (e.g. "Gene", "Dose.Value").
 * `jsonPath`      – full DuckDB JSONPath string for extracting all matching values
 *                   across every array element (e.g. "$[*].Gene",
 *                   "$[*].Dose[*].Value").
 */
interface JsonSchemaPath {
    displayPath: string;
    jsonPath: string;
}

/**
 * Recursively collect leaf paths from an array-of-objects JSON value, building
 * both a human-readable dot-path and a DuckDB JSONPath expression.
 *
 * Handles arbitrary depth of nested arrays and objects:
 *   [{"Gene":"TP53", "Dose":[{"Unit":"mL","Value":30}]}]
 *     → [{displayPath:"Gene",        jsonPath:"$[*].Gene"},
 *        {displayPath:"Dose.Unit",    jsonPath:"$[*].Dose[*].Unit"},
 *        {displayPath:"Dose.Value",   jsonPath:"$[*].Dose[*].Value"}]
 *
 * @param items     The parsed JSON array to inspect (first element is sampled).
 * @param jsonPrefix JSONPath prefix so far ("$[*]" at the top level).
 * @param displayPrefix dot-path prefix so far ("" at top level).
 */
function collectJsonArraySchemaPaths(
    items: unknown[],
    jsonPrefix = "$[*]",
    displayPrefix = ""
): JsonSchemaPath[] {
    const seen = new Set<string>();
    const paths: JsonSchemaPath[] = [];

    // Merge keys from the first few elements to cover optional fields.
    const sampleElements = items.slice(0, 5);
    for (const elem of sampleElements) {
        if (typeof elem !== "object" || elem === null || Array.isArray(elem)) continue;
        for (const [key, val] of Object.entries(elem as Record<string, unknown>)) {
            const display = displayPrefix ? `${displayPrefix}.${key}` : key;
            const jsonKey = `${jsonPrefix}.${key}`;

            if (Array.isArray(val)) {
                // Nested array — recurse with [*] wildcard
                const sub = collectJsonArraySchemaPaths(val, `${jsonKey}[*]`, display);
                if (sub.length > 0) {
                    for (const p of sub) {
                        if (!seen.has(p.displayPath)) {
                            seen.add(p.displayPath);
                            paths.push(p);
                        }
                    }
                } else {
                    // Array of primitives — the array itself is the leaf
                    if (!seen.has(display)) {
                        seen.add(display);
                        paths.push({ displayPath: display, jsonPath: `${jsonKey}[*]` });
                    }
                }
            } else if (typeof val === "object" && val !== null) {
                // Nested object — recurse without array wildcard
                const sub = collectJsonArraySchemaPaths([val], jsonKey, display);
                if (sub.length > 0) {
                    for (const p of sub) {
                        if (!seen.has(p.displayPath)) {
                            seen.add(p.displayPath);
                            paths.push(p);
                        }
                    }
                } else {
                    if (!seen.has(display)) {
                        seen.add(display);
                        paths.push({ displayPath: display, jsonPath: jsonKey });
                    }
                }
            } else {
                // Primitive leaf
                if (!seen.has(display)) {
                    seen.add(display);
                    paths.push({ displayPath: display, jsonPath: jsonKey });
                }
            }
        }
    }
    return paths;
}

// ---------------------------------------------------------------------------
// Fast Parquet schema reader — extracts column schema directly from the raw
// Parquet footer bytes using a minimal Thrift Binary Protocol parser.
//
// DuckDB's parquet_schema() and DESCRIBE both deserialize the ENTIRE Thrift
// FileMetaData footer, including the row_groups list which scales with
// (num_row_groups × num_columns).  For large files (10M+ rows) this footer
// can be hundreds of MB and take 70+ seconds to parse in WASM.
//
// The schema list, by contrast, is always near the start of the footer and
// is typically < 10 KB.  By reading the raw bytes from the File API and
// parsing only the schema field (stopping before row_groups), we get the
// exact same information in milliseconds.
// ---------------------------------------------------------------------------

// Maps from Parquet Thrift enum ordinals to the string names that
// parseParquetSchemaRows (and parquetPhysicalTypeToDuckDB) expect.
// const PARQUET_PHYSICAL_TYPES: Record<number, string> = {
//     0: "BOOLEAN",
//     1: "INT32",
//     2: "INT64",
//     3: "INT96",
//     4: "FLOAT",
//     5: "DOUBLE",
//     6: "BYTE_ARRAY",
//     7: "FIXED_LEN_BYTE_ARRAY",
// };
// const PARQUET_CONVERTED_TYPES: Record<number, string> = {
//     0: "UTF8",
//     1: "MAP",
//     2: "MAP_KEY_VALUE",
//     3: "LIST",
//     4: "ENUM",
//     5: "DECIMAL",
//     6: "DATE",
//     7: "TIME_MILLIS",
//     8: "TIME_MICROS",
//     9: "TIMESTAMP_MILLIS",
//     10: "TIMESTAMP_MICROS",
//     11: "UINT_8",
//     12: "UINT_16",
//     13: "UINT_32",
//     14: "UINT_64",
//     15: "INT_8",
//     16: "INT_16",
//     17: "INT_32",
//     18: "INT_64",
//     19: "JSON",
//     20: "BSON",
//     21: "INTERVAL",
// };
// const PARQUET_LOGICAL_TYPES: Record<number, string> = {
//     1: "STRING",
//     2: "MAP",
//     3: "LIST",
//     4: "ENUM",
//     5: "DECIMAL",
//     6: "DATE",
//     7: "TIME",
//     8: "TIMESTAMP",
//     10: "INTEGER",
//     11: "UNKNOWN",
//     12: "JSON",
//     13: "BSON",
//     14: "UUID",
// };

// Thrift Compact Protocol type nibble values (low nibble of field header byte / list element type)
// Parquet uses Thrift Compact Protocol — NOT Binary Protocol.
// Compact Protocol differs from Binary in: variable-length zigzag integers, delta-encoded
// field IDs packed with the type nibble in one byte, and combined count/type list headers.
// const THRIFT_COMPACT_STOP = 0;
// const THRIFT_COMPACT_BOOL_TRUE = 1;
// const THRIFT_COMPACT_BOOL_FALSE = 2;
// const THRIFT_COMPACT_BYTE = 3;
// const THRIFT_COMPACT_I16 = 4;
// const THRIFT_COMPACT_I32 = 5;
// const THRIFT_COMPACT_I64 = 6;
// const THRIFT_COMPACT_DOUBLE = 7;
// const THRIFT_COMPACT_BINARY = 8;
// const THRIFT_COMPACT_LIST = 9;
// const THRIFT_COMPACT_SET = 10;
// const THRIFT_COMPACT_MAP = 11;
// const THRIFT_COMPACT_STRUCT = 12;

/**
 * Minimal Thrift Compact Protocol reader — supports only what we need to
 * extract SchemaElement fields from a Parquet FileMetaData footer.
 *
 * Key differences from Binary Protocol:
 *  - Field header: 1 byte encodes both type (low nibble) and field-ID delta (high nibble).
 *    Delta=0 means the full field ID follows as a zigzag varint.
 *  - All integers are variable-length zigzag-encoded varints, not fixed-width.
 *  - List/Set header: 1 byte encodes count (high nibble) and element type (low nibble).
 *    If count >= 15, high nibble is 0xF and the true count follows as a varint.
 *  - Struct field-ID tracking is relative (delta from previous field), so entering a
 *    nested struct requires saving and resetting the running field-ID counter.
 */
// class ThriftCompactReader {
//     private readonly bytes: Uint8Array;
//     private pos: number;
//     // Running field ID within the current struct level (delta-encoded per Compact spec)
//     private lastFieldId = 0;
//     // Stack for nested struct contexts
//     private readonly fieldIdStack: number[] = [];

//     constructor(buffer: ArrayBuffer, offset = 0) {
//         this.bytes = new Uint8Array(buffer);
//         this.pos = offset;
//     }

//     readByte(): number {
//         return this.bytes[this.pos++];
//     }

//     /** Read an unsigned base-128 varint. */
//     readVarint(): number {
//         let result = 0;
//         let shift = 0;
//         let b: number;
//         do {
//             b = this.readByte();
//             result |= (b & 0x7f) << shift;
//             shift += 7;
//         } while (b & 0x80);
//         return result;
//     }

//     /** Read a zigzag-encoded signed integer (used for all integer fields in Compact). */
//     private readZigzag(): number {
//         const v = this.readVarint();
//         return (v >>> 1) ^ -(v & 1);
//     }

//     readI32(): number {
//         return this.readZigzag();
//     }

//     readString(): string {
//         const len = this.readVarint();
//         const s = new TextDecoder().decode(this.bytes.subarray(this.pos, this.pos + len));
//         this.pos += len;
//         return s;
//     }

//     /**
//      * Read a Compact Protocol field header.
//      * Returns null on STOP (0x00).
//      * Updates the running lastFieldId used for delta decoding.
//      */
//     readFieldHeader(): { type: number; id: number } | null {
//         const byte = this.readByte();
//         if (byte === THRIFT_COMPACT_STOP) return null;
//         const type = byte & 0x0f;
//         const delta = (byte >> 4) & 0x0f;
//         if (delta === 0) {
//             // Long form: full field ID follows as zigzag int
//             this.lastFieldId = this.readZigzag();
//         } else {
//             this.lastFieldId += delta;
//         }
//         return { type, id: this.lastFieldId };
//     }

//     /** Save current struct field-ID context and reset for a nested struct. */
//     enterStruct(): void {
//         this.fieldIdStack.push(this.lastFieldId);
//         this.lastFieldId = 0;
//     }

//     /** Restore struct field-ID context after reading a nested struct's STOP byte. */
//     exitStruct(): void {
//         this.lastFieldId = this.fieldIdStack.pop() ?? 0;
//     }

//     skipValue(type: number): void {
//         switch (type) {
//             case THRIFT_COMPACT_BOOL_TRUE:
//             case THRIFT_COMPACT_BOOL_FALSE:
//                 break; // value is encoded in the type nibble itself — no extra bytes
//             case THRIFT_COMPACT_BYTE:
//                 this.pos++;
//                 break;
//             case THRIFT_COMPACT_I16:
//             case THRIFT_COMPACT_I32:
//             case THRIFT_COMPACT_I64:
//                 // Skip variable-length varint
//                 while (this.bytes[this.pos++] & 0x80);
//                 break;
//             case THRIFT_COMPACT_DOUBLE:
//                 this.pos += 8;
//                 break;
//             case THRIFT_COMPACT_BINARY: {
//                 const len = this.readVarint();
//                 this.pos += len;
//                 break;
//             }
//             case THRIFT_COMPACT_STRUCT:
//                 this.skipStruct();
//                 break;
//             case THRIFT_COMPACT_LIST:
//             case THRIFT_COMPACT_SET: {
//                 // List header byte: high nibble = count (0-14) or 0xF (count follows as varint)
//                 const h = this.readByte();
//                 const count = (h >> 4) === 0xf ? this.readVarint() : (h >> 4);
//                 const et = h & 0x0f;
//                 for (let i = 0; i < count; i++) this.skipValue(et);
//                 break;
//             }
//             case THRIFT_COMPACT_MAP: {
//                 const count = this.readVarint();
//                 if (count > 0) {
//                     const tb = this.readByte();
//                     const kt = (tb >> 4) & 0x0f;
//                     const vt = tb & 0x0f;
//                     for (let i = 0; i < count; i++) {
//                         this.skipValue(kt);
//                         this.skipValue(vt);
//                     }
//                 }
//                 break;
//             }
//         }
//     }

//     private skipStruct(): void {
//         this.enterStruct();
//         for (let f = this.readFieldHeader(); f !== null; f = this.readFieldHeader()) {
//             this.skipValue(f.type);
//         }
//         this.exitStruct();
//     }
// }

// interface ParquetSchemaRow {
//     name: string;
//     type: string | null;
//     num_children: number;
//     converted_type: string | null;
//     logical_type: string | null;
// }

/** Parse a Thrift-encoded Parquet LogicalType union, returning just the variant name. */
// function readLogicalType(reader: ThriftCompactReader): string | null {
//     let result: string | null = null;
//     // LogicalType is a nested struct — enter its field-ID context
//     reader.enterStruct();
//     for (let f = reader.readFieldHeader(); f !== null; f = reader.readFieldHeader()) {
//         result = PARQUET_LOGICAL_TYPES[f.id] ?? null;
//         reader.skipValue(f.type); // skip the inner variant struct (e.g. StringType = empty struct)
//     }
//     reader.exitStruct();
//     return result;
// }

/** Parse a single Thrift-encoded SchemaElement struct. */
// function readSchemaElement(reader: ThriftCompactReader): ParquetSchemaRow {
//     let type: string | null = null;
//     let name = "";
//     let numChildren = 0;
//     let convertedType: string | null = null;
//     let logicalType: string | null = null;

//     for (let f = reader.readFieldHeader(); f !== null; f = reader.readFieldHeader()) {
//         switch (f.id) {
//             case 1: // type — Parquet physical type enum (i32)
//                 type = PARQUET_PHYSICAL_TYPES[reader.readI32()] ?? null;
//                 break;
//             case 4: // name — column / field name
//                 name = reader.readString();
//                 break;
//             case 5: // num_children
//                 numChildren = reader.readI32();
//                 break;
//             case 6: // converted_type enum (i32)
//                 convertedType = PARQUET_CONVERTED_TYPES[reader.readI32()] ?? null;
//                 break;
//             case 10: // logicalType (LogicalType union — encoded as a struct)
//                 logicalType = readLogicalType(reader);
//                 break;
//             default:
//                 reader.skipValue(f.type);
//                 break;
//         }
//     }
//     return {
//         name,
//         type,
//         num_children: numChildren,
//         converted_type: convertedType,
//         logical_type: logicalType,
//     };
// }

/**
 * Read the Parquet schema directly from a File's raw bytes.
 *
 * Only reads the last 8 bytes (footer length) plus enough of the footer to
 * cover the schema list.  Stops parsing before the row_groups field, which
 * is typically orders of magnitude larger than the schema.
 */
// async function readParquetSchemaFromFile(file: File): Promise<ParquetSchemaRow[]> {
//     const fileSize = file.size;
//     if (fileSize < 12) throw new Error("File too small to be a valid Parquet file");

//     // 1. Read footer length + magic from last 8 bytes
//     const tailBuf = await file.slice(fileSize - 8, fileSize).arrayBuffer();
//     const tailView = new DataView(tailBuf);
//     const footerLength = tailView.getInt32(0, true); // little-endian

//     // Validate PAR1 magic
//     const magic = new Uint8Array(tailBuf, 4, 4);
//     if (magic[0] !== 0x50 || magic[1] !== 0x41 || magic[2] !== 0x52 || magic[3] !== 0x31) {
//         throw new Error("Not a valid Parquet file (missing PAR1 magic)");
//     }

//     // 2. Read enough of the footer for the schema.
//     //    The schema is field 2 of FileMetaData, right after field 1 (version, 7 bytes).
//     //    Even for thousands of columns the schema is rarely > 1 MB.
//     //    Reading 4 MB covers any realistic schema.
//     const footerStart = fileSize - 8 - footerLength;
//     const readSize = Math.min(footerLength, 4 * 1024 * 1024);
//     const footerBuf = await file.slice(footerStart, footerStart + readSize).arrayBuffer();

//     // 3. Parse Thrift FileMetaData — extract only the schema field (id=2)
//     const reader = new ThriftCompactReader(footerBuf);
//     const schemaElements: ParquetSchemaRow[] = [];

//     for (let fld = reader.readFieldHeader(); fld !== null; fld = reader.readFieldHeader()) {
//         if (fld.id === 2 && fld.type === THRIFT_COMPACT_LIST) {
//             // Field 2: list<SchemaElement>
//             // Compact list header: 1 byte where high nibble = count (or 0xF = count follows)
//             // and low nibble = element type (12 = STRUCT for SchemaElement)
//             const h = reader.readByte();
//             const count = (h >> 4) === 0xf ? reader.readVarint() : (h >> 4);
//             for (let i = 0; i < count; i++) {
//                 reader.enterStruct();
//                 schemaElements.push(readSchemaElement(reader));
//                 reader.exitStruct();
//             }
//             break; // Schema extracted — skip row_groups and everything after
//         }
//         reader.skipValue(fld.type);
//     }

//     return schemaElements;
// }

// /**
//  * Fetch just the Parquet footer from an HTTP/HTTPS URL using Range requests and extract
//  * the schema — fast alternative to letting DuckDB read the entire file.
//  * Throws if the server does not support Range requests or the URL is not HTTP(S).
//  */
// async function readParquetSchemaFromUrl(url: string): Promise<ParquetSchemaRow[]> {
//     // 1. Determine file size via HEAD request (Content-Length).
//     //    More reliable than parsing the total from a suffix-range Content-Range
//     //    header, which some servers return as "bytes 0-7/*" (unknown total).
//     let totalSize: number;
//     const headResp = await fetch(url, { method: "HEAD" });
//     if (headResp.ok) {
//         const cl = headResp.headers.get("Content-Length");
//         totalSize = cl ? parseInt(cl, 10) : NaN;
//     } else {
//         totalSize = NaN;
//     }

//     // 2. Fetch last 8 bytes: footer length (int32 LE) + PAR1 magic.
//     let tailBuf: ArrayBuffer;
//     if (!isNaN(totalSize) && totalSize >= 12) {
//         // Explicit range — works even when Content-Range omits the total size.
//         const tailResp = await fetch(url, {
//             headers: { Range: `bytes=${totalSize - 8}-${totalSize - 1}` },
//         });
//         if (tailResp.status !== 206 && tailResp.status !== 200) {
//             throw new Error(
//                 `Server returned ${tailResp.status}; Range requests not supported`
//             );
//         }
//         tailBuf = await tailResp.arrayBuffer();
//     } else {
//         // Fallback: suffix-range and recover total size from Content-Range.
//         const tailResp = await fetch(url, { headers: { Range: "bytes=-8" } });
//         if (tailResp.status !== 206) {
//             throw new Error(
//                 `Server returned ${tailResp.status} (expected 206); Range requests not supported`
//             );
//         }
//         const contentRange = tailResp.headers.get("Content-Range"); // "bytes X-Y/Z"
//         const parsed = contentRange ? parseInt(contentRange.split("/")[1], 10) : NaN;
//         if (isNaN(parsed) || parsed < 12) {
//             throw new Error(
//                 "Could not determine Parquet file size (HEAD gave no Content-Length " +
//                     "and Range response gave no Content-Range total)"
//             );
//         }
//         totalSize = parsed;
//         tailBuf = await tailResp.arrayBuffer();
//     }
//     if (tailBuf.byteLength < 8) throw new Error("Incomplete response for Parquet footer tail");

//     const tailView = new DataView(tailBuf);
//     const footerLength = tailView.getInt32(0, true); // little-endian
//     const magic = new Uint8Array(tailBuf, 4, 4);
//     if (magic[0] !== 0x50 || magic[1] !== 0x41 || magic[2] !== 0x52 || magic[3] !== 0x31) {
//         throw new Error("Not a valid Parquet file (missing PAR1 magic)");
//     }

//     // 3. Fetch enough of the footer to cover the schema (field 2 of FileMetaData).
//     const footerStart = totalSize - 8 - footerLength;
//     const readSize = Math.min(footerLength, 4 * 1024 * 1024);
//     const footerEnd = footerStart + readSize - 1;
//     const footerResp = await fetch(url, { headers: { Range: `bytes=${footerStart}-${footerEnd}` } });
//     if (footerResp.status !== 206) {
//         throw new Error("Failed to fetch Parquet footer bytes from URL");
//     }
//     const footerBuf = await footerResp.arrayBuffer();

//     // 3. Parse Thrift FileMetaData — same logic as readParquetSchemaFromFile.
//     const reader = new ThriftCompactReader(footerBuf);
//     const schemaElements: ParquetSchemaRow[] = [];

//     for (let fld = reader.readFieldHeader(); fld !== null; fld = reader.readFieldHeader()) {
//         if (fld.id === 2 && fld.type === THRIFT_COMPACT_LIST) {
//             const h = reader.readByte();
//             const count = (h >> 4) === 0xf ? reader.readVarint() : (h >> 4);
//             for (let i = 0; i < count; i++) {
//                 reader.enterStruct();
//                 schemaElements.push(readSchemaElement(reader));
//                 reader.exitStruct();
//             }
//             break;
//         }
//         reader.skipValue(fld.type);
//     }

//     return schemaElements;
// }

/**
 * Map a Parquet leaf-node physical type to a DuckDB type string.
 * Only called for leaf nodes (num_children === 0) from parseParquetSchemaRows.
 */
function parquetPhysicalTypeToDuckDB(
    physicalType: string | null,
    logicalType: string | null,
    convertedType: string | null
): string {
    const lt = (logicalType ?? "").toLowerCase();
    const ct = (convertedType ?? "").toUpperCase();
    switch (physicalType) {
        case "BYTE_ARRAY":
            if (lt === "string" || lt === "json" || ct === "UTF8" || ct === "JSON" || ct === "ENUM")
                return "VARCHAR";
            return "BLOB";
        case "FIXED_LEN_BYTE_ARRAY":
            if (lt === "uuid") return "UUID";
            if (lt.startsWith("decimal") || ct === "DECIMAL") return "DECIMAL";
            return "BLOB";
        case "INT32":
            if (lt === "date" || ct === "DATE") return "DATE";
            if (lt.startsWith("time")) return "TIME";
            if (lt.startsWith("decimal") || ct === "DECIMAL") return "DECIMAL";
            return "INTEGER";
        case "INT64":
            if (
                lt.startsWith("timestamp") ||
                ct === "TIMESTAMP_MILLIS" ||
                ct === "TIMESTAMP_MICROS"
            )
                return "TIMESTAMP";
            if (lt.startsWith("time")) return "TIME";
            if (lt.startsWith("decimal") || ct === "DECIMAL") return "DECIMAL";
            return "BIGINT";
        case "INT96":
            return "TIMESTAMP";
        case "FLOAT":
            return "FLOAT";
        case "DOUBLE":
            return "DOUBLE";
        case "BOOLEAN":
            return "BOOLEAN";
        default:
            return "VARCHAR"; // safe fallback
    }
}

/**
 * Convert the flat DFS output of `parquet_schema('file')` into
 * `{ column_name, column_type }[]` matching the format returned by DESCRIBE.
 *
 * parquet_schema() reads only the schema section of the Parquet footer.  It does NOT
 * read row-group statistics, which scale with (num_row_groups × num_columns) and can
 * make the footer very large for files with many small row groups — causing DESCRIBE
 * to be orders of magnitude slower on such files.
 */
function parseParquetSchemaRows(
    rows: Array<{
        name: string;
        type: string | null;
        num_children: number;
        converted_type: string | null;
        logical_type: string | null;
    }>
): Array<{ column_name: string; column_type: string }> {
    if (rows.length === 0) return [];
    // Row 0 is the root schema element (name "duckdb_schema"); top-level columns start at 1.
    const rootNumChildren = Number(rows[0].num_children);
    const result: Array<{ column_name: string; column_type: string }> = [];

    // Recursive DFS parser.  Consumes the flat list using num_children counts.
    // Returns [duckDBTypeString, nextIndex].
    const parseNode = (index: number): [string, number] => {
        const row = rows[index];
        const numChildren = Number(row.num_children);

        if (numChildren === 0) {
            // Leaf node — map Parquet physical type to a DuckDB type string.
            return [
                parquetPhysicalTypeToDuckDB(row.type, row.logical_type, row.converted_type),
                index + 1,
            ];
        }

        const lt = (row.logical_type ?? "").toLowerCase();
        const ct = (row.converted_type ?? "").toUpperCase();

        if (lt.startsWith("list") || ct === "LIST") {
            // Standard 3-level Parquet LIST encoding:
            //   outer (logical_type=List, num_children=1)
            //     intermediate (REPEATED group, num_children=1)   ← skip
            //       item (the actual element type)
            const itemIdx = index + 2; // skip outer and the intermediate node
            const [itemType, nextIdx] = parseNode(itemIdx);
            return [`${itemType}[]`, nextIdx];
        }

        if (lt === "map" || ct === "MAP" || ct === "MAP_KEY_VALUE") {
            // Standard MAP: outer(Map) → key_value(REPEATED, 2 children) → key, value.
            const keyIdx = index + 2; // skip outer and key_value intermediate
            const [keyType, valueIdx] = parseNode(keyIdx);
            const [valueType, nextIdx] = parseNode(valueIdx);
            return [`MAP(${keyType}, ${valueType})`, nextIdx];
        }

        // STRUCT: named group node with typed fields.
        const fields: string[] = [];
        let curIdx = index + 1;
        for (let i = 0; i < numChildren; i++) {
            const fieldName = rows[curIdx].name;
            const [fieldType, nextIdx] = parseNode(curIdx);
            fields.push(`"${fieldName}" ${fieldType}`);
            curIdx = nextIdx;
        }
        return [`STRUCT(${fields.join(", ")})`, curIdx];
    };

    let idx = 1;
    for (let i = 0; i < rootNumChildren; i++) {
        const colName = rows[idx].name;
        const [colType, nextIdx] = parseNode(idx);
        result.push({ column_name: colName, column_type: colType });
        idx = nextIdx;
    }
    return result;
}

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replaceAll('"', '""')}"`;
}

function buildStructExtractExpression(columnName: string, fieldPath: string[]): string {
    return fieldPath.reduce(
        (expr, fieldName) => `${expr}.${quoteIdentifier(fieldName)}`,
        quoteIdentifier(columnName)
    );
}

export function getParquetNestedMetadataSelectParts(
    describedColumns: Array<{ column_name: string; data_type: string }>
): string[] {
    const nestedSelectParts: string[] = [];

    for (const row of describedColumns) {
        const nestedFieldPaths = collectNestedStructPaths(row.data_type || "");
        for (const fieldPath of nestedFieldPaths) {
            const alias = quoteIdentifier(`${row.column_name}.${fieldPath.join(".")}`);
            const fieldExpression = buildStructExtractExpression(row.column_name, fieldPath);
            nestedSelectParts.push(`CAST(${fieldExpression} AS VARCHAR) AS ${alias}`);
        }
    }

    return nestedSelectParts;
}

/**
 * Service reponsible for querying against a database
 */
export default abstract class DatabaseService {
    // TODO: use
    public static readonly GROUP_DELIMITER = ".";
    public static readonly LIST_DELIMITER = ",";
    protected readonly SOURCE_PROVENANCE_TABLE = "source_provenance";
    private static readonly ANNOTATION_TYPE_SET = new Set(Object.values(AnnotationType));
    protected sourceMetadataName?: string;
    public sourceProvenanceName?: string;
    private currentAggregateSource?: string;
    // Initialize with AICS FMS data source name to pretend it always exists
    protected readonly existingDataSources = new Set([AICS_FMS_DATA_SOURCE_NAME]);
    protected readonly dataSourceToAnnotationsMap: Map<string, Annotation[]> = new Map();
    private readonly dataSourceToProvenanceMap: Map<string, EdgeDefinition[]> = new Map();
    // Data source names that are views (parquet), so we DROP VIEW on delete
    private readonly parquetDirectViewNames = new Set<string>();

    protected database: duckdb.AsyncDuckDB | undefined;

    constructor() {
        this.addDataSource = this.addDataSource.bind(this);
        this.execute = this.execute.bind(this);
        this.query = this.query.bind(this);
    }

    public async saveQuery(
        destination: string,
        sql: string,
        format: "parquet" | "csv" | "json"
    ): Promise<Uint8Array> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        const resultName = `${destination}.${format}`;
        const formatOptions = format === "json" ? ", ARRAY true" : "";
        const finalSQL = `COPY (${sql}) TO '${resultName}' (FORMAT '${format}'${formatOptions});`;
        const connection = await this.database.connect();
        try {
            await connection.send(finalSQL);
            return await this.database.copyFileToBuffer(resultName);
        } finally {
            await connection.close();
        }
    }

    public query(
        sql: string
    ): { promise: Promise<{ [key: string]: any }[]>; cancel?: (reason?: string) => void } {
        return { promise: this.runQuery(sql) };
    }

    private async runQuery(sql: string): Promise<{ [key: string]: any }[]> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        const start = Date.now();
        const connection = await this.database?.connect();
        try {
            const result = await connection.query(sql);

            // Apache Arrow JS (used by duckdb-wasm) only reads the first 8 bytes, losing the nanoseconds.
            // Re-run with INTERVAL columns cast to ms integers so the data survives Arrow.
            const intervalColumns = result.schema.fields
                .filter((f) => f.typeId === 11) // Arrow Type.Interval
                .map((f) => f.name);
            const queryResult =
                intervalColumns.length > 0
                    ? await connection.query(
                          `SELECT ${result.schema.fields
                              .map((f) =>
                                  intervalColumns.includes(f.name)
                                      ? `CAST(EXTRACT(epoch FROM "${f.name}") * 1000 AS BIGINT) AS "${f.name}"`
                                      : `"${f.name}"`
                              )
                              .join(", ")} FROM (${sql})`
                      )
                    : result;

            const resultAsArray = queryResult.toArray();
            const resultAsJSONString = JSON.stringify(
                resultAsArray,
                (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
            );
            return JSON.parse(resultAsJSONString);
        } catch (err) {
            throw new Error(
                `${(err as Error).message}. \nThe above error occured while executing query: ${sql}`
            );
        } finally {
            await connection.close();
            const end = Date.now();
            if (end - start >= 30_000) {
                console.error(
                    `Very slow query: Query executed in ${(end - start) / 1000}s: ${sql}`
                );
            } else if (end - start >= 15_000) {
                console.error(`Slow query: Query executed in ${(end - start) / 1000}s: ${sql}`);
            } else if (end - start >= 2_500) {
                console.warn(
                    `Slightly slow query: Query executed in ${(end - start) / 1000}s: ${sql}`
                );
            }
            // console.log(`Query executed in ${end - start}ms: ${sql.substring(0, 100)}...`);
        }
    }

    public close(): void {
        this.database?.detach();
    }

    protected async addDataSource(
        name: string,
        type: "csv" | "json" | "parquet",
        uri: string | File
    ): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }

        if (uri instanceof File) {
            await this.database.registerFileHandle(
                name,
                uri,
                duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
                true
            );
        } else {
            const protocol = uri.startsWith("s3")
                ? duckdb.DuckDBDataProtocol.S3
                : duckdb.DuckDBDataProtocol.HTTP;

            await this.database.registerFileURL(name, uri, protocol, false);
        }

        if (type === "parquet") {
            await this.createParquetDirectView(name);
        } else if (type === "json") {
            await this.execute(`CREATE TABLE "${name}" AS FROM read_json_auto('${name}');`);
        } else {
            // Default to CSV. Use sample_size=-1 to scan the full file before deciding column
            // types, eliminating "first N rows look numeric, later rows have strings" failures.
            // Fall back to all_varchar=true if type inference fails (e.g. truly mixed-type column)
            // so the file always loads successfully.
            try {
                await this.execute(
                    `CREATE TABLE "${name}" AS FROM read_csv_auto('${name}', header=true, sample_size=-1);`
                );
            } catch {
                console.warn(
                    `Failed to infer column types for CSV "${name}"; falling back to all_varchar=true. All columns will be loaded as strings.`
                );
                await this.execute(`DROP TABLE IF EXISTS "${name}"`);
                await this.execute(
                    `CREATE TABLE "${name}" AS FROM read_csv_auto('${name}', header=true, all_varchar=true);`
                );
            }
        }
    }

    public async execute(sql: string): Promise<void> {
        if (!this.database) {
            throw new Error("Database failed to initialize");
        }
        const start = Date.now();

        const connection = await this.database.connect();
        try {
            await connection.query(sql);
        } finally {
            await connection.close();
            const end = Date.now();
            if (end - start >= 30_000) {
                console.error(`Very slow query: SQL executed in ${(end - start) / 1000}s: ${sql}`);
            } else if (end - start >= 15_000) {
                console.error(`Slow query: SQL executed in ${(end - start) / 1000}s: ${sql}`);
            } else if (end - start >= 2_500) {
                console.warn(
                    `Slightly slow query: SQL executed in ${(end - start) / 1000}s: ${sql}`
                );
            }
        }
    }

    protected static columnTypeToAnnotationType(columnType: string): AnnotationType {
        // DECIMAL types include precision/scale info, e.g. "DECIMAL(18,3)"
        if (columnType?.startsWith("DECIMAL")) {
            return AnnotationType.NUMBER;
        }
        switch (columnType) {
            case "INTEGER":
            case "BIGINT":
            case "HUGEINT":
            case "UBIGINT":
            case "UINTEGER":
            case "SMALLINT":
            case "USMALLINT":
            case "TINYINT":
            case "UTINYINT":
            case "FLOAT":
            case "DOUBLE":
            case "REAL":
                return AnnotationType.NUMBER;
            case "BOOLEAN":
                return AnnotationType.BOOLEAN;
            case "INTERVAL":
                return AnnotationType.DURATION;
            case "DATE":
                return AnnotationType.DATE;
            case "TIMESTAMP":
            case "TIMESTAMPTZ":
            case "TIMESTAMP WITH TIME ZONE":
                return AnnotationType.DATETIME;
            case "VARCHAR":
            case "TEXT":
            default:
                return AnnotationType.STRING;
        }
    }

    private static truncateString(str: string, length: number): string {
        return str.length > length
            ? `${str.slice(0, length / 2)}...${str.slice(str.length - length / 2)}`
            : str;
    }

    public hasDataSource(dataSourceName: string): boolean {
        return this.existingDataSources.has(dataSourceName);
    }

    public hasAggregateSource(dataSourceNames: string[]): boolean {
        const combinedName = DatabaseService.combineSourceNames(dataSourceNames);
        return this.currentAggregateSource === combinedName;
    }

    public async prepareDataSources(
        dataSources: Source[],
        skipNormalization = false
    ): Promise<void> {
        await Promise.all(
            dataSources
                .filter((dataSource) => !this.hasDataSource(dataSource.name))
                .map((dataSource) => this.prepareDataSourceWrapper(dataSource, skipNormalization))
        );

        // Because when querying multiple data sources column differences can complicate the queries
        // preparing a table ahead of time that is the aggregate of the data sources is most optimal
        // should look toward some way of reducing the memory footprint if that becomes an issue
        if (dataSources.length > 1) {
            await this.aggregateDataSources(dataSources);
        }
    }

    private async prepareDataSourceWrapper(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        const { name, type, uri } = dataSource;

        if (!type || !uri) {
            throw new DataSourcePreparationError(
                `Lost access to data source "${name}".\
                </br> \
                Local data sources must be re-uploaded with each \
                page refresh to gain access to the data source file \
                on your computer. \
                To avoid this, consider using cloud storage for the \
                file and sharing the URL.`,
                name
            );
        }

        try {
            await this.prepareDataSource(dataSource, skipNormalization);
        } catch (err) {
            let formattedError = (err as Error).message;
            // DuckDB does not provide informative server errors, so send a
            // separate 'get' call to retrieve error messages for URL data sources
            if (!(uri instanceof File)) {
                await axios.get(uri).catch((error) => {
                    // Error responses can be formatted differently
                    // Get progressively less specific in where we look for the message
                    if (error?.response) {
                        formattedError = `Request failed with status ${error.response.status}: ${
                            error.response?.data?.error ||
                            error.response?.data?.message ||
                            error.response?.statusText ||
                            error.response.data
                        }`;
                    } else if (axios.isAxiosError(error) && error.request && !error.response) {
                        // A request was made but no response was received — this is the
                        // hallmark of a CORS (Cross-Origin Resource Sharing) error in browsers,
                        // where the server does not allow cross-origin requests.
                        // TODO: Update this once user guide is complete:
                        // https://github.com/AllenInstitute/biofile-finder/issues/723
                        formattedError =
                            `This is likely caused by CORS restrictions. ` +
                            `The server hosting the data source may not be configured to allow ` +
                            `requests from this application. For help resolving this, please visit our ` +
                            `support forum.`;
                    } else if (error?.message) {
                        formattedError = error.message;
                    } // else use default error message
                });
            }
            await this.deleteDataSource(name);
            throw new DataSourcePreparationError(formattedError, name);
        }
    }

    protected async prepareDataSource(
        dataSource: Source,
        skipNormalization: boolean
    ): Promise<void> {
        const { name, type, uri } = dataSource;

        if (!type || !uri) {
            throw new DataSourcePreparationError(
                `Lost access to data source "${name}".\
                </br> \
                Local data sources must be re-uploaded with each \
                page refresh to gain access to the data source file \
                on your computer. \
                To avoid this, consider using cloud storage for the \
                file and sharing the URL.`,
                name
            );
        }
        // Add the data source as a table on the database
        await this.addDataSource(name, type, uri);

        // Add data source name to in-memory set
        // for quick data source checks
        this.existingDataSources.add(name);

        // Unless skipped, this will ensure the table is prepared
        // for querying with the expected columns & uniqueness constraints
        if (!skipNormalization) {
            if (type !== "parquet") {
                await this.normalizeDataSourceColumnNames(name);
                await this.renameNonprintableCharColumns(name);
            }

            const error = await this.checkDataSourceForErrors(name);
            if (error !== null) {
                throw new DataSourcePreparationError(error, name);
            }

            if (type !== "parquet") {
                await this.addRequiredColumns(name);
            }
        }
    }

    public async prepareSourceMetadata(sourceMetadata: Source): Promise<void> {
        const isPreviousSource = sourceMetadata.name === this.sourceMetadataName;
        if (isPreviousSource && this.hasDataSource(sourceMetadata.name)) {
            return;
        }
        // If the metadata source is being replaced, delete the old instance before preparing the new one
        if (sourceMetadata.uri) {
            await this.deleteSourceMetadata();
            // Make sure we don't still have a cached version of the metadata source
            if (!this.hasDataSource(sourceMetadata.name)) {
                await this.prepareDataSourceWrapper(
                    {
                        ...sourceMetadata,
                        name: sourceMetadata.name,
                    },
                    true
                );
            }
        }
        // If the source doesn't have a uri, we should instead try to use the cached table
        this.sourceMetadataName = sourceMetadata.name;
    }

    private async prepareSourceProvenance(sourceProvenance: Source): Promise<void> {
        const isPreviousSource = sourceProvenance.name === this.sourceProvenanceName;
        if (isPreviousSource) {
            return;
        }
        await this.deleteSourceProvenance();
        await this.prepareDataSourceWrapper(
            {
                ...sourceProvenance,
                name: this.SOURCE_PROVENANCE_TABLE,
            },
            true
        );
        this.sourceProvenanceName = sourceProvenance.name;
    }

    public async deleteSourceProvenance(): Promise<void> {
        if (this.sourceProvenanceName) {
            await this.deleteDataSource(this.SOURCE_PROVENANCE_TABLE);
            this.dataSourceToProvenanceMap.clear();
            this.sourceProvenanceName = undefined;
        }
    }

    public async deleteSourceMetadata(): Promise<void> {
        // Avoid trying to delete a file that doesn't exist
        if (this.sourceMetadataName) await this.deleteDataSource(this.sourceMetadataName);
        this.dataSourceToAnnotationsMap.clear();
    }

    protected async deleteDataSource(dataSource: string): Promise<void> {
        this.existingDataSources.delete(dataSource);
        this.dataSourceToAnnotationsMap.delete(dataSource);
        if (this.parquetDirectViewNames.has(dataSource)) {
            this.parquetDirectViewNames.delete(dataSource);
            await this.execute(`DROP VIEW IF EXISTS "${dataSource}"`);
        } else {
            await this.execute(`DROP TABLE IF EXISTS "${dataSource}"`);
        }
    }

    /*
        This ensures we have the columns necessary for the application to function
        MUST come after we check for errors so that we can rely on the table
        to at least be valid before modifying it further
    */
    private async addRequiredColumns(name: string): Promise<void> {
        const commandsToExecute = [
            // Add hidden UID column to uniquely identify rows
            `
                ALTER TABLE "${name}"
                ADD COLUMN ${HIDDEN_UID_ANNOTATION} INT
            `,
            this.getUpdateHiddenUIDSQL(name),
            // CSV type inference may produce non-VARCHAR "File Path" (e.g. all-numeric values
            // inferred as BIGINT). Coerce to VARCHAR so regex-based operations succeed.
            `ALTER TABLE "${name}" ALTER COLUMN "${PreDefinedColumn.FILE_PATH}" TYPE VARCHAR`,
        ];

        const dataSourceColumns = await this.getColumnsOnDataSource(name);

        /**
         * First checks if a "File Name" already exists,
         * then makes best shot attempt at auto-generating a "File Name"
         * from the "File Path", then defaults to full path if this fails.
         */
        const fileNameGenerationSQL = `
                UPDATE "${name}"
                SET "${PreDefinedColumn.FILE_NAME}" = COALESCE(
                    "${PreDefinedColumn.FILE_NAME}",
                    ${getFileNameFromPathExpression(`"${PreDefinedColumn.FILE_PATH}"`)}
                );`;
        if (!dataSourceColumns.has(PreDefinedColumn.FILE_NAME)) {
            commandsToExecute.push(`
                ALTER TABLE "${name}"
                ADD COLUMN "${PreDefinedColumn.FILE_NAME}" VARCHAR;
            `);
            commandsToExecute.push(fileNameGenerationSQL);
        } else {
            // CSV type inference may have produced a non-VARCHAR "File Name" column (e.g. if
            // all values happen to look numeric). Coerce to VARCHAR so the COALESCE update and
            // TRIM-based blank checks don't hit a type mismatch.
            commandsToExecute.push(
                `ALTER TABLE "${name}" ALTER COLUMN "${PreDefinedColumn.FILE_NAME}" TYPE VARCHAR`
            );
            // Check for any blank "File Name" rows
            const { totalCount: blankFileNameCount } = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_NAME
            );
            // Some or all of the files need autogenerated names
            if (blankFileNameCount > 0) {
                commandsToExecute.push(fileNameGenerationSQL);
            }
        }

        await this.execute(commandsToExecute.join("; "));

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(name);
    }

    private getUpdateHiddenUIDSQL(tableName: string): string {
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

    /*
        Checks the data source for unexpected formatting or issues in
        the expectations around uniqueness/blankness for pre-defined columns
        like "File Path", "File ID", etc.
    */
    private async checkDataSourceForErrors(name: string): Promise<string | null> {
        const columnsOnTable = await this.getColumnsOnDataSource(name);

        // Double quotes in column names should not be allowed because of injection concerns
        const columns = Array.from(columnsOnTable);
        const columnsWithDoubleQuotes = columns.filter((col) => /"/.test(col));
        if (columnsWithDoubleQuotes.length > 0) {
            return `Found column names with disallowed double quote characters ("): ${columnsWithDoubleQuotes.join(
                ", "
            )}. 
                Please rename these columns and try again.`;
        }

        if (!columnsOnTable.has(PreDefinedColumn.FILE_PATH)) {
            let error = `"${PreDefinedColumn.FILE_PATH}" column is missing in the data source.
                Check the data source header row for a "${PreDefinedColumn.FILE_PATH}" column name and try again.`;

            // Attempt to find a column with a similar name to "File Path"
            const filePathLikeColumn =
                columns.find((column) => column.toLowerCase().includes("path")) ||
                columns.find((column) => column.toLowerCase().includes("file"));
            if (filePathLikeColumn) {
                error += ` Found a column with a similar name: "${filePathLikeColumn}".`;
            }

            // Unable to determine if the file path is empty or not
            // when it is not present so return here before checking
            // for other errors
            return error;
        } else {
            // For large parquet tables, attempt to bypass the expensive
            // getRowsWhereColumnIsBlank query.
            if (
                this.parquetDirectViewNames.has(name) &&
                (await this.totalRowCount(name)) > 500000
            ) {
                const originalColumn = await this.getOriginalParquetColumnName(
                    name,
                    PreDefinedColumn.FILE_PATH
                );
                if (originalColumn !== null) {
                    const hasBlankValues = await this.parquetHasBlankValues(name, originalColumn);
                    if (hasBlankValues !== null) {
                        if (hasBlankValues) {
                            return `"${PreDefinedColumn.FILE_PATH}" column contains some empty or purely whitespace paths.`;
                        } else {
                            return null;
                        }
                    }
                    // If blankFilePathRowGroups is null, we don't have enough
                    // information. Fall back to the full scan.
                }
            }

            // Check for empty or just whitespace File Path column values
            const blankFilePathRows = await this.getRowsWhereColumnIsBlank(
                name,
                PreDefinedColumn.FILE_PATH
            );
            if (blankFilePathRows.totalCount > 0) {
                const rowNumbers = DatabaseService.truncateString(
                    blankFilePathRows.sampleRowNumbers.join(", "),
                    100
                );
                return `"${PreDefinedColumn.FILE_PATH}" column contains ${blankFilePathRows.totalCount} empty or purely whitespace paths at rows ${rowNumbers}.`;
            }
            return null;
        }
    }

    /**
     * When converting DuckDB query results to strings, Javascript sometimes removes
     * non-printable characters (e.g., Ôªø etc.), likely because of encoding mismatches.
     * This can cause errors in the database service if we then try to select or interact
     * with those columns, since they no longer match what's actually in the database.
     */
    private async renameNonprintableCharColumns(dataSourceName: string): Promise<void> {
        // Query for columns that contain ASCII characters that are outside of the printable range
        const findNonAsciiCharsSql = `
            SELECT column_name
            FROM "information_schema"."columns"
            WHERE (table_name = '${dataSourceName}') AND (regexp_matches(column_name, '[^ -~]+'))
        `;
        const columnsWithNonAscii = (await this.query(findNonAsciiCharsSql).promise).flatMap(
            (val) => val.column_name
        );
        // Determine whether Javascript removes those characters by checking
        // if the JS version of each column name still exists in the DuckDB table
        const columnsExist = await this.checkColumnsExist(dataSourceName, columnsWithNonAscii);
        const columnsWithMismatch = columnsExist
            ?.filter((value) => value.column_exists === false)
            .flatMap((val) => val.column_name);
        // If list is empty, there may be column names with non-ASCII characters,
        // but they don't get trimmed by JS, so we can return safely
        if (!columnsWithMismatch || columnsWithMismatch.length === 0) return;

        // Only rename the columns that have a mismatch after being converted to JS
        // since these are the ones that won't render correctly & will cause errors
        const findMismatchedColumnsSql = `
            WITH nonascii_columns AS (
                SELECT * FROM (
                VALUES ${columnsWithMismatch
                    ?.map((col) => `('${col.replace(/'/g, "''")}')`)
                    .join(",")}) 
                AS t(column_name)
            ),
            table_columns AS (
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = '${dataSourceName}'
            )
            SELECT 
                (SELECT column_name FROM table_columns tc
                WHERE regexp_replace(column_name, '[^ -~]+', '', 'g') = nc.column_name
                LIMIT 1) as column_name,
                nc.column_name as clean_name
            FROM nonascii_columns nc
        `;
        // Run the above query inside of a DuckDB command that generates `ALTER` statements
        // rather than running two separate queries,
        // to avoid risk of Javascript trimming column names in the results
        const alterCommandsSql = `
            SELECT string_agg('ALTER TABLE "${dataSourceName}" RENAME "' || column_name || '" TO "' || clean_name || '";', ' ') as sql_statement,
                string_agg(column_name, ', ') as cols_to_rename
            FROM (${findMismatchedColumnsSql}
            ) problem_columns;
        `;
        // Retrieve the ALTER commands and names of columns that will be renamed
        const executeResult = await this.query(alterCommandsSql).promise;
        if (executeResult[0]?.sql_statement && executeResult[0]?.cols_to_rename) {
            // Run the ALTER commands
            this.execute(executeResult[0].sql_statement);
            console.warn(
                `Renamed columns with special characters: ${executeResult[0].cols_to_rename}`
            );
        }
    }

    // Check if each column name in an array actually exists in table `dataSourceName`
    private async checkColumnsExist(dataSourceName: string, columnNames: string[]) {
        if (columnNames.length === 0) return;
        const sql = `
            WITH columns_to_check AS (
                SELECT * FROM (
                VALUES ${columnNames.map((col) => `('${col.replace(/'/g, "''")}')`).join(",")}) 
                AS t(column_name)
            )
            SELECT cc.column_name,
                ic.column_name IS NOT NULL as column_exists
            FROM columns_to_check cc
            LEFT JOIN information_schema.columns ic 
                ON LOWER(cc.column_name) = LOWER(ic.column_name)
                AND ic.table_name = '${dataSourceName}'
        `;
        return await this.query(sql).promise;
    }

    /*
        Some columns like "File Path", "File ID", "Thumbnail", etc.
        have expectations around how they should be cased/formatted
        so this will attempt to find the nearest match to the pre-defined
        columns and format them appropriately
    */
    private async normalizeDataSourceColumnNames(dataSourceName: string): Promise<void> {
        const columnsOnDataSource = await this.getColumnsOnDataSource(dataSourceName);
        const actualToPreDefined = getActualToPreDefinedColumnMap([...columnsOnDataSource]);

        const combinedAlterCommands = [...actualToPreDefined.entries()]
            .map(
                ([actualColumn, preDefinedColumn]) =>
                    `ALTER TABLE "${dataSourceName}" RENAME COLUMN "${actualColumn}" TO '${preDefinedColumn}'`
            )
            .join("; ");

        if (combinedAlterCommands) {
            await this.execute(combinedAlterCommands);
        }

        // Because we edited the column names this cache is now invalid
        this.dataSourceToAnnotationsMap.delete(dataSourceName);
    }

    // Create a view over the parquet file that exposes columns under predefined names (e.g. "File Path")
    // and adds hidden_bff_uid.
    private async createParquetDirectView(name: string): Promise<void> {
        // 1. Get original column names from the user's table.
        // Note: we don't use this.getColumnsOnDataSource, since that expects a
        // fully built data source, and this function is used for creating a
        // data source.
        const rawColumns = await this.getRawParquetColumns(name);
        // 2. Determine which columns need to be renamed, if any
        const actualToPreDefined = getActualToPreDefinedColumnMap(rawColumns);
        // 3. Prepare the SQL for renaming columns in the CREATE VIEW.
        //    STRUCT(...)[] columns (arrays of structs) are kept in their native type so that
        //    queries can use DuckDB's vectorized list_transform / list_filter operations
        //    instead of slow row-by-row JSON parsing.
        //    Plain STRUCT(...) columns are kept as-is and expanded below.
        const selectParts = rawColumns.map((col) => {
            const alias = actualToPreDefined.get(col) ?? col;
            if (alias !== col) {
                return `"${col}" AS "${alias}"`;
            }
            return `"${col}"`;
        });
        const fileNameSelectPart = getParquetFileNameSelectPart(actualToPreDefined);
        if (fileNameSelectPart !== null) {
            selectParts.push(fileNameSelectPart);
        }
        selectParts.push(`"file_row_number" AS "${HIDDEN_UID_ANNOTATION}"`);
        // 4. Create the view for this data source
        const createViewSql = `CREATE VIEW "${name}"
            AS SELECT ${selectParts.join(", ")}
            FROM parquet_scan('${name}');`;
        await this.execute(createViewSql);
        this.parquetDirectViewNames.add(name);
    }

    // Given a possibly-renamed column name, get the original column name used
    // in the input parquet.
    private async getOriginalParquetColumnName(
        name: string,
        logicalColumn: string
    ): Promise<string | null> {
        const rawColumns = await this.getRawParquetColumns(name);
        const actualToPreDefined = getActualToPreDefinedColumnMap(rawColumns);
        for (const [actual, predefined] of actualToPreDefined) {
            if (predefined === logicalColumn) {
                return actual;
            }
        }
        return null;
    }

    private async totalRowCount(name: string): Promise<number> {
        const sql = new SQLBuilder().select("COUNT(*) AS count").from(name).toSQL();
        return (await this.query(sql).promise)[0].count;
    }

    /**
     * Quickly check if a column of a parquet has blank values. Return null
     * if result is uncertain.
     *
     * Definition: For the purposes of this function, a "blank" value is one
     * made up of spaces, tabs, new lines, carriage returns, or other
     * non-printable ASCII control characters. This differs from
     * getRowsWhereColumnIsBlank, which treats other whitespace characters as
     * blank and control characters as non-blank. This distinction is not
     * expected to be of much importance to our users.
     *
     * Special cases to consider:
     *   Condition: Any row group has a non-zero null count.
     *   Result: The column certainly has blank values. Return true.
     *
     *   Condition: In the row group statistics, the min_value is a blank value.
     *   Example: min_value = ' ', actual minimum = ' /my/file/path.tiff'.
     *   Result: The column likely has blank values, but we cannot be sure.
     *     min_value is a lower bound on the values in the column, but is not
     *     necessarily one of the values in the column. Return null.
     *
     *   Condition: The minimum value starts with newline, tab, carriage
     *     return, or vertical tab, and includes some printable characters.
     *   Example: min_value = '\n/my/file/path.tiff', another value = ' '
     *   Result: The column may have blank values. Return null.
     *
     *   Condition: The null counts are all zero and the min_values all start
     *     with non-whitespace printable characters.
     *   Result: The column has no blank values. Return false.
     */
    private async parquetHasBlankValues(filename: string, column: string): Promise<boolean | null> {
        /**
         * This function uses null_count and min_value to determine if any rows
         * of a parquet file have null or blank values for the given column.
         *
         * If a row has a null value, that will show up in the null_count
         * statistic for the row group.
         *
         * The min_value statistic for a string-type column gives a string
         * that is "smaller" than all the values in the column, according to
         * a lexicographic ordering by the UTF-8 byte values of each character.
         * Space, tab, carriage return, and line feed all have lower UTF-8
         * values than the non-whitespace characters. Therefore, if the
         * min_value starts with a non-whitespace character, there are no blank
         * values in the column.
         */
        const nullGroupCountSql = `
            SELECT COUNT(*) AS null_group_count,
            FROM parquet_metadata('${filename}')
            WHERE path_in_schema = '${column}'
            AND stats_null_count > 0`;
        const nullGroupCount = (await this.query(nullGroupCountSql).promise)[0].null_group_count;
        if (nullGroupCount > 0) {
            return true;
        }

        const validationSql = `
            SELECT COUNT(*) AS no_data_count,
            FROM parquet_metadata('${filename}')
            WHERE path_in_schema = '${column}'
            AND (
                stats_null_count IS NULL
                OR stats_min_value IS NULL
            )`;
        const insufficientMetadataCount = (await this.query(validationSql).promise)[0]
            .no_data_count;
        if (insufficientMetadataCount > 0) {
            // null_count or min_value are not defined. Cannot guarantee there
            // are no blank values.
            return null;
        }
        // ! is the first printable non-whitespace character (0x21), and it is
        // immediately after space (0x20).
        // If stats_min_value < '!', the min_value is entirely composed of
        // whitespace and/or non-printable control characters.
        const lowMinCountSql = `
            SELECT COUNT(*) as low_min_count,
            FROM parquet_metadata('${filename}')
            WHERE path_in_schema = '${column}'
            AND stats_min_value < '!'`;
        const lowMinCount = (await this.query(lowMinCountSql).promise)[0].low_min_count;
        if (lowMinCount > 0) {
            return null;
        } else {
            // All null counts are zero, and all min values start with a
            // non-blank character.
            return false;
        }
    }

    /** Slow fallback: use DuckDB's parquet_schema() for URL-based sources. */
    private async getParquetSchemaViaDuckDB(
        parquetInternalName: string
    ): Promise<Array<{ column_name: string; column_type: string }>> {
        const escapedName = parquetInternalName.replaceAll("'", "''");
        const rawSchemaRows = (await this.query(
            `SELECT name, type, num_children, converted_type, logical_type
             FROM parquet_schema('${escapedName}')`
        ).promise) as Array<{
            name: string;
            type: string | null;
            num_children: number;
            converted_type: string | null;
            logical_type: string | null;
        }>;
        return parseParquetSchemaRows(rawSchemaRows);
    }

    private async getRowsWhereColumnIsBlank(
        dataSource: string,
        column: string
    ): Promise<{ totalCount: number; sampleRowNumbers: number[] }> {
        // Fast path: COUNT with a simple predicate lets DuckDB use Parquet row-group
        // statistics to skip unaffected row-groups — no window function needed.
        const countResult = await this.query(`
            SELECT COUNT(*) AS cnt
            FROM "${dataSource}"
            WHERE "${column}" IS NULL OR TRIM("${column}") = ''
        `).promise;
        const totalCount = Number(countResult[0]?.cnt ?? 0);
        if (totalCount === 0) {
            return { totalCount: 0, sampleRowNumbers: [] };
        }

        // Error path: retrieve a small sample of 1-based row numbers for the error message.
        // The full ROW_NUMBER() scan is still O(N), but this branch only runs when
        // blank rows actually exist, which should be rare for valid data sources.
        const sampleResult = await this.query(`
            SELECT A.row
            FROM (
                SELECT ROW_NUMBER() OVER () AS row, "${column}"
                FROM "${dataSource}"
            ) AS A
            WHERE TRIM(CAST(A."${column}" AS VARCHAR)) IS NULL
        `).promise;
        return {
            sampleRowNumbers: sampleResult.map((row) => row.row),
            totalCount,
        };
    }

    private static combineSourceNames(dataSources: Source[] | string[]) {
        return dataSources
            .map((source) => (typeof source === "string" ? source : source.name))
            .sort()
            .join(", ");
    }

    private async aggregateDataSources(dataSources: Source[]): Promise<void> {
        if (dataSources.some((source) => source.type === "parquet")) {
            throw new Error("Parquet tables cannot be combined to query multiple data sources.");
        }
        const viewName = DatabaseService.combineSourceNames(dataSources);

        if (this.currentAggregateSource === viewName) {
            // Prevent adding the same data source multiple times by shortcutting out here
            return;
        } else if (this.currentAggregateSource) {
            // Otherwise, if an old aggregate exists, delete it
            await this.deleteDataSource(this.currentAggregateSource);
        }

        const columnsSoFar = new Set<string>();
        const renamedColumnWarnings: string[] = [];
        try {
            for (const dataSource of dataSources) {
                // Fetch information about this data source
                const annotationsInDataSource = await this.fetchAnnotations([dataSource.name]);
                const columnsInDataSource = annotationsInDataSource.map(
                    (annotation) => annotation.name
                );

                // Set.has() is case sensitive, but columns in DuckDB are case INsensitive.
                // If source A has column "Color" and source B has column "color",
                // "color" will appear to be new, but will cause an error when attempting to
                // create the new column with DuckDB
                const newColumns: string[] = [];
                const similarColumnMap = new Map<string, string>();
                columnsInDataSource.forEach((column) => {
                    if (!columnsSoFar.has(column)) {
                        let hasMatch = false;
                        for (const existingCol of columnsSoFar) {
                            if (existingCol.toLowerCase() === column.toLowerCase()) {
                                // The original table has a column that functionally matches the new column
                                hasMatch = true;
                                similarColumnMap.set(existingCol, column);
                                break;
                            }
                        }
                        if (!hasMatch) {
                            // Completely new even with case-insensitivity
                            newColumns.push(column);
                        }
                    }
                });

                // If there are no columns / data added yet, we need to create the table from
                // scratch so we can provide an easy shortcut around the default way of adding
                // data to a table
                if (columnsSoFar.size === 0) {
                    await this.execute(
                        `CREATE TABLE "${viewName}" AS SELECT *, '${dataSource.name}' AS "Data source" FROM "${dataSource.name}"`
                    );
                    this.currentAggregateSource = viewName;
                } else {
                    // If adding data to an existing table, we will need to add any new columns.
                    // DuckDB does not support adding multiple columns in one ALTER TABLE
                    // statement, so we will need to loop through and add them one by one.
                    if (newColumns.length) {
                        const alterTableSQL = newColumns
                            .map(
                                (column) =>
                                    `ALTER TABLE "${viewName}" ADD COLUMN "${column}" VARCHAR`
                            )
                            .join("; ");
                        await this.execute(alterTableSQL);
                    }

                    // After we have added any new columns to the table schema,
                    // insert the data from the new table into the existing one,
                    // replacing any non-existent columns with an empty value (null)
                    const columnsSoFarArr = [...columnsSoFar, ...newColumns];
                    const columnToSql = (column: string) => {
                        if (columnsInDataSource.includes(column)) {
                            return `"${column}"`;
                        } else if (similarColumnMap.has(column)) {
                            // Match columns to their case-insensitive equivalent in the existing table
                            return `"${similarColumnMap.get(column)}" as "${column}"`;
                        } else return "NULL";
                    };
                    await this.execute(`
                        INSERT INTO "${viewName}" ("${columnsSoFarArr.join('", "')}", "Data source")
                        SELECT ${columnsSoFarArr
                            .map((column) => columnToSql(column))
                            .join(", ")}, '${dataSource.name}' AS "Data source"
                        FROM "${dataSource.name}"
                    `);
                }

                // Add the new columns from this data source to the existing columns
                // to avoid adding duplicate columns
                newColumns.forEach((column) => columnsSoFar.add(column));

                Array.from(similarColumnMap.entries()).forEach((entry) => {
                    renamedColumnWarnings.push(
                        `Column "${entry[0]}" from data source ${dataSource.name} translated to "${entry[1]}".`
                    );
                });
            }
        } catch (err) {
            const formattedError =
                (err as Error)?.message || `Error while combining data sources. ${err}`;
            throw new DataSourcePreparationError(formattedError, viewName);
        }

        // Unable to dispatch from a class definition; use warn for now
        if (renamedColumnWarnings.length > 0) {
            console.warn(
                "Combining columns with similar names: \n ",
                renamedColumnWarnings.join("\n")
            );
        }

        // Reset hidden UID to avoid conflicts in previous auto-generation
        await this.execute(this.getUpdateHiddenUIDSQL(viewName));
    }

    public async processProvenance(provenanceSource: Source): Promise<EdgeDefinition[]> {
        await this.prepareSourceProvenance(provenanceSource);

        const sql = new SQLBuilder().select("*").from(`${this.SOURCE_PROVENANCE_TABLE}`).toSQL();
        try {
            const rows = await this.query(sql).promise;
            const parentsAndChildren = new Set<string>();
            return rows
                .map((row) =>
                    Object.keys(row).reduce(
                        (mapSoFar, key) => ({
                            ...mapSoFar,
                            [key.toLowerCase().trim()]:
                                typeof row[key] !== "object"
                                    ? row[key]
                                    : mapKeys(row[key], (_value, innerKey) =>
                                          innerKey.toLowerCase().trim()
                                      ),
                        }),
                        {} as Record<string, any>
                    )
                )
                .map((row) => {
                    try {
                        const parentAndChildKey = `${row["parent"]}-${row["child"]}`;
                        if (parentsAndChildren.has(parentAndChildKey)) {
                            throw new Error(
                                `Parent (${row["parent"]}) and Child (${row["child"]}) combination found multiple times`
                            );
                        }

                        parentsAndChildren.add(parentAndChildKey);
                        return {
                            relationship: row["relationship"],
                            relationshipType: row["relationship type"],
                            parent: {
                                name: row["parent"],
                                type: row["parent type"],
                            },
                            child: {
                                name: row["child"],
                                type: row["child type"],
                            },
                        };
                    } catch (err) {
                        if ((err as Error).message.includes("key")) {
                            throw new Error(
                                `Unexpected format for provenance data. Check the documentation
                                for what BFF expects provenance data to look like.
                                Error: ${(err as Error).message}`
                            );
                        }
                        throw err;
                    }
                });
        } catch (err) {
            // Source provenance file may not have been supplied
            // and/or the columns may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return [];
            }
            throw err;
        }
    }

    public async fetchAnnotations(
        dataSourceNames: string[],
        metadataSource?: Source
    ): Promise<Annotation[]> {
        const aggregateDataSourceName = dataSourceNames.sort().join(", ");
        const hasAnnotations = this.dataSourceToAnnotationsMap.has(aggregateDataSourceName);
        const hasDescriptions = this.dataSourceToAnnotationsMap
            .get(aggregateDataSourceName)
            ?.some((annotation) => !!annotation.description);
        const shouldHaveDescriptions =
            metadataSource && this.existingDataSources.has(metadataSource?.name);
        if (!hasAnnotations || (!hasDescriptions && shouldHaveDescriptions)) {
            this.sourceMetadataName = metadataSource?.name;
            const sql = new SQLBuilder()
                .select("column_name, data_type")
                .from('information_schema"."columns')
                .where(`table_name = '${aggregateDataSourceName}'`)
                .where(`column_name != '${HIDDEN_UID_ANNOTATION}'`)
                .toSQL();
            const rows = await this.query(sql).promise;
            if (isEmpty(rows)) {
                throw new Error(`Unable to fetch annotations for ${aggregateDataSourceName}`);
            }
            const [annotationNameToDescriptionMap, annotationNameToTypeMap] = await Promise.all([
                this.fetchAnnotationDescriptions(),
                this.fetchAnnotationTypes(),
            ]);

            const annotations: Annotation[] = [];

            // Collect VARCHAR/JSON columns that need runtime sampling for nested schema discovery.
            // We'll batch them into a single query instead of one per column.
            const jsonLikeCols: Array<{ colName: string; annotationIndex: number }> = [];

            for (const row of rows) {
                const rawDataType = (row["data_type"] ?? "") as string;
                const colName = row["column_name"] as string;

                // STRUCT and MAP columns have a compile-time-fixed schema; their sub-fields
                // are already exposed as real view columns (e.g. "Well.Gene") via
                // createParquetDirectView so they will appear in subsequent rows of this query.
                const isStructOrMap =
                    rawDataType.startsWith("STRUCT(") || rawDataType.startsWith("MAP(");
                const isStructArray =
                    rawDataType.startsWith("STRUCT(") && rawDataType.trimEnd().endsWith("[]");

                annotations.push(
                    new Annotation({
                        annotationName: colName,
                        annotationDisplayName: colName,
                        description: annotationNameToDescriptionMap[colName] || "",
                        type:
                            (annotationNameToTypeMap[colName] as AnnotationType) ||
                            DatabaseService.columnTypeToAnnotationType(rawDataType),
                        isNested: isStructOrMap || isStructArray,
                    })
                );

                // STRUCT(...)[] columns — discover sub-fields from the type definition
                // at build time (no row scanning needed). Uses native list_transform
                // expressions for vectorized query execution.
                if (isStructArray) {
                    const structPaths = collectStructArraySchemaPaths(colName, rawDataType);
                    for (const { displayPath, jsonPath, listExpression } of structPaths) {
                        const virtualName = `${colName}.${displayPath}`;
                        annotations.push(
                            new Annotation({
                                annotationName: virtualName,
                                annotationDisplayName: virtualName,
                                description: `Sub-field "${displayPath}" of "${colName}"`,
                                type: AnnotationType.STRING,
                                isNestedSubField: true,
                                nestedParent: colName,
                                nestedJsonPath: jsonPath,
                                nestedListExpression: listExpression,
                            })
                        );
                    }
                }

                // Track VARCHAR/JSON columns for batched sampling below.
                const isJsonLike = rawDataType === "VARCHAR" || rawDataType === "JSON";
                if (isJsonLike && !isStructOrMap) {
                    jsonLikeCols.push({ colName, annotationIndex: annotations.length - 1 });
                }
            }

            // For non-parquet data sources, VARCHAR/JSON columns may contain JSON arrays of
            // objects (e.g. [{"Label":"A3","Gene":"TP53",...},...]).  Detect this by sampling
            // a few rows.  All candidate columns are fetched in ONE query to avoid N round-trips.
            if (jsonLikeCols.length > 0) {
                try {
                    const selectParts = jsonLikeCols
                        .map(({ colName }) => `"${colName}"`)
                        .join(", ");
                    const sampleSql = new SQLBuilder()
                        .select(selectParts)
                        .from(aggregateDataSourceName)
                        // TODO: Arbitrary
                        .limit(20)
                        .toSQL();
                    const sampleRows = await this.query(sampleSql);

                    for (const { colName, annotationIndex } of jsonLikeCols) {
                        const schemaPaths = new Map<string, JsonSchemaPath>();

                        for (const sampleRow of await sampleRows.promise) {
                            const raw = sampleRow[colName];
                            if (typeof raw !== "string") continue;
                            let parsed: unknown;
                            try {
                                parsed = JSON.parse(raw);
                            } catch {
                                continue;
                            }
                            if (!Array.isArray(parsed) || parsed.length === 0) continue;

                            const discovered = collectJsonArraySchemaPaths(parsed);
                            for (const p of discovered) {
                                if (!schemaPaths.has(p.displayPath)) {
                                    schemaPaths.set(p.displayPath, p);
                                }
                            }
                        }

                        if (schemaPaths.size > 0) {
                            // Mark the parent column as nested.
                            annotations[annotationIndex] = new Annotation({
                                annotationName: colName,
                                annotationDisplayName: colName,
                                description: annotationNameToDescriptionMap[colName] || "",
                                type:
                                    (annotationNameToTypeMap[colName] as AnnotationType) ||
                                    DatabaseService.columnTypeToAnnotationType("VARCHAR"),
                                isNested: true,
                            });

                            for (const { displayPath, jsonPath } of schemaPaths.values()) {
                                const virtualName = `${colName}.${displayPath}`;
                                annotations.push(
                                    new Annotation({
                                        annotationName: virtualName,
                                        annotationDisplayName: virtualName,
                                        description: `Sub-field "${displayPath}" of "${colName}"`,
                                        type: AnnotationType.STRING,
                                        isNestedSubField: true,
                                        nestedParent: colName,
                                        nestedJsonPath: jsonPath,
                                    })
                                );
                            }
                        }
                    }
                } catch {
                    // Sampling failed — skip virtual path discovery for all JSON-like columns.
                }
            }

            this.dataSourceToAnnotationsMap.set(aggregateDataSourceName, annotations);
        }

        return this.dataSourceToAnnotationsMap.get(aggregateDataSourceName) || [];
    }

    // Similar to getColumnsOnDataSource below, but suitable for use during the
    // data source preparation step.
    private async getRawParquetColumns(name: string): Promise<string[]> {
        const sql = `DESCRIBE SELECT * FROM parquet_scan("${name}")`;
        const rows = await this.query(sql).promise;
        return rows.map((row) => row["column_name"] as string);
    }

    protected async getColumnsOnDataSource(name: string): Promise<Set<string>> {
        const annotations = await this.fetchAnnotations([name]);
        return new Set(annotations.map((annotation) => annotation.name));
    }

    protected async fetchAnnotationDescriptions(): Promise<Record<string, string>> {
        // Unless we have actually added the source metadata table we can't fetch the descriptions
        if (!this.sourceMetadataName || !this.existingDataSources.has(this.sourceMetadataName)) {
            return {};
        }

        const sql = new SQLBuilder()
            .select('"Column Name", "Description"')
            .from(this.sourceMetadataName)
            .toSQL();
        try {
            const rows = await this.query(sql).promise;
            return rows.reduce(
                (map, row) => ({ ...map, [row["Column Name"]]: row["Description"] }),
                {}
            );
        } catch (err) {
            // Source metadata file may not have been supplied
            // and/or this column may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return {};
            }
            throw err;
        }
    }

    public async fetchAnnotationTypes(): Promise<Record<string, string>> {
        // Unless we have actually added the source metadata table we can't fetch the types
        if (!this.sourceMetadataName || !this.existingDataSources.has(this.sourceMetadataName)) {
            return {};
        }

        const sql = new SQLBuilder()
            .select('"Column Name", "Type"')
            .from(this.sourceMetadataName)
            .toSQL();

        try {
            const rows = await this.query(sql).promise;
            return rows.reduce(
                (map, row) =>
                    DatabaseService.ANNOTATION_TYPE_SET.has(row["Type"])
                        ? { ...map, [row["Column Name"]]: row["Type"] }
                        : // Ignore row if invalid annotation type
                          map,
                {}
            );
        } catch (err) {
            // Source metadata file may not have been supplied
            // and/or this column may not exist
            const errMsg = typeof err === "string" ? err : err instanceof Error ? err.message : "";
            if (errMsg.includes("does not exist") || errMsg.includes("not found in FROM clause")) {
                return {};
            }
            throw err;
        }
    }

    // To do: unclear if this is still working
    public async addNewColumn(
        datasourceName: string,
        columnName: string,
        description?: string
    ): Promise<void> {
        await this.execute(`ALTER TABLE "${datasourceName}" ADD COLUMN "${columnName}" VARCHAR;`);

        // Cache is now invalid since we added a column
        this.dataSourceToAnnotationsMap.delete(datasourceName);

        if (
            description?.trim() &&
            this.sourceMetadataName &&
            this.existingDataSources.has(this.sourceMetadataName)
        ) {
            await this
                .execute(`INSERT INTO "${this.sourceMetadataName}" ("Column Name", "Description")
                    VALUES ('${columnName}', '${description}');`);
        }
    }
}
