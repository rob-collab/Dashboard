# MI Metrics Import Guide

## Overview

The Consumer Duty dashboard now supports a **two-step import process** for measures with MI metrics:

1. **Import Measures** — creates the measure structure (Measure ID, Name, Outcome, Owner, Summary)
2. **Import MI Metrics** — attaches individual MI metrics to existing measures

## Step 1: Import Measures

### Convert Your CSV

If you have a hierarchical CSV (like the Google Sheets export), first convert it to flat format:

```bash
npx tsx scripts/convert-csv.ts "path/to/your-file.csv"
```

This creates a `-converted.csv` file with proper headers:
```
Measure ID, Name, Outcome, Owner, Summary, RAG
```

### Import via Dashboard

1. Open the Consumer Duty dashboard
2. Click **"Import Measures"** (CCRO team only)
3. Upload the `-converted.csv` file
4. Review column mappings (auto-detected)
5. Choose import mode:
   - **Append**: Add new measures alongside existing ones
   - **Replace**: Delete all measures under matched outcomes, then import
6. Preview and confirm

## Step 2: Import MI Metrics

### Extract MI Metrics

From the same original CSV, extract MI metrics:

```bash
npx tsx scripts/extract-mi-metrics.ts "path/to/your-file.csv"
```

This creates a `-mi-metrics.csv` file with format:
```
Measure ID, Metric Name, Current Value, RAG
1.1, Net Promoter Score, 72, Green
1.1, Average TrustPilot score, 4.5, Green
1.1, Google play store, , Green
```

### Import via Dashboard

1. Open the Consumer Duty dashboard
2. Click **"Import MI"** (CCRO team only)
3. Upload the `-mi-metrics.csv` file
4. Preview validation:
   - ✅ Matches measure IDs to existing measures
   - ❌ Flags any measure IDs not found
5. Confirm import

Multiple MI metrics with the same Measure ID will all be attached to that measure.

## Example Workflow

Given: `Consumer Duty - simplified metrics - Proposed list of metrics.csv`

```bash
# Step 1: Convert for measure import
npx tsx scripts/convert-csv.ts \
  "Consumer Duty - simplified metrics - Proposed list of metrics.csv"
# Output: ...Proposed list of metrics-converted.csv

# Step 2: Extract MI metrics
npx tsx scripts/extract-mi-metrics.ts \
  "Consumer Duty - simplified metrics - Proposed list of metrics.csv"
# Output: ...Proposed list of metrics-mi-metrics.csv
```

Then import both via the dashboard:
1. Import measures from `-converted.csv`
2. Import MI metrics from `-mi-metrics.csv`

## Files Created

After running the conversion scripts on your file, you'll have:

- **Original**: `your-file.csv` (hierarchical format)
- **Measures**: `your-file-converted.csv` (flat format for measure import)
- **MI Metrics**: `your-file-mi-metrics.csv` (flat format for MI import)

Keep all three — the original is your source of truth, the other two are import-ready formats.

## Notes

- **Measure IDs must match** between the two files
- **Current Value is optional** in MI import — leave blank if not yet available
- **RAG status defaults to GOOD** if not specified
- **Invalid rows are skipped** with clear error messages in preview
- **Idempotent** — re-importing MI metrics with the same Measure ID will add new metrics, not replace existing ones

## Troubleshooting

### "Measure X not found" error

The MI import can't find a measure with that Measure ID. Either:
- Import measures first (Step 1)
- Check Measure IDs match between files
- Verify measures weren't filtered out during measure import

### Blank dropdown columns

Your CSV header row is missing or malformed. The first row must contain column names like:
```
Measure ID, Name, Outcome, Owner, Summary, RAG
```

Use the conversion scripts to ensure proper formatting.
