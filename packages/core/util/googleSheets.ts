/**
 * Helpers for turning a Google Sheets URL that a user copied out of their browser's address bar
 * into a URL that can actually be read as CSV.
 *
 * A pasted sheet URL (".../edit?gid=123#gid=123") serves an HTML editor, not data. Google's
 * "/export" (private-but-link-shared sheets) and "/pub" (published-to-web sheets) endpoints serve
 * the same sheet as CSV and respond with permissive CORS headers, so they can be read directly
 * from the browser.
 *
 * Two caveats worth knowing:
 *   - Those endpoints do not support range requests and do not report a Content-Length, so
 *     duckdb-wasm buffers the entire response instead of reading it in pieces. Fine at
 *     sheet-sized data; not a way to load very large files.
 *   - Requests are made without credentials, so only sheets shared as "Anyone with the link" or
 *     published to the web can be read. A restricted sheet fails no matter who is signed in, and
 *     the failure surfaces as a CORS error because Google's 404 page carries no CORS headers.
 */

const GOOGLE_DOCS_HOST = "docs.google.com";

// Matches the spreadsheet portion of a Sheets URL, capturing:
//   1. the "e/" marker present only on published-to-web links
//   2. the document (or published) id
// The optional "/u/{n}" segment appears when a user is signed into multiple Google accounts.
const SPREADSHEET_PATH = /^\/spreadsheets(?:\/u\/\d+)?\/d\/(e\/)?([A-Za-z0-9-_]+)/;

// The selected tab is often only in the URL fragment (e.g. ".../edit#gid=123"), which is never
// sent to a server; it has to be pulled out of the pasted string ourselves.
const GID_IN_FRAGMENT = /(?:^|[#&])gid=([0-9]+)/;

export interface GoogleSheetSource {
    /** URL that responds with the sheet as CSV */
    csvUrl: string;
    /** Stand-in for a file name, since the sheet's title isn't knowable from the URL alone */
    displayName: string;
}

/**
 * Recognize a Google Sheets URL and return the equivalent CSV download URL. Returns undefined for
 * anything that isn't a Sheets URL, so callers can fall through to their normal URL handling.
 *
 * Handles the shapes users actually paste: /edit with the tab in the query string or the
 * fragment, /view, /preview, bare /d/{id} links, ?usp=sharing links, multi-account /u/{n} links,
 * published-to-web /d/e/{id}/pubhtml links, and exports already requested in another format.
 * URLs that already ask for CSV are returned unchanged.
 */
export function parseGoogleSheetUrl(rawUrl: string): GoogleSheetSource | undefined {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        return undefined; // Not a URL at all (e.g. an S3 path or a typo)
    }

    if (url.hostname !== GOOGLE_DOCS_HOST) {
        return undefined;
    }

    const match = SPREADSHEET_PATH.exec(url.pathname);
    if (!match) {
        return undefined; // Some other Google Docs product (a doc, a slide deck, a form)
    }

    const [, publishedMarker, id] = match;
    const gid = url.searchParams.get("gid") || GID_IN_FRAGMENT.exec(url.hash)?.[1];
    const displayName = `Google Sheet ${id.substring(0, 8)}${gid ? `.${gid}` : ""}`;

    // The Google Charts endpoint is a valid way to request CSV and applies its own type coercion.
    // If a user deliberately pasted one, respect it rather than swapping in a different endpoint.
    if (url.pathname.includes("/gviz/tq") && url.searchParams.get("tqx")?.includes("out:csv")) {
        return { csvUrl: rawUrl.trim(), displayName };
    }

    if (publishedMarker) {
        const csvUrl = new URL(`https://${GOOGLE_DOCS_HOST}/spreadsheets/d/e/${id}/pub`);
        csvUrl.searchParams.set("output", "csv");
        if (gid) {
            // "single" limits a published workbook to the one requested tab
            csvUrl.searchParams.set("gid", gid);
            csvUrl.searchParams.set("single", "true");
        }
        return { csvUrl: csvUrl.toString(), displayName };
    }

    const csvUrl = new URL(`https://${GOOGLE_DOCS_HOST}/spreadsheets/d/${id}/export`);
    csvUrl.searchParams.set("format", "csv");
    if (gid) {
        csvUrl.searchParams.set("gid", gid);
    }
    return { csvUrl: csvUrl.toString(), displayName };
}

/**
 * Whether a URI points at Google Sheets, used to tailor error messaging. Takes the loose
 * `string | File` shape that data source URIs have elsewhere in the app.
 */
export function isGoogleSheetUri(uri?: string | File): boolean {
    return typeof uri === "string" && parseGoogleSheetUrl(uri) !== undefined;
}
