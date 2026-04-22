import { BENCHMARK_TASKS, createServices } from "./tasks";
import { BenchmarkConfig, BenchmarkResults, QueryResult, SourceResult } from "./types";
import DatabaseServiceWebWorker from "../../src/services/DatabaseServiceWeb/duckdb-worker.worker";

const DEFAULT_ITERATIONS = 20;
const DEFAULT_WARMUP_ROUNDS = 3;

function setStatus(msg: string) {
    const el = document.getElementById("status");
    if (el) el.textContent = msg;
    console.log("[benchmark]", msg);
}

function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

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
 * methods the app calls in response to user interactions. Timing covers the full
 * round-trip: service call → worker IPC → DuckDB → result deserialization.
 */
async function benchmarkSource(
    service: DatabaseServiceWebWorker,
    sourceName: string,
    iterations: number,
    warmupRounds: number
): Promise<QueryResult[]> {
    const { annotationSvc, fileSvc } = createServices(service, sourceName);

    setStatus(`Warming up ${sourceName} (${warmupRounds} rounds)...`);
    for (let w = 0; w < warmupRounds; w++) {
        for (const task of BENCHMARK_TASKS) {
            await task.run(annotationSvc, fileSvc);
        }
    }

    const timingsMap = new Map<string, number[]>(BENCHMARK_TASKS.map(({ name }) => [name, []]));

    for (let i = 0; i < iterations; i++) {
        setStatus(`Timing ${sourceName} — iteration ${i + 1}/${iterations}...`);
        for (const task of shuffle(BENCHMARK_TASKS)) {
            const start = performance.now();
            await task.run(annotationSvc, fileSvc);
            timingsMap.get(task.name)!.push(performance.now() - start);
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

    const sources: SourceResult[] = [];

    for (const source of config.sources) {
        setStatus(`Registering ${source.label} (${source.url})...`);

        const regStart = performance.now();
        await service.prepareDataSources(
            [{ name: source.label, type: "parquet", uri: source.url }],
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
