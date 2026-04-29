import { BENCHMARK_TASKS, createServices } from "./tasks";
import { BenchmarkConfig, BenchmarkResults, QueryResult, SourceResult } from "./types";
import DatabaseServiceWebWorker from "../../src/services/DatabaseServiceWeb/duckdb-worker.worker";

const DEFAULT_ITERATIONS = 5;
const DEFAULT_WARMUP_ROUNDS = 1;

// Updates the #status element in the benchmark HTML page and mirrors to console.
// The page can run headlessly in CI (Playwright), so the console log is the
// only visible progress signal when there is no browser UI to observe.
function setStatus(msg: string) {
    const el = document.getElementById("status");
    if (el) el.textContent = msg;
    console.log("[benchmark]", msg);
}

// Nearest-rank percentile over a pre-sorted array. Used to report p50 and p95
// across timed iterations — p95 surfaces occasional slow outliers (GC pauses,
// DuckDB cache misses) that the median would hide.
function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

// Fisher-Yates shuffle — randomizes task order each timed iteration so that a
// consistently slow task doesn't inflate the times of everything that follows it
// (DuckDB buffer pool and OS page cache warm up over repeated runs).
function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * Run the full task suite against a registered source using round-robin timing:
 * warmup rounds first, then timed rounds with shuffled task order.
 *
 * Tasks are called at the service layer (fetchValues, getFiles, etc.) — the same
 * methods the app calls in response to user interactions.
 *
 * Timing strategy per task (see BenchmarkTask.timing):
 *   "worker" (default): sums DuckDB-internal query times, excluding Arrow→JS conversion
 *     and JSON serialization. Accurate for single-query tasks and tasks with large result sets.
 *   "wall-clock": measures elapsed time at the task level. Used for compound tasks that fire
 *     parallel queries — worker timings for those give O(N²) due to cumulative wait time.
 *
 * Returns p50/p95/p99 across timed iterations for each task.
 */
async function benchmarkSource(
    service: DatabaseServiceWebWorker,
    sourceName: string,
    iterations: number,
    warmupRounds: number
): Promise<QueryResult[]> {
    const { annotationSvc, fileSvc } = createServices(service, sourceName);

    service.enableQueryTiming();

    // Warmup ensures DuckDB's buffer pool, query planner, and V8 JIT are in a
    // stable state before timing begins. Without it, the first few iterations
    // of every task reflect cold-start overhead rather than steady-state cost.
    setStatus(`Warming up ${sourceName} (${warmupRounds} rounds)...`);
    for (let w = 0; w < warmupRounds; w++) {
        for (const task of BENCHMARK_TASKS) {
            service.clearTimings();
            await task.run(annotationSvc, fileSvc);
        }
    }

    const timingsMap = new Map<string, number[]>(BENCHMARK_TASKS.map(({ name }) => [name, []]));

    for (let i = 0; i < iterations; i++) {
        setStatus(`Timing ${sourceName} — iteration ${i + 1}/${iterations}...`);
        for (const task of shuffle(BENCHMARK_TASKS)) {
            if (task.resetAnnotationCache) {
                service.clearAnnotationCache(sourceName);
            }
            if (task.timing === "wall-clock") {
                const start = performance.now();
                await task.run(annotationSvc, fileSvc);
                timingsMap.get(task.name)!.push(performance.now() - start);
            } else {
                service.clearTimings();
                await task.run(annotationSvc, fileSvc);
                timingsMap.get(task.name)!.push(service.sumTimings());
            }
        }
    }

    return BENCHMARK_TASKS.map(({ name }) => {
        const timings = [...(timingsMap.get(name) ?? [])].sort((a, b) => a - b);
        return {
            name,
            timings,
            p50: percentile(timings, 50),
            p95: percentile(timings, 95),
            p99: percentile(timings, 99),
        };
    });
}

async function main() {
    const config: BenchmarkConfig = (window as any).__benchmarkConfig;
    if (!config?.sources?.length) {
        throw new Error("No benchmark config found. Runner must inject window.__benchmarkConfig.");
    }
    const iterations = config.iterations ?? DEFAULT_ITERATIONS;
    const warmupRounds = config.warmupRounds ?? DEFAULT_WARMUP_ROUNDS;

    setStatus("Initializing DuckDB-WASM...");
    const initStart = performance.now();
    const service = new DatabaseServiceWebWorker();
    await service.initialize();
    const initTimeMs = performance.now() - initStart;
    setStatus(`DuckDB initialized in ${initTimeMs.toFixed(0)}ms.`);

    // DuckDB reads parquet differently depending on how the file is registered:
    // BROWSER_FILEREADER (local File object) skips all HTTP overhead; URL registration
    // uses HTTP range requests, which adds per-request I/O latency and makes sort-heavy
    // queries appear slower. Both paths must be consistent across compared runs or the
    // delta reflects I/O differences, not code differences.
    //
    // Playwright injects File objects via setInputFiles and resolves __resolveLocalFiles
    // directly. The 5-second timeout is a fallback for running the page manually outside
    // of Playwright — in CI this promise is always resolved before the timeout fires.
    const localFiles: Record<string, File> = await new Promise<Record<string, File>>((resolve) => {
        (window as any).__resolveLocalFiles = resolve;
        (window as any).__localFilesRequested = true;
        setTimeout(() => resolve({}), 5000);
    });

    // Absorb DuckDB's one-time parquet cold-start cost (scanner JIT, VFS setup,
    // buffer pool init) before timing any real source registrations. Without this,
    // the first source always shows inflated registration time regardless of file size.
    if (config.sources.length > 0) {
        const warmup = config.sources[0];
        const warmupFile = localFiles[warmup.label];
        await service.prepareDataSources(
            [{ name: "__bff_warmup__", type: "parquet", uri: warmupFile ?? warmup.url }],
            /* skipNormalization */ true
        );
        await service.execute('DROP VIEW IF EXISTS "__bff_warmup__"');
    }

    const sources: SourceResult[] = [];

    for (const source of config.sources) {
        setStatus(`Registering ${source.label} (${source.url})...`);

        const regStart = performance.now();
        const localFile = localFiles[source.label];
        if (!localFile) {
            console.warn(
                `[benchmark] No local file for ${source.label} — falling back to HTTP reads; timings will differ from local-file runs`
            );
        }
        await service.prepareDataSources(
            [{ name: source.label, type: "parquet", uri: localFile ?? source.url }],
            /* skipNormalization */ true
        );
        const registrationMs = performance.now() - regStart;

        const queries = await benchmarkSource(service, source.label, iterations, warmupRounds);
        sources.push({ label: source.label, registrationMs, queries });

        await service.execute(`DROP VIEW IF EXISTS "${source.label}"`);
    }

    setStatus("Done.");

    const results: BenchmarkResults = {
        timestamp: new Date().toISOString(),
        commit: "unknown",
        branch: "unknown",
        initTimeMs,
        sources,
    };

    (window as any).__benchmarkResults = results;
}

main().catch((err: Error) => {
    console.error("[benchmark] Fatal error:", err);
    setStatus(`Error: ${err.message}`);
    (window as any).__benchmarkError = err.message;
});
