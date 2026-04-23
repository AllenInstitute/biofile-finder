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

// fs.readFileSync is limited to 2 GB. For larger fixtures we read in 512 MB chunks
// and store them as an array so slice() can reconstruct any byte range on demand.
const PRELOAD_CHUNK_SIZE = 512 * 1024 * 1024;

function readFileChunked(filePath, totalSize) {
    const fd = fs.openSync(filePath, "r");
    const chunks = []; // [{ offset, buf }]
    try {
        let offset = 0;
        while (offset < totalSize) {
            const chunkSize = Math.min(PRELOAD_CHUNK_SIZE, totalSize - offset);
            const buf = Buffer.allocUnsafe(chunkSize);
            let pos = 0;
            while (pos < chunkSize) {
                const n = fs.readSync(fd, buf, pos, chunkSize - pos, offset + pos);
                if (n === 0) break;
                pos += n;
            }
            chunks.push({ offset, buf });
            offset += chunkSize;
        }
    } finally {
        fs.closeSync(fd);
    }
    return { chunks, totalSize };
}

function sliceChunked({ chunks, totalSize: _totalSize }, start, end) {
    const size = end - start + 1;
    const out = Buffer.allocUnsafe(size);
    let written = 0;
    for (const { offset, buf } of chunks) {
        const chunkEnd = offset + buf.length - 1;
        if (chunkEnd < start || offset > end) continue;
        const from = Math.max(start, offset) - offset;
        const to = Math.min(end, chunkEnd) - offset + 1;
        buf.copy(out, written, from, to);
        written += to - from;
    }
    return out;
}

/**
 * Pre-load fixture files into Node.js Buffers so DuckDB's HTTP range requests
 * are served from RAM instead of disk. This eliminates per-request I/O latency
 * that would otherwise make compute-heavy queries like full-table sorts appear
 * much slower than they do in a real browser session (where the data is cached).
 */
function preloadFixtures(sources) {
    const fixtureBuffers = new Map();
    for (const source of sources) {
        const localMatch = source.url.match(new RegExp(`^http://localhost:${PORT}/fixtures/(.+)$`));
        if (!localMatch) continue;
        const fixturePath = path.join(FIXTURES_DIR, localMatch[1]);
        if (!fs.existsSync(fixturePath)) continue;
        const { size } = fs.statSync(fixturePath);
        const sizeMB = (size / 1024 / 1024).toFixed(0);
        console.log(`[server] Preloading ${localMatch[1]} (${sizeMB} MB) into memory...`);
        const t = Date.now();
        fixtureBuffers.set(fixturePath, readFileChunked(fixturePath, size));
        console.log(`[server] Done in ${Date.now() - t}ms.`);
    }
    return fixtureBuffers;
}

function startServer(fixtureBuffers = new Map()) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const relPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];

            // Serve local fixture files from /fixtures/
            const fixtureMatch = relPath.match(/^\/fixtures\/(.+)$/);
            if (fixtureMatch) {
                const fixturePath = path.join(FIXTURES_DIR, fixtureMatch[1]);
                const memFile = fixtureBuffers.get(fixturePath);
                if (memFile) {
                    // Serve from pre-loaded in-memory chunks
                    const range = req.headers["range"];
                    if (range) {
                        const [, start, end] = range.match(/bytes=(\d+)-(\d*)/) || [];
                        const startByte = parseInt(start, 10);
                        const endByte = end ? parseInt(end, 10) : memFile.totalSize - 1;
                        const chunk = sliceChunked(memFile, startByte, endByte);
                        res.writeHead(206, {
                            "Content-Type": "application/octet-stream",
                            "Content-Range": `bytes ${startByte}-${endByte}/${memFile.totalSize}`,
                            "Content-Length": chunk.length,
                            "Accept-Ranges": "bytes",
                            "Cross-Origin-Opener-Policy": "same-origin",
                            "Cross-Origin-Embedder-Policy": "credentialless",
                        });
                        res.end(chunk);
                    } else {
                        const full = sliceChunked(memFile, 0, memFile.totalSize - 1);
                        res.writeHead(200, {
                            "Content-Type": "application/octet-stream",
                            "Content-Length": memFile.totalSize,
                            "Accept-Ranges": "bytes",
                            "Cross-Origin-Opener-Policy": "same-origin",
                            "Cross-Origin-Embedder-Policy": "credentialless",
                        });
                        res.end(full);
                    }
                    return;
                }
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
 * @param {string}  [options.channel]                           Chrome channel to use. Pass "chrome"
 *                                                              to launch the system Chrome binary
 *                                                              for JIT-accurate local profiling.
 *                                                              Omit to use Playwright's bundled
 *                                                              Chromium (default; required for CI).
 * @returns {Promise<object>}  Raw BenchmarkResults from the page.
 */
async function runBenchmarkPage({ sources, skipBuild = false, iterations, warmupRounds, channel }) {
    if (!skipBuild) buildBenchmark();

    if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
        throw new Error(
            `Benchmark dist not found at ${DIST_DIR}. Build first or pass skipBuild: true.`
        );
    }

    const launchOptions = { headless: true };
    if (channel) launchOptions.channel = channel;

    const fixtureBuffers = preloadFixtures(sources);
    const server = await startServer(fixtureBuffers);
    const browser = await chromium.launch(launchOptions);

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

        // Wait for the benchmark to signal it's ready for file injection
        await page.waitForFunction(() => window.__localFilesRequested === true, null, {
            timeout: 10000,
        });

        // Inject each local fixture as a real File object via setInputFiles.
        // The browser reads the file lazily via FileReader (BROWSER_FILEREADER protocol),
        // which is identical to how the real app loads files via the file picker —
        // no HTTP range-request overhead, so DuckDB sort performance matches real-user timing.
        for (const source of sources) {
            const localMatch = source.url.match(
                new RegExp(`^http://localhost:${PORT}/fixtures/(.+)$`)
            );
            if (!localMatch) continue;
            const fixturePath = path.join(FIXTURES_DIR, localMatch[1]);
            if (!fs.existsSync(fixturePath)) continue;

            console.log(`[playwright] Injecting ${source.label} via setInputFiles...`);
            const inputHandle = await page.evaluateHandle(() => {
                const inp = document.createElement("input");
                inp.type = "file";
                document.body.appendChild(inp);
                return inp;
            });
            await inputHandle.setInputFiles(fixturePath);
            await page.evaluate((label) => {
                const inputs = document.querySelectorAll("input[type=file]");
                const inp = inputs[inputs.length - 1];
                window.__pendingLocalFiles = window.__pendingLocalFiles || {};
                window.__pendingLocalFiles[label] = inp.files[0];
                inp.remove();
            }, source.label);
        }

        // Signal the benchmark to proceed with injected File objects
        await page.evaluate(() => {
            if (window.__resolveLocalFiles) {
                window.__resolveLocalFiles(window.__pendingLocalFiles || {});
            }
        });

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
