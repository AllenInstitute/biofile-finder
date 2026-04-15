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

const REGRESSION_WARN_PCT = 25; // ≥25% slower → ⚠️
const REGRESSION_SEVERE_PCT = 50; // ≥50% slower → ❌
const IMPROVEMENT_PCT = 10; // ≥10% faster → ✅

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(ms) {
    return ms < 10 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`;
}

function pctDelta(base, pr) {
    if (base === 0) return null;
    return ((pr - base) / base) * 100;
}

function deltaBadge(base, pr) {
    const delta = pctDelta(base, pr);
    if (delta === null) return "N/A";
    const sign = delta >= 0 ? "+" : "";
    const label = `${sign}${delta.toFixed(1)}%`;
    if (delta >= REGRESSION_SEVERE_PCT) return `${label} ❌`;
    if (delta >= REGRESSION_WARN_PCT) return `${label} ⚠️`;
    if (delta <= -IMPROVEMENT_PCT) return `${label} ✅`;
    return label;
}

function inMemKey(r) {
    return `${r.name}@${r.scale}@${r.schemaLabel}`;
}

function cloudKey(r) {
    return r.name;
}

function indexBy(arr, keyFn) {
    const map = new Map();
    for (const r of arr) map.set(keyFn(r), r);
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

const baseIndex = indexBy(base.results, inMemKey);
const prIndex = indexBy(pr.results, inMemKey);

const baseCloudIndex = indexBy(base.cloudResults ?? [], cloudKey);
const prCloudIndex = indexBy(pr.cloudResults ?? [], cloudKey);

// Collect all unique in-memory keys, grouped by query name
const allKeys = [...new Set([...prIndex.keys(), ...baseIndex.keys()])];

const byQuery = new Map();
for (const key of allKeys) {
    const [name] = key.split("@");
    if (!byQuery.has(name)) byQuery.set(name, []);
    byQuery.get(name).push(key);
}

for (const keys of byQuery.values()) {
    keys.sort((a, b) => {
        const [, scaleA, schemaA] = a.split("@");
        const [, scaleB, schemaB] = b.split("@");
        const scaleDiff = parseInt(scaleA, 10) - parseInt(scaleB, 10);
        if (scaleDiff !== 0) return scaleDiff;
        return (schemaA ?? "").localeCompare(schemaB ?? "");
    });
}

// ---------------------------------------------------------------------------
// Collect deltas for the summary section
// ---------------------------------------------------------------------------

const allDeltas = []; // { label, delta, baseP50, prP50 }

for (const [, queryKeys] of byQuery) {
    const narrowKeys = queryKeys.filter((k) => k.split("@")[2] === "narrow");
    for (const key of narrowKeys) {
        const [name, scaleStr] = key.split("@");
        const baseP50 = baseIndex.get(key)?.p50 ?? null;
        const prP50 = prIndex.get(key)?.p50 ?? null;
        if (baseP50 !== null && prP50 !== null) {
            allDeltas.push({
                label: `\`${name}\` @ ${Number(scaleStr).toLocaleString()} rows`,
                delta: pctDelta(baseP50, prP50),
                baseP50,
                prP50,
            });
        }
    }
}

const regressions = allDeltas
    .filter((d) => d.delta >= REGRESSION_WARN_PCT)
    .sort((a, b) => b.delta - a.delta);

const improvements = allDeltas
    .filter((d) => d.delta <= -IMPROVEMENT_PCT)
    .sort((a, b) => a.delta - b.delta);

// ---------------------------------------------------------------------------
// Build PR comment
// ---------------------------------------------------------------------------

const lines = [];

lines.push("## BFF Query Benchmark Results");
lines.push("");
lines.push(`| | Base (\`${base.branch}\`) | PR (\`${pr.branch}\`) | Delta |`);
lines.push("|-|-|-|-|");

const initDelta = deltaBadge(base.initTimeMs, pr.initTimeMs);
lines.push(`| **DuckDB init** | ${fmt(base.initTimeMs)} | ${fmt(pr.initTimeMs)} | ${initDelta} |`);

// --- Narrow schema (main table) ---
lines.push("| | | | |");
lines.push("| **In-memory queries — narrow schema (p50 ms)** | | | |");

const wideLines = [];
wideLines.push("| **In-memory queries — wide schema (p50 ms)** | | | |");

for (const [queryName, queryKeys] of byQuery) {
    const narrowKeys = queryKeys.filter((k) => k.split("@")[2] === "narrow");
    const wideKeys = queryKeys.filter((k) => k.split("@")[2] === "wide");

    for (const key of narrowKeys) {
        const scale = parseInt(key.split("@")[1], 10);
        const baseP50 = baseIndex.get(key)?.p50 ?? null;
        const prP50 = prIndex.get(key)?.p50 ?? null;
        lines.push(
            `| \`${queryName}\` @ ${scale.toLocaleString()} rows` +
                ` | ${baseP50 !== null ? fmt(baseP50) : "—"}` +
                ` | ${prP50 !== null ? fmt(prP50) : "—"}` +
                ` | ${baseP50 !== null && prP50 !== null ? deltaBadge(baseP50, prP50) : "—"} |`
        );
    }

    for (const key of wideKeys) {
        const scale = parseInt(key.split("@")[1], 10);
        const baseP50 = baseIndex.get(key)?.p50 ?? null;
        const prP50 = prIndex.get(key)?.p50 ?? null;
        wideLines.push(
            `| \`${queryName}\` @ ${scale.toLocaleString()} rows` +
                ` | ${baseP50 !== null ? fmt(baseP50) : "—"}` +
                ` | ${prP50 !== null ? fmt(prP50) : "—"}` +
                ` | ${baseP50 !== null && prP50 !== null ? deltaBadge(baseP50, prP50) : "—"} |`
        );
    }
}

