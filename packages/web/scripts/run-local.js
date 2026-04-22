/**
 * run-local.js  —  Tool 1: Local performance profiler
 *
 * Runs the full benchmark query suite against real BFF parquets hosted on S3,
 * using the production DuckDB code paths (prepareDataSources → queryWorker).
 * Designed to be run by a developer on their own machine to get accurate
 * absolute timing numbers that reflect real-world query performance.
 *
 * Usage:
 *   BENCHMARK_REAL_100K_URL=s3://... \
 *   BENCHMARK_REAL_1M_URL=s3://...  \
 *   BENCHMARK_REAL_10M_URL=s3://... \
 *   node scripts/run-local.js [--scale 100k|1m|10m] [--iterations N] [--warmup N] [--local] [--full] [--skip-build]
 *
 * --scale limits the run to a single fixture size. Omit to run all set URLs.
 * --iterations overrides the number of timed iterations (default 20).
 * --warmup overrides the number of warmup rounds (default 3).
 * --local serves fixtures from packages/web/fixtures/ over localhost instead of using S3 URLs.
 *   URL env vars are not required when using --local.
 * --full runs all three scales for both cloud and local in one session, labelled
 *   "<scale>-cloud" and "<scale>-local". Requires all three URL env vars to be set.
 * At least one URL must be set (unless --local or --full with no URLs is used). URLs may be s3:// or https://.
 *
 * Output:
 *   Prints a human-readable timing table to stdout.
 *   Optionally writes benchmark-results-local.json for later comparison.
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { runBenchmarkPage } = require("./lib/run-benchmark-page");

const LOCAL_FIXTURE_MAP = {
    "100k": "http://localhost:18765/fixtures/synthetic-100k.parquet",
    "1m": "http://localhost:18765/fixtures/synthetic-1m.parquet",
    "10m": "http://localhost:18765/fixtures/synthetic-10m.parquet",
};

const REMOTE_URL_MAP = {
    "100k": process.env.BENCHMARK_REAL_100K_URL,
    "1m": process.env.BENCHMARK_REAL_1M_URL,
    "10m": process.env.BENCHMARK_REAL_10M_URL,
};

const useLocal = process.argv.includes("--local");
const useFull = process.argv.includes("--full");

const scaleArg = (() => {
    const idx = process.argv.indexOf("--scale");
    return idx !== -1 ? process.argv[idx + 1] : null;
})();

const URL_MAP = useLocal ? LOCAL_FIXTURE_MAP : REMOTE_URL_MAP;

if (scaleArg && !URL_MAP[scaleArg] && !useFull) {
    console.error(
        `Error: --scale "${scaleArg}" is not a valid scale. Choose from: ${Object.keys(
            URL_MAP
        ).join(", ")}`
    );
    process.exit(1);
}

let sources;
if (useFull) {
    const missingUrls = Object.entries(REMOTE_URL_MAP)
        .filter(([, url]) => !url)
        .map(([label]) => `  BENCHMARK_REAL_${label.toUpperCase()}_URL`);
    if (missingUrls.length > 0) {
        console.error(
            `Error: --full requires all three cloud URLs to be set:\n${missingUrls.join("\n")}`
        );
        process.exit(1);
    }
    // Interleave cloud and local sources per scale for easy side-by-side reading
    sources = Object.keys(REMOTE_URL_MAP).flatMap((label) => [
        { label: `${label}-cloud`, url: REMOTE_URL_MAP[label] },
        { label: `${label}-local`, url: LOCAL_FIXTURE_MAP[label] },
    ]);
} else {
    sources = Object.entries(URL_MAP)
        .filter(([label, url]) => Boolean(url) && (!scaleArg || label === scaleArg))
        .map(([label, url]) => ({ label, url }));
}

if (sources.length === 0) {
    console.error(
        "No real parquet URLs provided.\n" +
            "Set one or more of:\n" +
            "  BENCHMARK_REAL_100K_URL\n" +
            "  BENCHMARK_REAL_1M_URL\n" +
            "  BENCHMARK_REAL_10M_URL\n" +
            "Or use --local to serve fixtures from packages/web/fixtures/.\n" +
            "Or use --full to run cloud + local for all scales."
    );
    process.exit(1);
}

function getArgValue(flag) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : undefined;
}

async function main() {
    const skipBuild = process.argv.includes("--skip-build");
    const iterations = getArgValue("--iterations");
    const warmup = getArgValue("--warmup");

    console.log(`[local] Running against ${sources.length} real parquet source(s):`);
    for (const { label, url } of sources) {
        console.log(`  ${label}: ${url}`);
    }
    if (iterations) console.log(`[local] Iterations: ${iterations}`);
    if (warmup !== undefined) console.log(`[local] Warmup rounds: ${warmup}`);

    const rawResults = await runBenchmarkPage({
        sources,
        skipBuild,
        iterations,
        warmupRounds: warmup,
    });

    // Attach git metadata
    const branch = getBranch();
    const results = {
        ...rawResults,
        commit: process.env.GITHUB_SHA ?? getCommit(),
        branch,
    };

    // Write JSON so developers can run compare-results.js between local runs
    const outFile = path.join(__dirname, "..", "benchmark-results-local.json");
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`\n[local] Results written to ${path.relative(process.cwd(), outFile)}`);

    // Print human-readable summary
    execSync(`node ${path.join(__dirname, "summarize-results.js")} "${outFile}"`, {
        stdio: "inherit",
    });
}

function getBranch() {
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" }).toString().trim();
    } catch {
        return "unknown";
    }
}

function getCommit() {
    try {
        return execSync("git rev-parse --short HEAD", { stdio: "pipe" }).toString().trim();
    } catch {
        return "unknown";
    }
}

main().catch((err) => {
    console.error("[fatal]", err.message);
    process.exit(1);
});
