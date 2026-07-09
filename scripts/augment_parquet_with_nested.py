#!/usr/bin/env python3
"""Add a nested (STRUCT[]) metadata column to existing flat benchmark fixtures.

The query benchmark suite (packages/web/benchmark) exercises DuckDB-WASM against the
hosted ``synthetic-*.parquet`` fixtures. Those fixtures only hold flat, scalar columns,
so the nested-metadata tasks (``list_transform`` / ``list_filter`` / ``unnest`` over
``STRUCT[]`` columns) had nothing to query.

Rather than maintaining a second, parallel set of ``nested-*.parquet`` files, this is a
**one-time** utility that grabs each existing ``synthetic-*.parquet`` fixture (from S3 or
a local copy), appends a deterministic ``Well`` STRUCT[] column, and writes the augmented
file back out so it can replace the fixture in S3. Every existing flat column is preserved
byte-for-byte in value, so the flat benchmark tasks keep running unchanged and the nested
tasks now have a column to hit.

Nested column added
-------------------
* ``Well``  ``STRUCT(Gene VARCHAR, Dose STRUCT(Unit VARCHAR, Value DOUBLE))[]``
    Each row holds a list of 1..4 well structs. Sub-fields are addressed by dotted path in
    the app: ``Well.Gene`` (medium cardinality), ``Well.Dose.Unit`` (low cardinality),
    ``Well.Dose.Value`` (high cardinality). ``"TP53"`` and ``"uM"`` are guaranteed to
    appear so the filter/combination benchmark tasks match real rows.

The nested values are generated **deterministically from each row's position** in the file,
so re-running the script produces identical output and the known filter values above hold at
every scale.

Examples
--------
    # Download every hosted scale, augment, and write to ./augmented-fixtures/ for re-upload
    python scripts/augment_parquet_with_nested.py --all-scales

    # A single hosted scale
    python scripts/augment_parquet_with_nested.py --scale 100k

    # A local file already on disk (no download)
    python scripts/augment_parquet_with_nested.py \
        --input packages/web/fixtures/synthetic-100k.parquet \
        --output packages/web/fixtures/synthetic-100k.parquet
"""

from __future__ import annotations

import argparse
import datetime
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq


CODECS_WITH_LEVEL = {"gzip", "brotli", "zstd"}

# Base URL the flat fixtures are hosted at (mirrors dev-docs/07-query-benchmarking.md and
# .github/workflows/benchmark.yml).
DEFAULT_SOURCE_BASE = (
    "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/benchmark-fixtures/v1"
)

# Named benchmark scales. Only used to build the default source/destination file names; the
# script does not care how many rows a file actually has (it augments whatever it reads).
SCALES: list[str] = ["100k", "1m", "10m", "20m"]

DEFAULT_OUTPUT_DIR = Path("augmented-fixtures")

# Cardinality tiers for the nested sub-fields. "TP53" (index 0) and "uM" are referenced
# directly by the benchmark tasks, so they must stay present.
GENES: list[str] = [
    "TP53", "EGFR", "BRCA1", "BRCA2", "KRAS", "MYC", "PTEN", "RB1", "APC", "VHL",
    "TET2", "IDH1", "IDH2", "NRAS", "PIK3CA", "AKT1", "BRAF", "CDKN2A", "SMAD4", "STK11",
    "ATM", "CHEK2", "PALB2", "CDH1", "MLH1", "MSH2", "MSH6", "PMS2", "NF1", "NF2",
    "WT1", "FLT3", "NPM1", "DNMT3A", "RUNX1", "GATA2", "CEBPA", "ASXL1", "EZH2", "SF3B1",
    "SRSF2", "U2AF1", "ZRSR2", "BCOR", "PHF6", "STAG2", "SETBP1", "CBL", "JAK2", "MPL",
]

UNITS: list[str] = ["ug/mL", "uM", "nM", "mM"]