// --- Cloud results ---
const allCloudKeys = [...new Set([...prCloudIndex.keys(), ...baseCloudIndex.keys()])];

if (allCloudKeys.length > 0) {
    const prNetBaseline = pr.cloudResults?.[0]?.networkBaselineMs;
    const baseNetBaseline = base.cloudResults?.[0]?.networkBaselineMs;
    const netNote =
        prNetBaseline !== undefined
            ? ` _(network baseline: base ${
                  baseNetBaseline?.toFixed(1) ?? "?"
              }ms, PR ${prNetBaseline.toFixed(1)}ms)_`
            : "";

    lines.push("| | | | |");
    lines.push(`| **Cloud queries — HTTP parquet fixture (p50 ms)**${netNote} | | | |`);

    for (const key of allCloudKeys) {
        const baseP50 = baseCloudIndex.get(key)?.p50 ?? null;
        const prP50 = prCloudIndex.get(key)?.p50 ?? null;
        lines.push(
            `| \`${key}\`` +
                ` | ${baseP50 !== null ? fmt(baseP50) : "—"}` +
                ` | ${prP50 !== null ? fmt(prP50) : "—"}` +
                ` | ${baseP50 !== null && prP50 !== null ? deltaBadge(baseP50, prP50) : "—"} |`
        );
    }
}

// --- Details: wide schema + p95 ---
lines.push("");
lines.push("<details><summary>Wide schema results (p50 ms)</summary>\n");
lines.push(`| | Base (\`${base.branch}\`) | PR (\`${pr.branch}\`) | Delta |`);
lines.push("|-|-|-|-|");
for (const l of wideLines) lines.push(l);
lines.push("\n</details>");

lines.push("");
lines.push("<details><summary>p95 timings (narrow schema)</summary>\n");
lines.push("| Query | Scale | Base p95 | PR p95 | Delta |");
lines.push("|-------|-------|----------|--------|-------|");

for (const [queryName, queryKeys] of byQuery) {
    for (const key of queryKeys.filter((k) => k.split("@")[2] === "narrow")) {
        const scale = key.split("@")[1];
        const baseP95 = baseIndex.get(key)?.p95 ?? null;
        const prP95 = prIndex.get(key)?.p95 ?? null;
        lines.push(
            `| \`${queryName}\` | ${Number(scale).toLocaleString()}` +
                ` | ${baseP95 !== null ? fmt(baseP95) : "—"}` +
                ` | ${prP95 !== null ? fmt(prP95) : "—"}` +
                ` | ${baseP95 !== null && prP95 !== null ? deltaBadge(baseP95, prP95) : "—"} |`
        );
    }
}

lines.push("\n</details>");

// --- Summary ---
lines.push("");
lines.push("### Summary");
lines.push("");

if (regressions.length === 0 && improvements.length === 0) {
    lines.push("No significant changes detected.");
} else {
    if (regressions.length > 0) {
        lines.push(
            `**${regressions.length} regression${
                regressions.length > 1 ? "s" : ""
            }** (≥${REGRESSION_WARN_PCT}% slower):`
        );
        lines.push("");
        for (const r of regressions) {
            const badge = r.delta >= REGRESSION_SEVERE_PCT ? "❌" : "⚠️";
            lines.push(
                `- ${badge} ${r.label}: ${fmt(r.baseP50)} → ${fmt(r.prP50)} (+${r.delta.toFixed(
                    1
                )}%)`
            );
        }
        lines.push("");
    }
    if (improvements.length > 0) {
        lines.push(
            `**${improvements.length} improvement${
                improvements.length > 1 ? "s" : ""
            }** (≥${IMPROVEMENT_PCT}% faster):`
        );
        lines.push("");
        for (const i of improvements) {
            lines.push(
                `- ✅ ${i.label}: ${fmt(i.baseP50)} → ${fmt(i.prP50)} (${i.delta.toFixed(1)}%)`
            );
        }
        lines.push("");
    }
}

lines.push(
    `_Benchmarks run in headless Chromium with DuckDB-WASM. ` +
        `Each query: 1 warm-up + ${pr.results[0]?.iterations ?? 10} timed iterations. ` +
        `Flags: ⚠️ ≥${REGRESSION_WARN_PCT}% slower · ❌ ≥${REGRESSION_SEVERE_PCT}% slower · ✅ ≥${IMPROVEMENT_PCT}% faster_`
);

console.log(lines.join("\n"));
