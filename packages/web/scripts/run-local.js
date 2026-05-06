// Local benchmark runner for developer machines. Supports cloud (S3/https) and local
// fixtures, single scale or all scales, and side-by-side cloud vs local comparison (--full).

"use strict";

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { runBenchmarkPage } = require("./lib/run-benchmark-page");

const LOCAL_BASE = "http://localhost:18765/fixtures/synthetic";
const REMOTE_BASE =
    "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1/synthetic";
const FILE_TO_ENV = {
    "100k": "BENCHMARK_REAL_100K_URL",
    "1m": "BENCHMARK_REAL_1M_URL",
    "10m": "BENCHMARK_REAL_10M_URL",
    "10m-copy": "BENCHMARK_REAL_10M_2_URL",
};

const TEST_CASES_MAP = {
    "100k": ["100k"],
    "1m": ["1m"],
    "10m": ["10m"],
    "10m+10m": ["10m", "10m-copy"],
};

const useLocal = process.argv.includes("--local");
const useFull = process.argv.includes("--full");

const scaleArg = (() => {
    const idx = process.argv.indexOf("--scale");
    return idx !== -1 ? process.argv[idx + 1] : null;
})();

function getURL(partialFileName, useLocal) {
    if (!partialFileName in FILE_TO_ENV) {
        throw new Error(
            `${partialFileName} not recognized. Choose from ${Object.keys(FILE_TO_ENV)}`
        );
    }
    if (useLocal) {
        return `${LOCAL_BASE}-${partialFileName}.parquet`;
    } else {
        return (
            process.env[FILE_TO_ENV[partialFileName]] ?? `${REMOTE_BASE}-${partialFileName}.parquet`
        );
    }
}

function getSources(partialFileNames, useLocal, addSuffix) {
    const suffix = useLocal ? "local" : "cloud";
    return partialFileNames.map((file) => {
        return {
            label: addSuffix ? `${file}-${suffix}` : file,
            url: getURL(file, useLocal),
        };
    });
}

let testCases;
if (useFull) {
    testCases = [];
    Object.values(TEST_CASES_MAP).forEach((files) => {
        testCases.push(getSources(files, false));
        testCases.push(getSources(files, true));
    });
} else if (scaleArg) {
    testCases = [getSources(TEST_CASES_MAP[scaleArg], useLocal)];
} else {
    testCases = Object.values(TEST_CASES_MAP).map((files) => {
        return getSources(files, useLocal);
    });
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

    console.log(`[local] Running against ${testCases.length} test case(s):`);
    for (const testCase of testCases) {
        console.log(testCase);
    }
    if (iterations) console.log(`[local] Iterations: ${iterations}`);
    if (warmup !== undefined) console.log(`[local] Warmup rounds: ${warmup}`);
    console.log(
        `[local] Browser: ${
            channel ? `system Chrome (channel: ${channel})` : "Playwright bundled Chromium"
        }`
    );

    const rawResults = await runBenchmarkPage({
        testCases,
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

main();