# Nested Arrow types: Well STRUCT(Gene VARCHAR, Dose STRUCT(Unit VARCHAR, Value DOUBLE))[]
DOSE_TYPE = pa.struct([("Unit", pa.string()), ("Value", pa.float64())])
WELL_TYPE = pa.struct([("Gene", pa.string()), ("Dose", DOSE_TYPE)])
WELL_LIST_TYPE = pa.list_(WELL_TYPE)

WELL_COLUMN_NAME = "Well"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Append a nested STRUCT[] column to existing flat synthetic-*.parquet benchmark "
            "fixtures (one-time; output is meant to replace the fixtures in S3)."
        )
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--scale",
        type=str,
        choices=SCALES,
        help="Augment a single named benchmark scale (grabbed from --source-base).",
    )
    group.add_argument(
        "--all-scales",
        action="store_true",
        help="Augment every named benchmark scale (100k, 1m, 10m, 20m).",
    )
    group.add_argument(
        "--input",
        type=Path,
        help="Augment an arbitrary local parquet file instead of a named scale.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help=(
            "Output parquet path. Required with --input. Ignored with --all-scales. Defaults "
            "to <output-dir>/synthetic-<scale>.parquet for --scale."
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=(
            "Directory for named-scale outputs (default: ./augmented-fixtures). Kept separate "
            "from the source so a download is never overwritten in place."
        ),
    )
    parser.add_argument(
        "--source-base",
        type=str,
        default=DEFAULT_SOURCE_BASE,
        help=(
            "Base URL (or local directory) the flat synthetic-*.parquet fixtures are read "
            f"from for named scales (default: {DEFAULT_SOURCE_BASE})."
        ),
    )
    parser.add_argument(
        "--row-group-size",
        type=int,
        default=50_000,
        help="Parquet row group size for the output (default: 50000).",
    )
    parser.add_argument(
        "--compression",
        type=str,
        default=None,
        choices=["none", "snappy", "gzip", "brotli", "lz4", "zstd"],
        help="Output compression codec (default: match the source file, falling back to zstd).",
    )
    parser.add_argument(
        "--compression-level",
        type=int,
        default=9,
        help="Compression level when supported by the codec (default: 9).",
    )
    return parser.parse_args()


def build_wells(row: int) -> list[dict[str, Any]]:
    """Deterministically build the list of well structs for a given row index.

    Gene and Unit are indexed on independent strides so that some wells match both
    ``Gene = 'TP53'`` and ``Dose.Unit = 'uM'`` at once (exercising the correlated
    combination-filter path), while others match only one condition.
    """
    num_wells = (row % 4) + 1  # 1..4 wells per row
    wells: list[dict[str, Any]] = []
    for w in range(num_wells):
        gene = GENES[(row * 3 + w) % len(GENES)]
        unit = UNITS[(row + w * 7) % len(UNITS)]
        value = ((row * 7 + w * 13) % 10_000) / 100.0
        wells.append({"Gene": gene, "Dose": {"Unit": unit, "Value": value}})

    # Guarantee ~1% of rows have a single well matching BOTH Gene='TP53' and
    # Dose.Unit='uM' so the correlated combination-filter benchmark task has a
    # non-trivial, non-empty selectivity at every scale (the independent strides
    # above otherwise never align these two values within one well).
    if row % 100 == 0:
        wells[0] = {"Gene": "TP53", "Dose": {"Unit": "uM", "Value": 42.0}}
    return wells


def build_well_column(start_row: int, num_rows: int) -> pa.Array:
    """Build the ``Well`` STRUCT[] array for a contiguous run of rows."""
    wells = [build_wells(start_row + offset) for offset in range(num_rows)]
    return pa.array(wells, type=WELL_LIST_TYPE)


def detect_compression(reader: pq.ParquetFile) -> str:
    """Return the source file's compression codec (lowercased) for pyarrow, or 'zstd'."""
    try:
        codec = reader.metadata.row_group(0).column(0).compression
    except Exception:
        return "zstd"
    normalized = str(codec).lower()
    if normalized in {"uncompressed", "none"}:
        return "none"
    if normalized == "lz4_raw":
        return "lz4"
    return normalized


