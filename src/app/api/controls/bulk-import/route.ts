import { NextRequest } from "next/server";
import { prisma, requireCCRORole, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

/* ------------------------------------------------------------------ */
/* CSV column → enum mapping                                          */
/* ------------------------------------------------------------------ */

const VALID_CD_OUTCOMES = ["PRODUCTS_AND_SERVICES", "CONSUMER_UNDERSTANDING", "CONSUMER_SUPPORT", "GOVERNANCE_CULTURE_OVERSIGHT"] as const;
const VALID_CONTROL_FREQ = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL", "EVENT_DRIVEN"] as const;
const VALID_INT_TP = ["INTERNAL", "THIRD_PARTY"] as const;
const VALID_CONTROL_TYPE = ["PREVENTATIVE", "DETECTIVE", "CORRECTIVE", "DIRECTIVE"] as const;
const VALID_TESTING_FREQ = ["MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL"] as const;
const VALID_TEST_RESULT = ["PASS", "FAIL", "PARTIALLY", "NOT_TESTED", "NOT_DUE"] as const;

/* ------------------------------------------------------------------ */
/* CSV parser (handles quoted fields with commas/newlines)             */
/* ------------------------------------------------------------------ */

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(current.trim());
      current = "";
    } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      row.push(current.trim());
      current = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else {
      current += ch;
    }
  }
  // last field / row
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Test-result period column detection (e.g. "2025-03 Result")        */
/* ------------------------------------------------------------------ */

interface PeriodCol {
  year: number;
  month: number;
  resultIdx: number;
  notesIdx: number | null;
}

function detectPeriodColumns(headers: string[]): PeriodCol[] {
  const periods: PeriodCol[] = [];
  const pattern = /^(\d{4})-(\d{2})\s+Result$/i;

  for (let i = 0; i < headers.length; i++) {
    const m = headers[i].match(pattern);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    // Look for adjacent notes column
    const notesHeader = `${m[1]}-${m[2]} Notes`;
    const notesIdx = headers.findIndex((h) => h.toLowerCase() === notesHeader.toLowerCase());
    periods.push({ year, month, resultIdx: i, notesIdx: notesIdx >= 0 ? notesIdx : null });
  }
  return periods;
}

/* ------------------------------------------------------------------ */
/* POST handler                                                       */
/* ------------------------------------------------------------------ */

