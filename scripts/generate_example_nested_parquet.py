from pathlib import Path
import random
import string

import pyarrow as pa
import pyarrow.parquet as pq

NUM_ROWS = 10_000_000

# --- Value pools for randomisation ---
GENES = ["TP53", "MYC", "EGFR", "KRAS", "BRCA1", "BRCA2", "APC", "RB1", "PTEN", "CDH1"]
SOLUTION_NAMES = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX"]
UNITS = ["uM", "nM", "mM"]
ASSAYS = [f"Pilot-{i}" for i in range(1, 21)]
WELL_ROWS = list("ABCDEFGH")
WELL_COLS = list(range(1, 13))

random.seed(42)


def random_solution():
    return {
        "Name": random.choice(SOLUTION_NAMES),
        "Concentration": round(random.uniform(0.01, 10.0), 2),
        "Unit": random.choice(UNITS),
    }


def random_well_entry():
    return {
        "Row": random.choice(WELL_ROWS),
        "Column": random.choice(WELL_COLS),
        "Gene": random.choice(GENES),
        "Solution": random_solution(),
    }


def random_file_path(idx: int) -> str:
    prefix = "".join(random.choices(string.ascii_lowercase, k=3))
    return f"s3://example-bucket/images/{prefix}_{idx:07d}.ome.tiff"


# --- Build rows ---
rows = []
for i in range(NUM_ROWS):
    num_wells = random.randint(1, 4)
    rows.append(
        {
            "File Path": random_file_path(i),
            "Well": [random_well_entry() for _ in range(num_wells)],
            "Assay": random.choice(ASSAYS),
        }
    )

table = pa.Table.from_pylist(rows)
out_path = Path("packages/core/test-data/example_nested_metadata_large.parquet")
out_path.parent.mkdir(parents=True, exist_ok=True)
pq.write_table(table, out_path)

print(out_path)
print("rows:", table.num_rows)
print(table.schema)
