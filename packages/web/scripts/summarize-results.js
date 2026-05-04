// Prints a human-readable p50/p95 table from a benchmark-results.json file.
// Called automatically by run-local.js; also runnable standalone.

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function defaultResultsFile() {
    if (process.argv[2]) return process.argv[2];

    const local = path.join(__dirname, "..", "benchmark-results-local.json");
    if (fs.existsSync(local)) return local;

    try {
        const branch =
            process.env.BENCHMARK_BRANCH ||
            execSync("git rev-parse --abbrev-ref HEAD", { stdio: "pipe" }).toString().trim();
        const slug = branch.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
        const stamped = path.join(__dirname, "..", `benchmark-results-${slug}.json`);
        if (fs.existsSync(stamped)) return stamped;
    } catch {
        /* fall through */
    }

    return path.join(__dirname, "..", "benchmark-results.json");
}

const file = defaultResultsFile();

if (!fs.existsSync(file)) {
    console.error(`No results file found at ${file}`);
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

const SEP = "─".repeat(82);

console.log("");
console.log("BFF Query Benchmark Results");
console.log(SEP);
console.log(`Branch:      ${data.branch}`);
console.log(`Commit:      ${data.commit}`);
console.log(`Timestamp:   ${data.timestamp}`);
console.log(`DuckDB init: ${fmt(data.initTimeMs)}`);
console.log("");

const sourceLabels = data.sources.map((s) => s.label);

// Header row
const COL_W = 20;
console.log(col("  Query", 26) + sourceLabels.map((l) => rcol(l, COL_W)).join(""));
console.log("  " + "─".repeat(24 + sourceLabels.length * COL_W));

// Registration row
const regCells = data.sources.map((s) => rcol(fmt(s.registrationMs), COL_W));
console.log("  " + col("registration", 24) + regCells.join(""));
console.log("");

// Query rows (p50 / p95)
const queryNames = [...new Set(data.sources.flatMap((s) => s.queries.map((q) => q.name)))];

for (const name of queryNames) {
    const cells = data.sources.map((s) => {
        const q = s.queries.find((x) => x.name === name);
        if (!q) return rcol("—", COL_W);
        return rcol(`${fmt(q.p50)} / ${fmt(q.p95)}`, COL_W);
    });
    console.log("  " + col(name, 24) + cells.join(""));
}

console.log("");
console.log(SEP);
console.log(
    `  ${data.sources.length} source(s) · ${queryNames.length} queries · ` +
        `${data.sources[0]?.queries[0]?.timings?.length ?? "?"} iterations each`
);
console.log("  Timings shown as p50 / p95");
console.log("");
