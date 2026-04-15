/**
 * summarize-results.js
 *
 * Prints a human-readable summary of a benchmark-results.json file.
 *
 * Usage:
 *   node scripts/summarize-results.js [results.json]
 *
 * Defaults to benchmark-results.json in the packages/web directory.
 */

"use strict";

const fs = require("fs");
const path = require("path");

function defaultResultsFile() {
    // If an explicit path was given, use it
    if (process.argv[2]) return process.argv[2];

    // Otherwise find the branch-stamped file for the current branch
    try {
        const { execSync } = require("child_process");
        const branch =
            process.env.GITHUB_REF_NAME ||
            execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" }).toString().trim();
        const slug = branch.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
        const stamped = path.join(__dirname, "..", `benchmark-results-${slug}.json`);
        if (fs.existsSync(stamped)) return stamped;
    } catch {
        /* fall through */
    }

    // Last resort: generic name
    return path.join(__dirname, "..", "benchmark-results.json");
}

const file = defaultResultsFile();

if (!fs.existsSync(file)) {
    console.error(`No results file found at ${file}`);
    console.error("Run 'npm run benchmark' first.");
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));

function fmt(ms) {
    if (ms === undefined || ms === null) return "—";
    return ms < 10 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`;
}

function col(str, width) {
    return String(str).padEnd(width);
}

function rcol(str, width) {
    return String(str).padStart(width);
}

const SEP = "─".repeat(80);

console.log("");
console.log("BFF Query Benchmark Results");
console.log(SEP);
console.log(`Branch:     ${data.branch}`);
console.log(`Commit:     ${data.commit}`);
console.log(`Timestamp:  ${data.timestamp}`);
console.log(`DuckDB init: ${fmt(data.initTimeMs)}`);
console.log("");

// --- In-memory results ---
const schemas = [...new Set(data.results.map((r) => r.schemaLabel))];

for (const schema of schemas) {
    const schemaResults = data.results.filter((r) => r.schemaLabel === schema);
    const schemaScales = [...new Set(schemaResults.map((r) => r.scale))].sort((a, b) => a - b);

    console.log(`In-memory — ${schema} schema (p50 / p95)`);
    console.log(
        col("  Query", 26) +
            schemaScales.map((s) => rcol(Number(s).toLocaleString() + " rows", 18)).join("")
    );
    console.log("  " + "─".repeat(24 + schemaScales.length * 18));

    const queries = [...new Set(schemaResults.map((r) => r.name))];
    for (const name of queries) {
        const cells = schemaScales.map((scale) => {
            const r = schemaResults.find((x) => x.name === name && x.scale === scale);
            if (!r) return rcol("—", 18);
            return rcol(`${fmt(r.p50)} / ${fmt(r.p95)}`, 18);
        });
        console.log("  " + col(name, 24) + cells.join(""));
    }
    console.log("");
}

// --- Cloud results ---
if (data.cloudResults && data.cloudResults.length > 0) {
    const baseline = data.cloudResults[0]?.networkBaselineMs;
    console.log(`Cloud — HTTP parquet fixture (network baseline: ${fmt(baseline)}) (p50 / p95)`);
    console.log("  " + "─".repeat(50));
    for (const r of data.cloudResults) {
        console.log("  " + col(r.name, 24) + rcol(`${fmt(r.p50)} / ${fmt(r.p95)}`, 20));
    }
    console.log("");
}

console.log(SEP);
console.log(
    `Total results: ${data.results.length} in-memory, ${data.cloudResults?.length ?? 0} cloud`
);
console.log("");
