from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

rows = [
    {
        "File Path": "s3://example-bucket/images/img_001.ome.tiff",
        "Well": {
            "A3": {
                "Gene": "TP53",
                "Dose": {"Value": 0.5, "Unit": "uM"},
            },
            "B7": {
                "Gene": "MYC",
                "Dose": {"Value": 1.25, "Unit": "uM"},
            },
        },
        "Assay": "Pilot-1",
    },
    {
        "File Path": "s3://example-bucket/images/img_002.ome.tiff",
        "Well": {
            "A3": {
                "Gene": "EGFR",
                "Dose": {"Value": 0.75, "Unit": "uM"},
            },
            "B7": {
                "Gene": "KRAS",
                "Dose": {"Value": 2.0, "Unit": "uM"},
            },
        },
        "Assay": "Pilot-1",
    },
]

table = pa.Table.from_pylist(rows)
out_path = Path("packages/core/test-data/example_nested_metadata.parquet")
out_path.parent.mkdir(parents=True, exist_ok=True)
pq.write_table(table, out_path)

print(out_path)
print("rows", table.num_rows)
print(table.schema)
