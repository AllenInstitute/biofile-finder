/**
 * run-benchmark.js
 *
 * Builds the benchmark bundle, serves it in a local HTTP server with the
 * Cross-Origin isolation headers required for SharedArrayBuffer (and therefore
 * DuckDB-WASM's pthread bundle), then uses Playwright to run the benchmark
 * in real Chromium and collect the results.
 *
 * Usage:
 *   node scripts/run-benchmark.js [--skip-build]
 *
 * Output:
 *   packages/web/benchmark-results.json
 */

"use strict";

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST_DIR = path.join(__dirname, "..", "benchmark", "dist");
const RESULTS_FILE = path.join(__dirname, "..", "benchmark-results.json");
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
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const relPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
            const fullPath = path.join(DIST_DIR, relPath);

            try {
                const content = fs.readFileSync(fullPath);
                res.writeHead(200, {
                    "Content-Type": mimeFor(fullPath),
                    "Cross-Origin-Opener-Policy": "same-origin",
                    "Cross-Origin-Embedder-Policy": "credentialless",
                });
                res.end(content);
            } catch {
                res.writeHead(404);
                res.end("Not found: " + relPath);
            }
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

        console.log("[playwright] Waiting for benchmark to complete (timeout: 10m)...");
        await page.waitForFunction(
            () =>
                typeof window.__benchmarkResults !== "undefined" ||
                typeof window.__benchmarkError !== "undefined",
            { timeout: TIMEOUT_MS }
        );

        const rawResults = await page.evaluate(() => window.__benchmarkResults ?? null);
        const benchmarkError = await page.evaluate(() => window.__benchmarkError ?? null);

        if (benchmarkError) {
            throw new Error(`Benchmark failed in browser: ${benchmarkError}`);
        }

        // Attach git metadata from the CI environment (empty strings locally)
        const results = {
            ...rawResults,
            commit: process.env.GITHUB_SHA ?? "local",
            branch: process.env.GITHUB_REF_NAME ?? "local",
        };

        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

        // Summary to stdout
        console.log("\n=== Benchmark Summary ===");
        console.log(`Branch:    ${results.branch}`);
        console.log(`Commit:    ${results.commit}`);
        console.log(`Init time: ${results.initTimeMs.toFixed(1)} ms`);
        console.log(`Queries:   ${results.results.length} results`);
        console.log(`Output:    ${RESULTS_FILE}`);
        console.log("=========================\n");
    } finally {
        await browser.close();
        await new Promise((res) => server.close(res));
    }
}

main().catch((err) => {
    console.error("[fatal]", err.message);
    process.exit(1);
});
