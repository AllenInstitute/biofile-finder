// Local benchmark runner for developer machines. Supports cloud (S3/https) and local
// fixtures, single scale or all scales, and side-by-side cloud vs local comparison (--full).

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
    "100k":
        process.env.BENCHMARK_REAL_100K_URL ??
        "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1/synthetic-100k.parquet",
    "1m":
        process.env.BENCHMARK_REAL_1M_URL ??
        "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1/synthetic-1m.parquet",
    "10m":
        process.env.BENCHMARK_REAL_10M_URL ??
        "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1/synthetic-10m.parquet",
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
    const useChromium = process.argv.includes("--chromium");
    const channel = useChromium ? undefined : "chrome";
    const iterations = getArgValue("--iterations");
    const warmup = getArgValue("--warmup");

    console.log(`[local] Running against ${sources.length} real parquet source(s):`);
    for (const { label, url } of sources) {
        console.log(`  ${label}: ${url}`);
    }
    if (iterations) console.log(`[local] Iterations: ${iterations}`);
    if (warmup !== undefined) console.log(`[local] Warmup rounds: ${warmup}`);
    console.log(
        `[local] Browser: ${
            channel ? `system Chrome (channel: ${channel})` : "Playwright bundled Chromium"
        }`
    );

    const rawResults = await runBenchmarkPage({
        sources,
        skipBuild,
        iterations,
        warmupRounds: warmup,
        channel,
    });

    const branch = getBranch();
    const results = {
        ...rawResults,
        commit: process.env.GITHUB_SHA ?? getCommit(),
        branch,
    };

    const outFile = path.join(__dirname, "..", "benchmark-results-local.json");
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`\n[local] Results written to ${path.relative(process.cwd(), outFile)}`);

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
