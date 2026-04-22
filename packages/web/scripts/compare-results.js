/**
 * compare-results.js
 *
 * Reads two benchmark result JSON files (base branch and PR branch) and outputs
 * a Markdown comparison table for the GitHub Step Summary.
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
    if (ms === undefined || ms === null) return "—";
    return ms < 10 ? `${ms.toFixed(2)}ms` : `${ms.toFixed(1)}ms`;
}

function pctDelta(base, pr) {
    if (!base) return null;
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

// Index sources by label for fast lookup
const baseSources = new Map(base.sources.map((s) => [s.label, s]));
const prSources = new Map(pr.sources.map((s) => [s.label, s]));

// All source labels, preserving order from the PR result (superset of base)
const allLabels = [
    ...new Set([...pr.sources.map((s) => s.label), ...base.sources.map((s) => s.label)]),
];

// All query names across both result sets
const allQueryNames = [
    ...new Set([
        ...pr.sources.flatMap((s) => s.queries.map((q) => q.name)),
        ...base.sources.flatMap((s) => s.queries.map((q) => q.name)),
    ]),
];

// ---------------------------------------------------------------------------
// Collect deltas for the summary section (use p50 of largest scale)
// ---------------------------------------------------------------------------

const allDeltas = [];

for (const qName of allQueryNames) {
    for (const label of allLabels) {
        const baseQ = baseSources.get(label)?.queries.find((q) => q.name === qName);
        const prQ = prSources.get(label)?.queries.find((q) => q.name === qName);
        if (baseQ && prQ) {
            allDeltas.push({
                label: `\`${qName}\` @ ${label}`,
                delta: pctDelta(baseQ.p50, prQ.p50),
                baseP50: baseQ.p50,
                prP50: prQ.p50,
            });
        }
    }
}

const regressions = allDeltas
    .filter((d) => d.delta !== null && d.delta >= REGRESSION_WARN_PCT)
    .sort((a, b) => b.delta - a.delta);

const improvements = allDeltas
    .filter((d) => d.delta !== null && d.delta <= -IMPROVEMENT_PCT)
    .sort((a, b) => a.delta - b.delta);

// ---------------------------------------------------------------------------
// Build Markdown output
// ---------------------------------------------------------------------------

const lines = [];

lines.push("## BFF Query Benchmark Results");
lines.push("");
lines.push(`| | \`${base.branch}\` | \`${pr.branch}\` | Delta |`);
lines.push("|-|-|-|-|");

// DuckDB init time
lines.push(
    `| **DuckDB init** | ${fmt(base.initTimeMs)} | ${fmt(pr.initTimeMs)} | ${deltaBadge(
        base.initTimeMs,
        pr.initTimeMs
    )} |`
);

// Registration time per source
lines.push("| | | | |");
lines.push("| **Registration (parquet → view)** | | | |");

for (const label of allLabels) {
    const baseReg = baseSources.get(label)?.registrationMs ?? null;
    const prReg = prSources.get(label)?.registrationMs ?? null;
    lines.push(
        `| \`${label}\`` +
            ` | ${fmt(baseReg)}` +
            ` | ${fmt(prReg)}` +
            ` | ${baseReg !== null && prReg !== null ? deltaBadge(baseReg, prReg) : "—"} |`
    );
}

// Query timings per source (p50)
lines.push("| | | | |");
lines.push("| **Query timings — p50** | | | |");

for (const label of allLabels) {
    lines.push(`| _${label}_ | | | |`);
    for (const qName of allQueryNames) {
        const baseQ = baseSources.get(label)?.queries.find((q) => q.name === qName);
        const prQ = prSources.get(label)?.queries.find((q) => q.name === qName);
        lines.push(
            `| \`${qName}\`` +
                ` | ${fmt(baseQ?.p50)}` +
                ` | ${fmt(prQ?.p50)}` +
                ` | ${baseQ && prQ ? deltaBadge(baseQ.p50, prQ.p50) : "—"} |`
        );
    }
}

// p95 in a collapsible section
lines.push("");
lines.push("<details><summary>p95 timings</summary>\n");
lines.push(`| | \`${base.branch}\` | \`${pr.branch}\` | Delta |`);
lines.push("|-|-|-|-|");

for (const label of allLabels) {
    lines.push(`| _${label}_ | | | |`);
    for (const qName of allQueryNames) {
        const baseQ = baseSources.get(label)?.queries.find((q) => q.name === qName);
        const prQ = prSources.get(label)?.queries.find((q) => q.name === qName);
        lines.push(
            `| \`${qName}\`` +
                ` | ${fmt(baseQ?.p95)}` +
                ` | ${fmt(prQ?.p95)}` +
                ` | ${baseQ && prQ ? deltaBadge(baseQ.p95, prQ.p95) : "—"} |`
        );
    }
}

lines.push("\n</details>");

// Summary
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

const iters = pr.sources[0]?.queries[0]?.timings?.length ?? "?";
lines.push(
    `_Benchmarks run in headless Chromium with DuckDB-WASM. ` +
        `${iters} iterations per query. ` +
        `Flags: ⚠️ ≥${REGRESSION_WARN_PCT}% slower · ❌ ≥${REGRESSION_SEVERE_PCT}% slower · ✅ ≥${IMPROVEMENT_PCT}% faster_`
);

console.log(lines.join("\n"));
