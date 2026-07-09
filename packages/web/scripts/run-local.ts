// Local benchmark runner for developer machines. Supports cloud (S3/https) and local
// fixtures, single scale or all scales, and side-by-side cloud vs local comparison (--full).

import { ParquetSource } from "../benchmark/src/types";

import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { runBenchmarkPage } from "./lib/run-benchmark-page";

const LOCAL_BASE = "http://localhost:18765/fixtures";
const REMOTE_BASE =
    "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1";

type FileIdentifier = "100k" | "1m" | "10m" | "10m-copy" | "20m";

// Fixture basename (no extension) for each identifier. The synthetic-* fixtures now carry
// both the flat scalar columns and the nested "Well" STRUCT[] column (added in place by
// scripts/augment_parquet_with_nested.py), so the nested_* tasks run against them directly.
const FILE_TO_BASENAME: Record<FileIdentifier, string> = {
    "100k": "synthetic-100k",
    "1m": "synthetic-1m",
    "10m": "synthetic-10m",
    "10m-copy": "synthetic-10m-copy",
    "20m": "synthetic-20m",
};

const FILE_TO_ENV = {
    "100k": "BENCHMARK_REAL_100K_URL",
    "1m": "BENCHMARK_REAL_1M_URL",
    "10m": "BENCHMARK_REAL_10M_URL",
    "10m-copy": "BENCHMARK_REAL_10M_2_URL",
    "20m": "BENCHMARK_REAL_20M_URL",
};

type ScaleIdentifier = "100k" | "1m" | "10m" | "10m+10m" | "20m";
const TEST_CASES_MAP = {
    "100k": ["100k"] as FileIdentifier[],
    "1m": ["1m"] as FileIdentifier[],
    "10m": ["10m"] as FileIdentifier[],
    "10m+10m": ["10m", "10m-copy"] as FileIdentifier[],
    "20m": ["20m"] as FileIdentifier[],
};

function validateScaleArg(scale: string): asserts scale is ScaleIdentifier {
    if (!(Object.keys(TEST_CASES_MAP).indexOf(scale) !== -1)) {
        throw new Error(`${scale} not recognized. Choose from ${Object.keys(TEST_CASES_MAP)}`);
    }
}

function getURL(partialFileName: FileIdentifier, useLocal: boolean) {
    if (!(partialFileName in FILE_TO_BASENAME)) {
        throw new Error(
            `${partialFileName} not recognized. Choose from ${Object.keys(FILE_TO_BASENAME)}`
        );
    }
    const basename = FILE_TO_BASENAME[partialFileName];
    if (useLocal) {
        return `${LOCAL_BASE}/${basename}.parquet`;
    } else {
        return process.env[FILE_TO_ENV[partialFileName]] ?? `${REMOTE_BASE}/${basename}.parquet`;
    }
}

function getSources(
    partialFileNames: FileIdentifier[],
    useLocal: boolean,
    addSuffix?: boolean
): ParquetSource[] {
    const suffix = useLocal ? "local" : "cloud";
    return partialFileNames.map((file) => {
        return {
            label: addSuffix ? `${file}-${suffix}` : file,
            url: getURL(file, useLocal),
        };
    });
}

function getArgValue(flag: string) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : undefined;
}

function parseArgs() {
    const scaleIdx = process.argv.indexOf("--scale");
    const scaleArg = scaleIdx !== -1 ? process.argv[scaleIdx + 1] : null;

    return {
        useLocal: process.argv.includes("--local"),
        useFull: process.argv.includes("--full"),
        scaleArg,
        skipBuild: process.argv.includes("--skip-build"),
        useChromium: process.argv.includes("--chromium"),
        iterations: getArgValue("--iterations"),
        warmup: getArgValue("--warmup"),
    };
}

async function main() {
    const { useLocal, useFull, scaleArg, skipBuild, useChromium, iterations, warmup } = parseArgs();

    let testCases: ParquetSource[][];
    if (useFull) {
        testCases = [];
        Object.values(TEST_CASES_MAP).forEach((files) => {
            testCases.push(getSources(files, false));
            testCases.push(getSources(files, true));
        });
    } else if (scaleArg) {
        validateScaleArg(scaleArg);
        testCases = [getSources(TEST_CASES_MAP[scaleArg], useLocal)];
    } else {
        testCases = Object.values(TEST_CASES_MAP).map((files) => {
            return getSources(files, useLocal);
        });
    }

    const channel = useChromium ? undefined : "chrome";

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
