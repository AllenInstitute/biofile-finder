Query benchmarking
==================

Three tools for measuring and monitoring DuckDB-WASM query performance.

---

Tool 1 — Local benchmark runner
--------------------------------

Runs the full task suite in headless Chromium against parquet fixtures, prints a p50/p95 timing table, and writes a result JSON for later comparison.

**First-time setup**

```bash
cd packages/web
npx playwright install chromium --with-deps
```

**Download local fixtures** (one time; ~500 MB total)

```bash
BASE=https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1
mkdir -p packages/web/fixtures
curl -fL "$BASE/synthetic-100k.parquet" -o packages/web/fixtures/synthetic-100k.parquet
curl -fL "$BASE/synthetic-1m.parquet"   -o packages/web/fixtures/synthetic-1m.parquet
curl -fL "$BASE/synthetic-10m.parquet"  -o packages/web/fixtures/synthetic-10m.parquet
cp packages/web/fixtures/synthetic-10m.parquet packages/web/fixtures/synthetic-10m-copy.parquet
curl -fL "$BASE/synthetic-20m.parquet"  -o packages/web/fixtures/synthetic-20m.parquet
```

**Nested-metadata column** (for the `nested_*` tasks)

The `synthetic-*` fixtures carry a nested `Well` STRUCT[] column alongside the flat scalar
columns, so the same fixtures drive both the flat and the nested tasks:

```
Well  STRUCT(Gene VARCHAR, Dose STRUCT(Unit VARCHAR, Value DOUBLE))[]
```

Sub-fields are addressed by dotted path — `Well.Gene`, `Well.Dose.Unit`, `Well.Dose.Value`.
The column is baked into the hosted fixtures, so the download above is all you need. If you
ever need to (re)generate it — e.g. after refreshing the flat fixtures in S3 — run the
one-time augment script, which grabs each hosted `synthetic-*.parquet`, appends the `Well`
column deterministically, and writes the result to `./augmented-fixtures/` for re-upload:

```bash
# One scale
python scripts/augment_parquet_with_nested.py --scale 100k

# All benchmark scales (100k, 1m, 10m, 20m)
python scripts/augment_parquet_with_nested.py --all-scales

# A local file already on disk (no download)
python scripts/augment_parquet_with_nested.py \
    --input packages/web/fixtures/synthetic-100k.parquet \
    --output packages/web/fixtures/synthetic-100k.parquet
```

The `nested_*` tasks are skipped automatically for any source that lacks the `Well` column
(see `requiresAnnotation` in [tasks.ts](../packages/web/benchmark/src/tasks.ts)), so a fixture
without it is a no-op rather than an error.

**Run against local fixtures**

```bash
# All scales
npm run benchmark --prefix packages/web -- --local

# A single scale (flat + nested tasks both run)
npm run benchmark --prefix packages/web -- --local --scale 100k

# Override iteration/warmup counts
npm run benchmark --prefix packages/web -- --local --scale 1m --iterations 10 --warmup 3
```

**Run against remote S3 parquets**

```bash
BENCHMARK_REAL_1M_URL=s3://your-bucket/file.parquet \
  npm run benchmark --prefix packages/web -- --scale 1m
```

**Compare two result files**

```bash
npm run benchmark:compare --prefix packages/web -- \
  packages/web/benchmark-results-main.json \
  packages/web/benchmark-results-local.json
```

This prints a Markdown table with p50 deltas and regression/improvement badges (⚠️ ≥25% slower, ❌ ≥50% slower, ✅ ≥25% faster). Badges are suppressed for queries where either branch is under 500ms — percentage deltas on fast queries are noise.

**Flags**

| Flag | Description |
|---|---|
| `--local` | Use fixtures from `packages/web/fixtures/` instead of S3 URLs |
| `--scale 100k\|1m\|10m\|10m+10m\|20m` | Run a single fixture size. Every scale runs both the flat and nested-metadata tasks (the `Well` column is baked into the fixtures) |
| `--full` | Run all scales with both cloud and local sources side-by-side |
| `--iterations N` | Timed iterations per task (default 5) |
| `--warmup N` | Warmup rounds before timing (default 1) |
| `--skip-build` | Skip the webpack build step |
| `--chromium` | Use Playwright's bundled Chromium instead of system Chrome |

---

Tool 2 — CI regression workflow
---------------------------------

`benchmark.yml` is a `workflow_dispatch` workflow that benchmarks two branches sequentially on the same VM and posts a Markdown comparison table to the workflow summary.

Both branches run on the same machine to eliminate hardware variance — a ~15% CPU speed difference between VMs would mask the small regressions the tool is designed to catch.

**Trigger it** from the Actions tab: select **Query Benchmark**, enter a `compare_branch` (your PR branch) and optionally override `base_branch` (default: `main`), `iterations`, and `warmup`.

The workflow:
1. Checks out the compare branch and downloads fixtures from S3 (cached by version)
2. Runs `run-regression.ts` → writes `benchmark-results-<compare>.json`
3. Checks out the base branch (without wiping fixtures)
4. Runs `run-regression.ts` → writes `benchmark-results-<base>.json`
5. Runs `compare-results.ts` → posts the Markdown table to the step summary

---

Tool 3 — Dev console query timing
-----------------------------------

Enables per-query DuckDB timing in the running app without any build step.

**Enable**

In the browser DevTools console:

```js
localStorage.setItem("bff_query_timing", "1")
```

Then reload the page. Each DuckDB query will log its elapsed time to the console as it runs:

```
[duckdb] 12.3ms — [fetchAnnotations] SELECT DISTINCT ...
[duckdb]  4.1ms — [getFiles] SELECT * FROM ...
```

**Disable**

```js
localStorage.removeItem("bff_query_timing")
```

Then reload.
