// CI regression runner — benchmarks one branch against local fixtures and writes
// benchmark-results-<branch>.json. Called once per branch by benchmark.yml.

"use strict";

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { runBenchmarkPage } = require("./lib/run-benchmark-page");

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

const TEST_CASES = [
    [
        {
            label: "100k",
            url: "http://localhost:18765/fixtures/synthetic-100k.parquet",
        },
    ],
    [
        {
            label: "1m",
            url: "http://localhost:18765/fixtures/synthetic-1m.parquet",
        },
    ],
    [
        {
            label: "10m",
            url: "http://localhost:18765/fixtures/synthetic-10m.parquet",
        },
    ],
    [
        {
            label: "10m",
            url: "http://localhost:18765/fixtures/synthetic-10m.parquet",
        },
        {
            label: "10m_2",
            url: "http://localhost:18765/fixtures/synthetic-10m-copy.parquet",
        },
    ],
];

const inputFiles = new Set(
    TEST_CASES.flat().flatMap(({ url }) => url.replace("http://localhost:18765/fixtures/", ""))
);

const missing = Array.from(inputFiles).filter(
    (fileName) => !fs.existsSync(path.join(FIXTURES_DIR, fileName))
);
if (missing.length > 0) {
    console.error(
        `Missing fixture files: ${missing.join(", ")}\n` +
            `Download them to ${FIXTURES_DIR} before running this script.`
    );
    process.exit(1);
}

function getCurrentBranch() {
    if (process.env.BENCHMARK_BRANCH) return process.env.BENCHMARK_BRANCH;
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" }).toString().trim();
    } catch {
        return "unknown";
    }
}

function slugify(branch) {
    return branch.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function getArgValue(flag) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : undefined;
}

async function main() {
    const skipBuild = process.argv.includes("--skip-build");
    const iterations = getArgValue("--iterations");
    const warmup = getArgValue("--warmup");

    console.log(`[regression] Using local fixtures from ${FIXTURES_DIR}`);
    if (iterations) console.log(`[regression] Iterations: ${iterations}`);
    if (warmup !== undefined) console.log(`[regression] Warmup rounds: ${warmup}`);

    const rawResults = await runBenchmarkPage({
        TEST_CASES,
        skipBuild,
        iterations,
        warmupRounds: warmup,
    });

    const branch = getCurrentBranch();
    const results = {
        ...rawResults,
        commit: process.env.GITHUB_SHA ?? "local",
        branch,
    };

    const slug = slugify(branch);
    const outFile = path.join(__dirname, "..", `benchmark-results-${slug}.json`);
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`[regression] Results written to ${path.relative(process.cwd(), outFile)}`);
}

main();
