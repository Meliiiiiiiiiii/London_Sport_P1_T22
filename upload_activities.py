import pandas as pd
import boto3
import math
from decimal import Decimal

CSV_PATH = "/Users/simrithcprince/Downloads/OPENACTIVE_MERGED (1).csv"
TABLE_NAME = "LondonActivities"
REGION = "eu-north-1"

def clean_value(v):
    """Convert pandas/numpy values into DynamoDB-safe types."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v):
            return None
        return Decimal(str(v))
    if isinstance(v, bool):
        return v
    return v

def main():
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} rows from CSV")

    dynamodb = boto3.resource("dynamodb", region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)

    records = df.to_dict(orient="records")

    written = 0
    skipped = 0

    with table.batch_writer(overwrite_by_pkeys=["session_id"]) as batch:
        for row in records:
            item = {}
            for k, v in row.items():
                cleaned = clean_value(v)
                if cleaned is not None:
                    item[k] = cleaned

            if "session_id" not in item or not item["session_id"]:
                skipped += 1
                continue

            batch.put_item(Item=item)
            written += 1

            if written % 2000 == 0:
                print(f"  ...{written} rows uploaded so far")

    print(f"Done. Uploaded: {written}, Skipped (no session_id): {skipped}")

if __name__ == "__main__":
    main()