def resolve_source(scale: str, source_base: str) -> tuple[str, bool]:
    """Return (path_or_url, is_url) for a named scale's flat fixture."""
    name = f"synthetic-{scale}.parquet"
    if "://" in source_base:
        return f"{source_base.rstrip('/')}/{name}", True
    return str(Path(source_base) / name), False


def download_to_temp(url: str) -> Path:
    print(f"  Downloading {url}")
    tmp = tempfile.NamedTemporaryFile(suffix=".parquet", delete=False)
    tmp.close()
    urllib.request.urlretrieve(url, tmp.name)  # noqa: S310 - trusted benchmark host
    return Path(tmp.name)


def augment_file(
    source: Path,
    output: Path,
    row_group_size: int,
    compression: str | None,
    compression_level: int,
) -> dict[str, Any]:
    """Stream ``source`` in batches, append the Well column, and write to ``output``."""
    output.parent.mkdir(parents=True, exist_ok=True)

    reader = pq.ParquetFile(source)
    if WELL_COLUMN_NAME in reader.schema_arrow.names:
        raise ValueError(
            f"{source} already contains a '{WELL_COLUMN_NAME}' column; refusing to double-augment."
        )

    codec = compression if compression is not None else detect_compression(reader)
    compression_value = None if codec == "none" else codec
    write_kwargs: dict[str, object] = {"compression": compression_value}
    if compression_value in CODECS_WITH_LEVEL:
        write_kwargs["compression_level"] = compression_level

    out_schema = reader.schema_arrow.append(pa.field(WELL_COLUMN_NAME, WELL_LIST_TYPE))

    rows_written = 0
    writer: pq.ParquetWriter | None = None
    start = time.perf_counter()

    try:
        for batch in reader.iter_batches(batch_size=row_group_size):
            well_column = build_well_column(rows_written, batch.num_rows)
            augmented = pa.RecordBatch.from_arrays(
                list(batch.columns) + [well_column],
                schema=out_schema,
            )
            if writer is None:
                writer = pq.ParquetWriter(output, out_schema, **write_kwargs)
            writer.write_batch(augmented, row_group_size=row_group_size)
            rows_written += batch.num_rows
    finally:
        if writer is not None:
            writer.close()

    elapsed_seconds = time.perf_counter() - start
    file_size_mb = output.stat().st_size / (1024 * 1024)
    return {
        "rows": rows_written,
        "elapsed_seconds": elapsed_seconds,
        "file_size_mb": file_size_mb,
        "compression": codec,
    }


def augment_one(source: Path, output: Path, args: argparse.Namespace, label: str) -> None:
    print(f"Augmenting {label} -> {output}")
    metrics = augment_file(
        source=source,
        output=output,
        row_group_size=args.row_group_size,
        compression=args.compression,
        compression_level=args.compression_level,
    )
    print(
        f"  Added '{WELL_COLUMN_NAME}' to {metrics['rows']:,} rows in "
        f"{metrics['elapsed_seconds']:.2f}s "
        f"({metrics['file_size_mb']:.2f} MB, compression={metrics['compression']})"
    )


def augment_scale(scale: str, args: argparse.Namespace) -> None:
    source_ref, is_url = resolve_source(scale, args.source_base)
    output = (
        args.output
        if (args.output is not None and args.scale is not None)
        else args.output_dir / f"synthetic-{scale}.parquet"
    )
    temp_download: Path | None = None
    try:
        if is_url:
            temp_download = download_to_temp(source_ref)
            source_path = temp_download
        else:
            source_path = Path(source_ref)
        augment_one(source_path, output, args, label=f"scale={scale}")
    finally:
        if temp_download is not None:
            temp_download.unlink(missing_ok=True)


def main() -> None:
    args = parse_args()

    if args.row_group_size <= 0:
        raise ValueError("--row-group-size must be > 0")

    if args.input is not None:
        if args.output is None:
            raise ValueError("--output is required when using --input")
        augment_one(args.input, args.output, args, label=str(args.input))
    elif args.all_scales:
        for scale in SCALES:
            augment_scale(scale, args)
    else:
        augment_scale(args.scale, args)


if __name__ == "__main__":
    main()
