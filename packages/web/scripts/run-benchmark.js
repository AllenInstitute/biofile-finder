/**
 * run-benchmark.js
 *
 * Builds the benchmark bundle, serves it in a local HTTP server with the
 * Cross-Origin isolation headers required for SharedArrayBuffer (and therefore
 * DuckDB-WASM's pthread bundle), then uses Playwright to run the benchmark
 * in real Chromium and collect the results.
 *
 * The run happens in two phases:
 *   Phase 1 – In-memory: synthetic tables at multiple scales × schema configs.
 *              The browser also exports a small parquet fixture at the end.
 *   Phase 2 – Cloud: the fixture is served over HTTP from the local server,
 *              registered in DuckDB via registerFileURL (HTTP protocol), and
 *              the same query suite runs against it. This exercises DuckDB's
 *              HTTP range-request code path — the same path used for real
 *              S3 / cloud parquet sources in BFF.
 *
 * Usage:
 *   node scripts/run-benchmark.js [--skip-build]
 *
 * Output:
 *   packages/web/benchmark-results-<branch>.json
 */

"use strict";

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST_DIR = path.join(__dirname, "..", "benchmark", "dist");
const RESULTS_DIR = path.join(__dirname, "..");
const PORT = 18765;
// 30 minutes: large-scale table creation (10M rows) + full query suite
const TIMEOUT_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIME = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".js.map": "application/json",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".parquet": "application/octet-stream",
};

function mimeFor(filePath) {
    for (const [ext, type] of Object.entries(MIME)) {
        if (filePath.endsWith(ext)) return type;
    }
    return "application/octet-stream";
}

/**
 * Serve the benchmark dist directory with the COOP/COEP headers that enable
 * SharedArrayBuffer in Chromium.
 *
 * We use COEP: credentialless (rather than require-corp) so that the
 * cross-origin jsDelivr CDN resources used by @duckdb/duckdb-wasm load
 * without needing a Cross-Origin-Resource-Policy header from the CDN.
 *
 * Range requests are supported so DuckDB-WASM can perform partial reads from
 * the parquet fixture file (mirroring real S3 / cloud parquet access).
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const relPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
            const fullPath = path.join(DIST_DIR, relPath);

            let content;
            try {
                content = fs.readFileSync(fullPath);
            } catch {
                res.writeHead(404);
                res.end("Not found: " + relPath);
                return;
            }

            const contentType = mimeFor(fullPath);
            const baseHeaders = {
                "Content-Type": contentType,
                "Accept-Ranges": "bytes",
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "credentialless",
            };

            // Handle byte-range requests (used by DuckDB's HTTP range-read path)
            const rangeHeader = req.headers["range"];
            if (rangeHeader) {
                const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
                if (match) {
                    const start = parseInt(match[1], 10);
                    const end = match[2] ? parseInt(match[2], 10) : content.length - 1;
                    const chunk = content.slice(start, end + 1);
                    res.writeHead(206, {
                        ...baseHeaders,
                        "Content-Range": `bytes ${start}-${end}/${content.length}`,
                        "Content-Length": chunk.length,
                    });
                    res.end(chunk);
                    return;
                }
            }

            res.writeHead(200, {
                ...baseHeaders,
                "Content-Length": content.length,
            });
            res.end(content);
        });

        server.on("error", reject);
        server.listen(PORT, () => {
            console.log(`[server] Serving ${DIST_DIR} on http://localhost:${PORT}`);
            resolve(server);
        });
    });
}

function buildBenchmark() {
    console.log("[build] Building benchmark bundle...");
    execSync("npx webpack --config benchmark/webpack.config.js", {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
    });
    console.log("[build] Done.");
}

// ---------------------------------------------------------------------------
// Branch name / results file
// ---------------------------------------------------------------------------

function getCurrentBranch() {
    // CI sets GITHUB_REF_NAME; fall back to git locally
    if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" }).toString().trim();
    } catch {
        return "unknown";
    }
}

/** Sanitize a branch name for use in a filename (replace path separators and spaces). */
function slugify(branch) {
    return branch.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const skipBuild = process.argv.includes("--skip-build");

    if (!skipBuild) {
        buildBenchmark();
    }

    if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
        throw new Error(
            `Benchmark dist not found at ${DIST_DIR}. Run without --skip-build or build manually.`
        );
    }

    const server = await startServer();
    const browser = await chromium.launch({ headless: true });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Surface browser errors for debugging CI failures
        page.on("console", (msg) => {
            const type = msg.type();
            if (type === "error" || type === "warn") {
                console.log(`[browser:${type}]`, msg.text());
            }
        });
        page.on("pageerror", (err) => {
            console.error("[browser:pageerror]", err.message);
        });

        console.log("[playwright] Navigating to benchmark page...");
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });

        // -----------------------------------------------------------------------
        // Phase 1: wait for in-memory benchmarks to complete and fixture exported
        // -----------------------------------------------------------------------
        console.log("[playwright] Waiting for in-memory benchmark to complete...");
        await page.waitForFunction(
            () => window.__inMemoryDone === true || typeof window.__benchmarkError !== "undefined",
            { timeout: TIMEOUT_MS }
        );

        const phaseOneError = await page.evaluate(() => window.__benchmarkError ?? null);
        if (phaseOneError) {
            throw new Error(`Benchmark failed in browser (phase 1): ${phaseOneError}`);
        }

        // Read the parquet fixture buffer from the browser and write it to disk
        console.log("[playwright] Reading fixture parquet from browser...");
        const fixtureArray = await page.evaluate(() => window.__fixtureParquet);
        const fixturesDir = path.join(DIST_DIR, "fixtures");
        fs.mkdirSync(fixturesDir, { recursive: true });
        fs.writeFileSync(path.join(fixturesDir, "fixture.parquet"), Buffer.from(fixtureArray));
        console.log(
            `[playwright] Wrote fixture (${fixtureArray.length} bytes) to ${fixturesDir}/fixture.parquet`
        );

        // -----------------------------------------------------------------------
        // Phase 2: signal the browser to start the cloud benchmark
        // -----------------------------------------------------------------------
        const cloudUrl = `http://localhost:${PORT}/fixtures/fixture.parquet`;
        console.log(`[playwright] Starting cloud benchmark phase (${cloudUrl})...`);
        await page.evaluate((url) => window.__startCloudPhase(url), cloudUrl);

        console.log("[playwright] Waiting for cloud benchmark to complete...");
        await page.waitForFunction(
            () =>
                typeof window.__benchmarkResults !== "undefined" ||
                typeof window.__benchmarkError !== "undefined",
            { timeout: TIMEOUT_MS }
        );

        const rawResults = await page.evaluate(() => window.__benchmarkResults ?? null);
        const benchmarkError = await page.evaluate(() => window.__benchmarkError ?? null);

        if (benchmarkError) {
            throw new Error(`Benchmark failed in browser (phase 2): ${benchmarkError}`);
        }

        // Attach git metadata
        const branch = getCurrentBranch();
        const results = {
            ...rawResults,
            commit: process.env.GITHUB_SHA ?? "local",
            branch,
        };

        // Write to a branch-stamped file so multiple runs don't clobber each other
        const slug = slugify(branch);
        const resultsFile = path.join(RESULTS_DIR, `benchmark-results-${slug}.json`);
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`[runner] Results written to ${resultsFile}`);
    } finally {
        await browser.close();
        await new Promise((res) => server.close(res));
    }
}

main().catch((err) => {
    console.error("[fatal]", err.message);
    process.exit(1);
});
