/**
 * RoCrateService
 *
 * Responsible for fetching and querying RO-Crate repositories using Comunica.
 *
 * An RO-Crate is a Research Object packaging format built on JSON-LD.  Each
 * crate exposes a `ro-crate-metadata.json` file whose `@graph` contains typed
 * entities (Dataset, File, Person, …).  This service uses a SPARQL query engine
 * (Comunica) to extract `File` entities from that graph and converts them into
 * flat row objects that the rest of BioFile Finder can ingest via DuckDB.
 *
 * @see https://www.researchobject.org/ro-crate/
 * @see https://comunica.dev/
 */
import { QueryEngine } from "@comunica/query-sparql";
import type { Bindings } from "@comunica/types";

/** The conventional metadata filename found at the root of every RO-Crate. */
export const RO_CRATE_METADATA_FILENAME = "ro-crate-metadata.json";

/**
 * A flat row describing a single `File` entity extracted from an RO-Crate.
 * Column names follow the "pre-defined column" conventions that DatabaseService
 * recognises (e.g. "File Path", "File Name", "File Size") so no extra
 * normalisation is required after the table is loaded into DuckDB.
 */
export interface RoCrateFileRow {
    "File Path": string;
    "File Name"?: string;
    /** Byte count reported by the crate; undefined when absent. */
    "File Size"?: number;
    /** MIME type (schema:encodingFormat). */
    "Encoding Format"?: string;
    "Date Published"?: string;
    Description?: string;
}

/**
 * Resolve the URL of the metadata file from a crate base URL.
 *
 * If `baseUrl` already ends with the metadata filename (ignoring any query
 * string or fragment) it is returned as-is; otherwise the filename is appended
 * to the URL's pathname (with a `/` separator if needed).
 *
 * @example
 * resolveMetadataUrl("https://example.org/crates/my-crate/")
 * // → "https://example.org/crates/my-crate/ro-crate-metadata.json"
 *
 * resolveMetadataUrl("https://example.org/crates/my-crate/ro-crate-metadata.json")
 * // → "https://example.org/crates/my-crate/ro-crate-metadata.json"
 */
export function resolveMetadataUrl(baseUrl: string): string {
    const parsed = new URL(baseUrl);
    const pathWithoutTrailingSlash = parsed.pathname.replace(/\/$/, "");

    // Already points directly at the metadata file
    if (pathWithoutTrailingSlash.endsWith(RO_CRATE_METADATA_FILENAME)) {
        return baseUrl;
    }

    // Append the metadata filename to the pathname, preserving origin
    parsed.pathname = `${pathWithoutTrailingSlash}/${RO_CRATE_METADATA_FILENAME}`;
    // Clear any query string or fragment — the metadata file URL should be clean
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
}

/**
 * SPARQL SELECT query that extracts `schema:File` entities from an RO-Crate.
 *
 * RO-Crate 1.1 mandates the HTTPS variant of the Schema.org namespace
 * (`https://schema.org/`), so all prefixed names below use that base.
 *
 * All non-`@id` properties are `OPTIONAL` because not every crate author
 * fills in every field.
 */
const RO_CRATE_FILES_QUERY = `
PREFIX schema: <https://schema.org/>

SELECT ?id ?name ?contentUrl ?contentSize ?encodingFormat ?datePublished ?description
WHERE {
    ?id a schema:File .
    OPTIONAL { ?id schema:name            ?name            }
    OPTIONAL { ?id schema:contentUrl      ?contentUrl      }
    OPTIONAL { ?id schema:contentSize     ?contentSize     }
    OPTIONAL { ?id schema:encodingFormat  ?encodingFormat  }
    OPTIONAL { ?id schema:datePublished   ?datePublished   }
    OPTIONAL { ?id schema:description     ?description     }
}
`;

export default class RoCrateService {
    /**
     * Comunica's universal SPARQL query engine.
     *
     * A single shared instance is fine here: the engine is stateless between
     * `queryBindings` calls, and reusing it avoids re-initialising the actor
     * pipeline on every query.
     */
    private readonly engine = new QueryEngine();

    /**
     * Fetch a remote RO-Crate and return its `File` entities as flat row objects.
     *
     * Comunica handles the full Linked Data pipeline:
     *   1. Fetch `<crateUrl>/ro-crate-metadata.json` over HTTP.
     *   2. Parse the JSON-LD document into an RDF dataset.
     *   3. Execute the SPARQL SELECT and stream the bindings back.
     *
     * @param crateUrl - Root URL of the crate directory, or the direct URL
     *   of the `ro-crate-metadata.json` file.
     */
    public async queryFileEntities(crateUrl: string): Promise<RoCrateFileRow[]> {
        const metadataUrl = resolveMetadataUrl(crateUrl);

        // Comunica accepts any HTTPS/HTTP URL as a source.  It will dereference
        // the URL, detect the JSON-LD content type, and build an in-memory RDF
        // graph for querying.
        const bindingsStream = await this.engine.queryBindings(RO_CRATE_FILES_QUERY, {
            sources: [metadataUrl],
        });

        const bindings = await bindingsStream.toArray();
        return bindings.map((binding) => this.bindingToRow(binding));
    }

    /**
     * Serialize a list of file rows to a JSON string.
     *
     * The returned string is suitable for registering as a virtual DuckDB file
     * with `db.registerFileText(handle, jsonString)` and then loading with
     * `CREATE TABLE … AS FROM read_json_auto('handle')`.
     */
    public toInMemoryJson(rows: RoCrateFileRow[]): string {
        return JSON.stringify(rows);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Convert a single SPARQL `Bindings` object into a `RoCrateFileRow`.
     *
     * `binding.get(variable)` returns an RDF/JS `Term` (or `null`/`undefined`
     * when the variable is unbound for that result row).  We call `.value` to
     * extract the plain string value from the `Term`.
     */
    private bindingToRow(binding: Bindings): RoCrateFileRow {
        const get = (variable: string): string | undefined =>
            binding.get(variable)?.value ?? undefined;

        const rawSize = get("contentSize");
        const filePath = get("contentUrl") ?? get("id") ?? "";

        return {
            "File Path": filePath,
            "File Name": get("name"),
            "File Size": rawSize !== undefined ? Number(rawSize) : undefined,
            "Encoding Format": get("encodingFormat"),
            "Date Published": get("datePublished"),
            Description: get("description"),
        };
    }
}
