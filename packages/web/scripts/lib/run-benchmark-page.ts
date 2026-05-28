/**
 * Shared Playwright runner used by both benchmark tools.
 *
 * Builds the benchmark bundle (optional), starts the local HTTP server with
 * the COOP/COEP headers required for SharedArrayBuffer, injects a
 * BenchmarkConfig into the page, and returns the BenchmarkResults.
 */

// This script uses the global window object to communicate with the playwright
// controller. The type declaration here adds the necessary variables to the
// window object's type, Window.
declare global {
    interface Window {
        __localFilesRequested: boolean;
        __pendingLocalFiles: any;
        __resolveLocalFiles: (
            value: Record<string, File> | PromiseLike<Record<string, File>>
        ) => void;
        __benchmarkResults: BenchmarkResults;
        __benchmarkError: string;
    }
}

import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { BenchmarkResults, QueryResult, SourceResult, TestCase } from "../../benchmark/src/types";
import { BENCHMARK_TASKS } from "../../benchmark/src/tasks";
import { DEFAULT_ITERATIONS, buildQueryResult } from "../../benchmark/src/stats";
const DIST_DIR = path.join(__dirname, "..", "..", "benchmark", "dist");
const FIXTURES_DIR = path.join(__dirname, "..", "..", "fixtures");
const PORT = 18765;
const TIMEOUT_MS = 90 * 60 * 1000; // 90 min: 10M row source + full task suite

// Content-type map for benchmark bundle assets served to the Playwright browser.
// WASM must be served as application/wasm or the browser will refuse to compile it.
const MIME = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".js.map": "application/json",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".parquet": "application/octet-stream",
};

function mimeFor(filePath: string) {
    for (const [ext, type] of Object.entries(MIME)) {
        if (filePath.endsWith(ext)) return type;
    }
    return "application/octet-stream";
}

function startServer(): Promise<
    http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const relPath =
                req.url === "/" || req.url === undefined ? "/index.html" : req.url.split("?")[0];

            // Serve fixture files from /fixtures/ — fallback path if file injection fails.
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
                        fs.createReadStream(fixturePath, { start: startByte, end: endByte }).pipe(
                            res
                        );
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
 * @param {{ url: string, label: string }[][]} options.testCases Parquet sources to benchmark.
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
export async function runBenchmarkPage({
    testCases,
    skipBuild = false,
    iterations,
    warmupRounds,
    channel,
}: {
    testCases: TestCase[];
    skipBuild?: boolean;
    iterations?: number;
    warmupRounds?: number;
    channel?: string;
}) {
    if (!skipBuild) buildBenchmark();

    if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
        throw new Error(
            `Benchmark dist not found at ${DIST_DIR}. Build first or pass skipBuild: true.`
        );
    }

    const server = await startServer();

    try {
        const allTaskNames = BENCHMARK_TASKS.map((task) => task.name);
        const iterationCount = iterations ?? DEFAULT_ITERATIONS;

        let initTimeMs = 0;
        const sourceResults: SourceResult[] = [];

        for (const testCase of testCases) {
            let registrationMs = 0;
            let queries: QueryResult[];

            if (warmupRounds === 0) {
                // Each (task, iteration) pair gets a fresh browser so every
                // measurement is a cold start.
                console.log(
                    `[playwright] warmupRounds=0: running ${allTaskNames.length} task(s) × ` +
                        `${iterationCount} iteration(s) in separate browser instances`
                );

                const timingsMap = new Map<string, number[]>(
                    allTaskNames.map((name) => [name, []])
                );

                for (const taskName of allTaskNames) {
                    for (let i = 0; i < iterationCount; i++) {
                        console.log(
                            `[playwright] Launching browser for "${taskName}" ` +
                                `iteration ${i + 1}/${iterationCount} ` +
                                `(${testCase.map((source) => source.label).join(", ")})`
                        );
                        const run = await runSingleBenchmark({
                            testCase,
                            iterations: 1,
                            warmupRounds: 0,
                            channel,
                            taskFilter: [taskName],
                        });

                        if (initTimeMs === 0) initTimeMs = run.initTimeMs;
                        if (registrationMs === 0) registrationMs = run.registrationMs;

                        const timing = run.queries[0]?.timings[0];
                        if (timing !== undefined) {
                            timingsMap.get(taskName)!.push(timing);
                        }
                    }
                }

                queries = allTaskNames.map((name) =>
                    buildQueryResult(name, timingsMap.get(name) ?? [])
                );
            } else {
                // Warmups > 0: all tasks share a single browser instance.
                console.log(
                    `[playwright] Launching browser for task(s): ${allTaskNames.join(", ")} ` +
                        `(${testCase.map((source) => source.label).join(", ")})`
                );
                const run = await runSingleBenchmark({
                    testCase,
                    iterations: iterationCount,
                    warmupRounds,
                    channel,
                    taskFilter: allTaskNames,
                });

                initTimeMs = initTimeMs || run.initTimeMs;
                registrationMs = run.registrationMs;
                queries = run.queries;
            }

            sourceResults.push({
                labels: testCase.map((source) => source.label),
                registrationMs,
                queries,
            });
        }

        return {
            timestamp: new Date().toISOString(),
            commit: "unknown",
            branch: "unknown",
            initTimeMs,
            results: sourceResults,
        } as BenchmarkResults;
    } finally {
        await new Promise((res) => server.close(res));
    }
}

