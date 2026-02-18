import type { ControlRecord, TestingFrequency } from "./types";

/** Months allowed between tests before a control is overdue */
const FREQUENCY_MONTHS: Record<TestingFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  BI_ANNUAL: 6,
  ANNUAL: 12,
};

export interface TestingStatusResult {
  label: string;
  colour: string;
  bgColour: string;
  dotColour: string;
}

/**
 * Derive the testing status for a control, accounting for testing frequency.
 * A control tested monthly but last tested 3+ months ago is "Overdue".
 */
export function deriveTestingStatus(control: ControlRecord): TestingStatusResult {
  if (!control.testingSchedule) {
    return {
      label: "Not Scheduled",
      colour: "text-gray-500",
      bgColour: "bg-gray-100",
      dotColour: "bg-gray-400",
    };
  }

  if (!control.testingSchedule.isActive) {
    return {
      label: "Removed",
      colour: "text-orange-600",
      bgColour: "bg-orange-100",
      dotColour: "bg-orange-400",
    };
  }

  const results = control.testingSchedule.testResults ?? [];
  if (results.length === 0) {
    return {
      label: "Awaiting Test",
      colour: "text-blue-600",
      bgColour: "bg-blue-100",
      dotColour: "bg-blue-400",
    };
  }

  // Sort results by period descending to find the latest
  const sorted = [...results].sort((a, b) => {
    if (a.periodYear !== b.periodYear) return b.periodYear - a.periodYear;
    return b.periodMonth - a.periodMonth;
  });
  const latest = sorted[0];

  // Check if overdue based on testing frequency
  const frequency = control.testingSchedule.testingFrequency;
  const thresholdMonths = FREQUENCY_MONTHS[frequency];
  if (thresholdMonths) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Calculate months elapsed since the latest test period
    const monthsElapsed =
      (currentYear - latest.periodYear) * 12 + (currentMonth - latest.periodMonth);

    if (monthsElapsed > thresholdMonths) {
      return {
        label: "Overdue",
        colour: "text-red-700",
        bgColour: "bg-red-100",
        dotColour: "bg-red-500",
      };
    }
  }

  // Show the latest result status
  switch (latest.result) {
    case "PASS":
      return {
        label: "Pass",
        colour: "text-green-700",
        bgColour: "bg-green-100",
        dotColour: "bg-green-500",
      };
    case "FAIL":
      return {
        label: "Fail",
        colour: "text-red-700",
        bgColour: "bg-red-100",
        dotColour: "bg-red-500",
      };
    case "PARTIALLY":
      return {
        label: "Partial",
        colour: "text-amber-700",
        bgColour: "bg-amber-100",
        dotColour: "bg-amber-500",
      };
    default:
      return {
        label: "Not Tested",
        colour: "text-gray-600",
        bgColour: "bg-gray-100",
        dotColour: "bg-gray-400",
      };
  }
}
