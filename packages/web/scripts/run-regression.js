// CI regression runner — benchmarks one branch against local fixtures and writes
// benchmark-results-<branch>.json. Called once per branch by benchmark.yml.

"use strict";

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { runBenchmarkPage } = require("./lib/run-benchmark-page");

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");
const SCALES = ["100k", "1m", "10m"];

const LOCAL_FIXTURE_MAP = {
    "100k": "http://localhost:18765/fixtures/synthetic-100k.parquet",
    "1m": "http://localhost:18765/fixtures/synthetic-1m.parquet",
    "10m": "http://localhost:18765/fixtures/synthetic-10m.parquet",
};

const missing = SCALES.filter(
    (scale) => !fs.existsSync(path.join(FIXTURES_DIR, `synthetic-${scale}.parquet`))
);
if (missing.length > 0) {
    console.error(
        `Missing fixture files: ${missing.map((s) => `synthetic-${s}.parquet`).join(", ")}\n` +
            `Download them to ${FIXTURES_DIR} before running this script.`
    );
    process.exit(1);
}

const sources = SCALES.map((scale) => ({ label: scale, url: LOCAL_FIXTURE_MAP[scale] }));

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
        sources,
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

main().catch((err) => {
    console.error("[fatal]", err.message);
    process.exit(1);
});