async function runSingleBenchmark({
    testCase,
    iterations,
    warmupRounds,
    channel,
    taskFilter,
}: {
    testCase: TestCase;
    iterations: number;
    warmupRounds?: number;
    channel?: string;
    taskFilter: string[];
}): Promise<{ initTimeMs: number; registrationMs: number; queries: QueryResult[] }> {
    const browser = await chromium.launch({
        channel,
        headless: true,
    });

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
                testCases: [testCase],
                iterations,
                warmupRounds,
                taskFilter,
            })};`,
        });

        console.log(`[playwright] Starting benchmark...`);
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });

        // Wait for the benchmark to signal it's ready for file injection
        await page.waitForFunction(() => window.__localFilesRequested === true, null, {
            timeout: 10000,
        });

        // Inject each local fixture as a real File object via setInputFiles.
        // The browser reads the file lazily via FileReader (BROWSER_FILEREADER protocol),
        // which is identical to how the real app loads files via the file picker —
        // no HTTP range-request overhead, so DuckDB sort performance matches real-user timing.
        const loaded = new Set();
        for (const source of testCase) {
            if (source.label in loaded) continue; // Don't add duplicate sources
            const localMatch = source.url.match(
                new RegExp(`^http://localhost:${PORT}/fixtures/(.+)$`)
            );
            if (!localMatch) continue;
            const fixturePath = path.join(FIXTURES_DIR, localMatch[1]);
            if (!fs.existsSync(fixturePath)) continue;

            console.log(`[playwright] Injecting ${source.label} via setInputFiles...`);
            const inputHandle = await page.evaluateHandle(() => {
                const inp: HTMLInputElement = document.createElement("input");
                inp.type = "file";
                document.body.appendChild(inp);
                return inp;
            });
            await inputHandle.setInputFiles(fixturePath);
            await page.evaluate((label) => {
                const inputs: NodeListOf<HTMLInputElement> = document.querySelectorAll(
                    "input[type=file]"
                );
                const inp = inputs[inputs.length - 1];
                window.__pendingLocalFiles = window.__pendingLocalFiles || {};
                if (!inp.files) {
                    throw new Error(`Injected file not found for ${label}.`);
                }
                window.__pendingLocalFiles[label] = inp.files[0];
                inp.remove();
            }, source.label);
            loaded.add(source.label);
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

        const benchmarkResults: BenchmarkResults = await page.evaluate(
            () => window.__benchmarkResults
        );
        const result = benchmarkResults.results[0];
        return {
            initTimeMs: benchmarkResults.initTimeMs,
            registrationMs: result.registrationMs,
            queries: result.queries,
        };
    } finally {
        await browser.close();
    }
}

module.exports = { runBenchmarkPage };
