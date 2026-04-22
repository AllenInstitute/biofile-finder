/**
 * Shared Playwright runner used by both benchmark tools.
 *
 * Builds the benchmark bundle (optional), starts the local HTTP server with
 * the COOP/COEP headers required for SharedArrayBuffer, injects a
 * BenchmarkConfig into the page, and returns the BenchmarkResults.
 */

"use strict";

const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DIST_DIR = path.join(__dirname, "..", "..", "benchmark", "dist");
const FIXTURES_DIR = path.join(__dirname, "..", "..", "fixtures");
const PORT = 18765;
const TIMEOUT_MS = 90 * 60 * 1000; // 90 min: 10M row source + full task suite

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

function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const relPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];

            // Serve local fixture files from /fixtures/
            const fixtureMatch = relPath.match(/^\/fixtures\/(.+)$/);
            if (fixtureMatch) {
                const fixturePath = path.join(FIXTURES_DIR, fixtureMatch[1]);
                try {
                    const stat = fs.statSync(fixturePath);
                    const range = req.headers["range"];
                    if (range) {
                        const [, start, end] = range.match(/bytes=(\d+)-(\d*)/) || [];
                        const startByte = parseInt(start, 10);
                        const endByte = end ? parseInt(end, 10) : stat.size - 1;
                        const chunkSize = endByte - startByte + 1;
                        res.writeHead(206, {
                            "Content-Type": "application/octet-stream",
                            "Content-Range": `bytes ${startByte}-${endByte}/${stat.size}`,
                            "Content-Length": chunkSize,
                            "Accept-Ranges": "bytes",
                            "Cross-Origin-Opener-Policy": "same-origin",
                            "Cross-Origin-Embedder-Policy": "credentialless",
                        });
                        const stream = fs.createReadStream(fixturePath, {
                            start: startByte,
                            end: endByte,
                        });
                        stream.pipe(res);
                    } else {
                        res.writeHead(200, {
                            "Content-Type": "application/octet-stream",
                            "Content-Length": stat.size,
                            "Accept-Ranges": "bytes",
                            "Cross-Origin-Opener-Policy": "same-origin",
                            "Cross-Origin-Embedder-Policy": "credentialless",
                        });
                        fs.createReadStream(fixturePath).pipe(res);
                    }
                } catch {
                    res.writeHead(404);
                    res.end("Not found: " + relPath);
                }
                return;
            }

            const fullPath = path.join(DIST_DIR, relPath);
            let content;
            try {
                content = fs.readFileSync(fullPath);
            } catch {
                res.writeHead(404);
                res.end("Not found: " + relPath);
                return;
            }
            res.writeHead(200, {
                "Content-Type": mimeFor(fullPath),
                "Content-Length": content.length,
                "Cross-Origin-Opener-Policy": "same-origin",
                "Cross-Origin-Embedder-Policy": "credentialless",
            });
            res.end(content);
        });
        server.on("error", reject);
        server.listen(PORT, () => resolve(server));
    });
}

function buildBenchmark() {
    console.log("[build] Building benchmark bundle...");
    execSync("npx webpack --config benchmark/webpack.config.js", {
        cwd: path.join(__dirname, "..", ".."),
        stdio: "inherit",
    });
    console.log("[build] Done.");
}

/**
 * Run the benchmark page with the given config and return the BenchmarkResults.
 *
 * @param {object} options
 * @param {{ url: string, label: string }[]} options.sources  Parquet sources to benchmark.
 * @param {boolean} [options.skipBuild=false]                  Skip webpack build.
 * @param {number}  [options.iterations]                        Override timed iteration count.
 * @param {number}  [options.warmupRounds]                      Override warmup round count.
 * @returns {Promise<object>}  Raw BenchmarkResults from the page.
 */
async function runBenchmarkPage({ sources, skipBuild = false, iterations, warmupRounds }) {
    if (!skipBuild) buildBenchmark();

    if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
        throw new Error(
            `Benchmark dist not found at ${DIST_DIR}. Build first or pass skipBuild: true.`
        );
    }

    const server = await startServer();
    const browser = await chromium.launch({ headless: true });

    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        page.on("console", (msg) => {
            console.log(`[browser:${msg.type()}]`, msg.text());
        });
        page.on("pageerror", (err) => console.error("[browser:pageerror]", err.message));

        // Inject config before the page script runs so the benchmark can read it
        // synchronously on startup — no callback handshake needed.
        await page.addInitScript({
            content: `window.__benchmarkConfig = ${JSON.stringify({
                sources,
                iterations,
                warmupRounds,
            })};`,
        });

        console.log(`[playwright] Starting benchmark (${sources.length} source(s))...`);
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });

        await page.waitForFunction(
            () =>
                typeof window.__benchmarkResults !== "undefined" ||
                typeof window.__benchmarkError !== "undefined",
            null,
            { timeout: TIMEOUT_MS }
        );

        const error = await page.evaluate(() => window.__benchmarkError ?? null);
        if (error) throw new Error(`Benchmark failed in browser: ${error}`);

        return await page.evaluate(() => window.__benchmarkResults);
    } finally {
        await browser.close();
        await new Promise((res) => server.close(res));
    }
}

module.exports = { runBenchmarkPage };