interface RowError { row: number; field: string; message: string }

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCCRORole(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { csv, preview } = body as { csv: string; preview?: boolean };

    if (!csv || typeof csv !== "string") {
      return errorResponse("Missing CSV data", 400);
    }

    const parsed = parseCSV(csv);
    if (parsed.length < 2) {
      return errorResponse("CSV must have a header row and at least one data row", 400);
    }

    const headers = parsed[0].map((h) => h.trim());
    const dataRows = parsed.slice(1);
    const periodCols = detectPeriodColumns(headers);

    // Build column index map
    const col = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const iName = col("Control Name");
    const iDesc = col("Control Description");
    const iArea = col("Business Area");
    const iOwner = col("Control Owner Email");
    const iOutcome = col("Consumer Duty Outcome");
    const iFreq = col("Control Frequency");
    const iIntTp = col("Internal or Third Party");
    const iType = col("Control Type");
    const iComments = col("Standing Comments");
    const iTestFreq = col("Testing Frequency");
    const iTester = col("Assigned Tester Email");
    const iSummary = col("Summary of Test");

    if (iName < 0 || iDesc < 0 || iArea < 0 || iOwner < 0 || iOutcome < 0 || iFreq < 0) {
      return errorResponse(
        "Missing required columns: Control Name, Control Description, Business Area, Control Owner Email, Consumer Duty Outcome, Control Frequency",
        400
      );
    }

    // Pre-load lookup data
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    const allAreas = await prisma.controlBusinessArea.findMany();

    const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));
    const areaByName = new Map(allAreas.map((a) => [a.name.toLowerCase(), a]));

    // Determine next CTRL-NNN
    const lastCtrl = await prisma.control.findFirst({ orderBy: { controlRef: "desc" } });
    let nextNum = 1;
    if (lastCtrl) {
      const m = lastCtrl.controlRef.match(/CTRL-(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }

    // Validate all rows first
    const errors: RowError[] = [];
    const validatedRows: {
      controlName: string;
      controlDescription: string;
      businessAreaId: string;
      controlOwnerId: string;
      consumerDutyOutcome: string;
      controlFrequency: string;
      internalOrThirdParty: string;
      controlType: string | null;
      standingComments: string | null;
      testingFrequency: string | null;
      assignedTesterId: string | null;
      summaryOfTest: string | null;
      testResults: { year: number; month: number; result: string; notes: string | null }[];
      controlRef: string;
    }[] = [];

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      const rowNum = r + 2; // 1-indexed, accounting for header
      const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : "");

      const controlName = get(iName);
      const controlDescription = get(iDesc);
      const businessAreaName = get(iArea);
      const ownerEmail = get(iOwner);
      const outcome = get(iOutcome);
      const freq = get(iFreq);
      const intTp = get(iIntTp) || "INTERNAL";
      const controlType = get(iType) || null;
      const comments = get(iComments) || null;
      const testFreq = get(iTestFreq) || null;
      const testerEmail = get(iTester) || null;
      const summaryOfTest = get(iSummary) || null;

      // Required field checks
      if (!controlName) errors.push({ row: rowNum, field: "Control Name", message: "Required" });
      if (!controlDescription) errors.push({ row: rowNum, field: "Control Description", message: "Required" });
      if (!businessAreaName) errors.push({ row: rowNum, field: "Business Area", message: "Required" });
      if (!ownerEmail) errors.push({ row: rowNum, field: "Control Owner Email", message: "Required" });

      // Enum validation
      if (outcome && !VALID_CD_OUTCOMES.includes(outcome as never)) {
        errors.push({ row: rowNum, field: "Consumer Duty Outcome", message: `Invalid value "${outcome}". Must be one of: ${VALID_CD_OUTCOMES.join(", ")}` });
      }
      if (freq && !VALID_CONTROL_FREQ.includes(freq as never)) {
        errors.push({ row: rowNum, field: "Control Frequency", message: `Invalid value "${freq}". Must be one of: ${VALID_CONTROL_FREQ.join(", ")}` });
      }
      if (intTp && !VALID_INT_TP.includes(intTp as never)) {
        errors.push({ row: rowNum, field: "Internal or Third Party", message: `Invalid value "${intTp}". Must be INTERNAL or THIRD_PARTY` });
      }
      if (controlType && !VALID_CONTROL_TYPE.includes(controlType as never)) {
        errors.push({ row: rowNum, field: "Control Type", message: `Invalid value "${controlType}". Must be one of: ${VALID_CONTROL_TYPE.join(", ")}` });
      }

      // Resolve business area (create if not found)
      let areaId = areaByName.get(businessAreaName.toLowerCase())?.id ?? null;
      if (!areaId && businessAreaName) {
        // Will create during commit phase
        areaId = `pending:${businessAreaName}`;
      }

      // Resolve owner
      const owner = ownerEmail ? userByEmail.get(ownerEmail.toLowerCase()) : null;
      if (ownerEmail && !owner) {
        errors.push({ row: rowNum, field: "Control Owner Email", message: `User not found: "${ownerEmail}"` });
      }

      // Testing schedule validation
      const hasTestSchedule = testFreq || testerEmail || summaryOfTest;
      if (hasTestSchedule) {
        if (!testFreq) errors.push({ row: rowNum, field: "Testing Frequency", message: "Required when adding to testing schedule" });
        if (testFreq && !VALID_TESTING_FREQ.includes(testFreq as never)) {
          errors.push({ row: rowNum, field: "Testing Frequency", message: `Invalid value "${testFreq}". Must be one of: ${VALID_TESTING_FREQ.join(", ")}` });
        }
        if (!testerEmail) errors.push({ row: rowNum, field: "Assigned Tester Email", message: "Required when adding to testing schedule" });
        if (testerEmail && !userByEmail.get(testerEmail.toLowerCase())) {
          errors.push({ row: rowNum, field: "Assigned Tester Email", message: `User not found: "${testerEmail}"` });
        }
        if (!summaryOfTest) errors.push({ row: rowNum, field: "Summary of Test", message: "Required when adding to testing schedule" });
      }

      // Test results validation
      const testResults: { year: number; month: number; result: string; notes: string | null }[] = [];
      for (const pc of periodCols) {
        const result = get(pc.resultIdx);
        const notes = pc.notesIdx !== null ? get(pc.notesIdx) || null : null;
        if (!result) continue;
        if (!VALID_TEST_RESULT.includes(result as never)) {
          errors.push({ row: rowNum, field: `${pc.year}-${String(pc.month).padStart(2, "0")} Result`, message: `Invalid value "${result}". Must be one of: ${VALID_TEST_RESULT.join(", ")}` });
          continue;
        }
        if ((result === "FAIL" || result === "PARTIALLY") && !notes) {
          errors.push({ row: rowNum, field: `${pc.year}-${String(pc.month).padStart(2, "0")} Notes`, message: `Notes required for ${result} results` });
        }
        testResults.push({ year: pc.year, month: pc.month, result, notes });
      }

      // If test results exist but no testing schedule, that's an error
      if (testResults.length > 0 && !hasTestSchedule) {
        errors.push({ row: rowNum, field: "Testing Frequency", message: "Testing schedule fields are required when test results are provided" });
      }

      const controlRef = `CTRL-${String(nextNum + r).padStart(3, "0")}`;

      validatedRows.push({
        controlName,
        controlDescription,
        businessAreaId: areaId ?? "",
        controlOwnerId: owner?.id ?? "",
        consumerDutyOutcome: outcome,
        controlFrequency: freq,
        internalOrThirdParty: intTp,
        controlType,
        standingComments: comments,
        testingFrequency: testFreq,
        assignedTesterId: testerEmail ? (userByEmail.get(testerEmail.toLowerCase())?.id ?? "") : null,
        summaryOfTest,
        testResults,
        controlRef,
      });
    }

    // Preview mode: return validation results
    if (preview) {
      return jsonResponse({
        valid: errors.length === 0,
        rowCount: dataRows.length,
        errors,
        controls: validatedRows.map((r) => ({
          controlRef: r.controlRef,
          controlName: r.controlName,
          businessArea: dataRows[validatedRows.indexOf(r)]?.[iArea]?.trim(),
          testResultCount: r.testResults.length,
          hasTestingSchedule: !!(r.testingFrequency),
        })),
      });
    }

    // Commit mode: return errors if any
    if (errors.length > 0) {
      return jsonResponse({ valid: false, errors }, 400);
    }

    // ---- Commit phase: create everything in the database ----

    // Create any missing business areas
    const pendingAreas = new Map<string, string>();
    for (const row of validatedRows) {
      if (row.businessAreaId.startsWith("pending:")) {
        const areaName = row.businessAreaId.slice(8);
        if (!pendingAreas.has(areaName.toLowerCase())) {
          const created = await prisma.controlBusinessArea.create({
            data: { name: areaName, sortOrder: allAreas.length + pendingAreas.size },
          });
          pendingAreas.set(areaName.toLowerCase(), created.id);
        }
        row.businessAreaId = pendingAreas.get(areaName.toLowerCase())!;
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const createdControls = [];

    for (const row of validatedRows) {
      // Create control
      const control = await prisma.control.create({
        data: {
          controlRef: row.controlRef,
          controlName: row.controlName,
          controlDescription: row.controlDescription,
          businessAreaId: row.businessAreaId,
          controlOwnerId: row.controlOwnerId,
          consumerDutyOutcome: row.consumerDutyOutcome as never,
          controlFrequency: row.controlFrequency as never,
          internalOrThirdParty: row.internalOrThirdParty as never,
          controlType: row.controlType as never,
          standingComments: row.standingComments,
          createdById: auth.userId,
        },
        include: { businessArea: true, controlOwner: true },
      });

      // Create testing schedule if specified
      let scheduleEntry = null;
      if (row.testingFrequency && row.assignedTesterId && row.summaryOfTest) {
        scheduleEntry = await prisma.testingScheduleEntry.create({
          data: {
            controlId: control.id,
            testingFrequency: row.testingFrequency as never,
            assignedTesterId: row.assignedTesterId,
            summaryOfTest: row.summaryOfTest,
            addedById: auth.userId,
          },
        });

        // Create test results
        if (row.testResults.length > 0 && scheduleEntry) {
          for (const tr of row.testResults) {
            const isBackdated = tr.year < currentYear || (tr.year === currentYear && tr.month < currentMonth);
            await prisma.controlTestResult.create({
              data: {
                scheduleEntryId: scheduleEntry.id,
                periodYear: tr.year,
                periodMonth: tr.month,
                result: tr.result as never,
                notes: tr.notes,
                evidenceLinks: [],
                isBackdated,
                testedById: row.assignedTesterId,
              },
            });
          }
        }
      }

      createdControls.push({
        ...control,
        testingSchedule: scheduleEntry,
        testResultCount: row.testResults.length,
      });
    }

    return jsonResponse(serialiseDates({
      created: createdControls.length,
      controls: createdControls,
    }), 201);
  } catch (err) {
    console.error("[POST /api/controls/bulk-import]", err);
    return errorResponse("Internal server error", 500);
  }
}
