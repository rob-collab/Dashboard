# How to Import Your Updated Measures

## Files Ready

You have two files ready to import:

1. **Measures**: `/Users/robhealey/Downloads/Consumer Duty - simplified metrics - Copy of Proposed list of metrics (2)-measures.csv`
   - 25 measures with normalized outcome names

2. **MI Metrics**: `/Users/robhealey/Downloads/Consumer Duty - simplified metrics - Copy of Proposed list of metrics (2)-mi.csv`
   - 32 MI metrics linked to those measures

## Import Steps

### Step 1: Import Measures (Replace Mode)

1. Open http://localhost:3003/consumer-duty in your browser
2. Log in as a CCRO user (e.g., `cath@updraft.com`)
3. Click **"Import Measures"** button
4. Upload the `-measures.csv` file
5. **Column Mapping** should auto-detect correctly:
   - Measure ID → Measure ID
   - Name → Name
   - Outcome → Outcome
   - Owner → Owner
   - Summary → Summary
   - RAG → RAG Status
6. Click **Next** to Options
7. **Important**: Select **"Replace all measures"** mode
   - This will delete existing measures and import the new 25
8. You'll see a warning - this is expected
9. Click **Next** to Preview
10. All 25 rows should show as **OK** (green)
11. Click **Import 25 Measures**
12. Wait for success message

### Step 2: Import MI Metrics

1. After measures are imported, click **"Import MI"** button
2. Upload the `-mi.csv` file
3. **Column Mapping** should auto-detect:
   - Measure ID → Measure ID
   - Metric Name → Metric Name
   - Current Value → Current Value
   - RAG → RAG
4. Click **Next** to Preview
5. All 32 rows should show as **OK** (matched to measures)
6. Click **Import 32 Metrics**
7. Wait for success message

### Step 3: Verify

1. Refresh the page (Cmd+R / Ctrl+R)
2. You should see:
   - **Products & Services**: 6 measures (1.1-1.6)
   - **Price & Value**: 4 measures (2.1, 2.2, 2.3, 2.5)
   - **Customer Understanding**: 3 measures (3.1, 3.2, 3.7)
   - **Customer Support**: 7 measures (4.1-4.7)
   - **Governance & Culture**: 5 measures (5.1-5.5)
3. Click on measure 1.1 - should have 4 MI metrics:
   - Net Promoter Score
   - Average TrustPilot score
   - Google play store
   - iOS store

## If Something Goes Wrong

### "Could not match outcome" errors
- The outcome names in the CSV don't match the database
- Already fixed in the latest `-measures.csv` file

### Measures don't persist after refresh
- Make sure you selected **"Replace all measures"** mode
- This was a bug that's now fixed in commit 7f01623

### MI Import shows "Measure not found"
- Import measures first (Step 1) before importing MI metrics
- Make sure Measure IDs match between the two files

## What Was Fixed

The latest conversion includes:
- ✅ Normalized outcome names (Products vs Product, & vs and)
- ✅ Fixed duplicate Measure ID 2.3 → 2.5
- ✅ Fixed Measure ID 4.70 → 4.7
- ✅ Proper CSV quoting for fields with commas
- ✅ Replace mode now persists to database
