/**
 * compare-results.js
 *
 * Reads two benchmark result JSON files (base branch and PR branch) and outputs
 * a Markdown comparison table suitable for posting as a GitHub PR comment.
 *
 * Usage:
 *   node scripts/compare-results.js <base-results.json> <pr-results.json>
 *
 * Output: Markdown to stdout
 */

"use strict";

const fs = require("fs");

// ---------------------------------------------------------------------------
// Thresholds for highlighting regressions / improvements
// ---------------------------------------------------------------------------
const REGRESSION_WARN_PCT = 10; // ≥10% slower → ⚠️
const REGRESSION_FAIL_PCT = 25; // ≥25% slower → ❌
const IMPROVEMENT_PCT = 5; //  ≥5% faster → ✅

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(ms) {
    return ms < 10 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`;
}

function deltaBadge(basePct, prPct) {
    if (basePct === 0) return "N/A";
    const delta = ((prPct - basePct) / basePct) * 100;
    const sign = delta >= 0 ? "+" : "";
    const label = `${sign}${delta.toFixed(1)}%`;

    if (delta >= REGRESSION_FAIL_PCT) return `${label} ❌`;
    if (delta >= REGRESSION_WARN_PCT) return `${label} ⚠️`;
    if (delta <= -IMPROVEMENT_PCT) return `${label} ✅`;
    return label;
}

function indexResults(results) {
    // Key: "queryName@scale"
    const map = new Map();
    for (const r of results) {
        map.set(`${r.name}@${r.scale}`, r);
    }
    return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [, , baseFile, prFile] = process.argv;

if (!baseFile || !prFile) {
    console.error("Usage: node compare-results.js <base.json> <pr.json>");
    process.exit(1);
}

const base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
const pr = JSON.parse(fs.readFileSync(prFile, "utf8"));

const baseIndex = indexResults(base.results);
const prIndex = indexResults(pr.results);

// Collect all unique keys in the order they appear in the PR results
const keys = [...new Set([...prIndex.keys(), ...baseIndex.keys()])];

// Group by query name for a tidier table
const byQuery = new Map();
for (const key of keys) {
    const [name] = key.split("@");
    if (!byQuery.has(name)) byQuery.set(name, []);
    byQuery.get(name).push(key);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const lines = [];

lines.push("## BFF Query Benchmark Results");
lines.push("");
lines.push(`| | Base (\`${base.branch}\`) | PR (\`${pr.branch}\`) | Delta |`);
lines.push("|-|-|-|-|");

// Init time row
const initDelta = deltaBadge(base.initTimeMs, pr.initTimeMs);
lines.push(`| **DuckDB init** | ${fmt(base.initTimeMs)} | ${fmt(pr.initTimeMs)} | ${initDelta} |`);

lines.push("| | | | |");
lines.push("| **Query (p50 ms)** | | | |");

for (const [queryName, queryKeys] of byQuery) {
    // Sort by scale ascending
    queryKeys.sort((a, b) => {
        const scaleA = parseInt(a.split("@")[1], 10);
        const scaleB = parseInt(b.split("@")[1], 10);
        return scaleA - scaleB;
    });

    for (const key of queryKeys) {
        const scale = key.split("@")[1];
        const baseR = baseIndex.get(key);
        const prR = prIndex.get(key);

        const baseP50 = baseR ? baseR.p50 : null;
        const prP50 = prR ? prR.p50 : null;

        const baseCell = baseP50 !== null ? fmt(baseP50) : "—";
        const prCell = prP50 !== null ? fmt(prP50) : "—";
        const deltaCell = baseP50 !== null && prP50 !== null ? deltaBadge(baseP50, prP50) : "—";

        const scaleLabel = Number(scale).toLocaleString();
        lines.push(
            `| \`${queryName}\` @ ${scaleLabel} rows | ${baseCell} | ${prCell} | ${deltaCell} |`
        );
    }
}

lines.push("");
lines.push("<details><summary>p95 timings</summary>\n");
lines.push("| Query | Scale | Base p95 | PR p95 | Delta |");
lines.push("|-------|-------|----------|--------|-------|");

for (const [queryName, queryKeys] of byQuery) {
    queryKeys.sort((a, b) => parseInt(a.split("@")[1]) - parseInt(b.split("@")[1]));
    for (const key of queryKeys) {
        const scale = key.split("@")[1];
        const baseR = baseIndex.get(key);
        const prR = prIndex.get(key);

        const baseP95 = baseR ? baseR.p95 : null;
        const prP95 = prR ? prR.p95 : null;

        const deltaCell = baseP95 !== null && prP95 !== null ? deltaBadge(baseP95, prP95) : "—";

        lines.push(
            `| \`${queryName}\` | ${Number(scale).toLocaleString()} | ` +
                `${baseP95 !== null ? fmt(baseP95) : "—"} | ` +
                `${prP95 !== null ? fmt(prP95) : "—"} | ${deltaCell} |`
        );
    }
}

lines.push("\n</details>");
lines.push("");
lines.push(
    `_Benchmarks run in headless Chromium with DuckDB-WASM. ` +
        `Each query: 1 warm-up + ${pr.results[0]?.iterations ?? 10} timed iterations._`
);
lines.push(
    `_Flags: ⚠️ ≥${REGRESSION_WARN_PCT}% slower · ❌ ≥${REGRESSION_FAIL_PCT}% slower · ✅ ≥${IMPROVEMENT_PCT}% faster_`
);

console.log(lines.join("\n"));
