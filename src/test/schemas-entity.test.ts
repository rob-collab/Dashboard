/**
 * Tests for Zod validation schemas: users, actions, reports, templates,
 * components, and consumer-duty.
 *
 * Each schema is tested with:
 *  - a valid minimal input (success)
 *  - missing/empty required fields (failure)
 *  - default values being applied
 *  - enum rejection of unknown values
 *  - optional fields accepted when absent
 */
import { describe, it, expect } from "vitest";

// ── users ─────────────────────────────────────────────────────────────────────
import {
  UserRole,
  CreateUserSchema,
  UpdateUserSchema,
} from "@/lib/schemas/users";

// ── actions ───────────────────────────────────────────────────────────────────
import {
  ActionStatus,
  CreateActionSchema,
  UpdateActionSchema,
  ActionQuerySchema,
} from "@/lib/schemas/actions";

// ── reports ───────────────────────────────────────────────────────────────────
import {
  ReportStatus,
  CreateReportSchema,
  UpdateReportSchema,
} from "@/lib/schemas/reports";

// ── templates ─────────────────────────────────────────────────────────────────
import {
  SectionType,
  CreateTemplateSchema,
  UpdateTemplateSchema,
} from "@/lib/schemas/templates";

// ── components ────────────────────────────────────────────────────────────────
import {
  CreateComponentSchema,
  UpdateComponentSchema,
} from "@/lib/schemas/components";

// ── consumer-duty ─────────────────────────────────────────────────────────────
import {
  RAGStatus,
  CreateOutcomeSchema,
  UpdateOutcomeSchema,
  CreateMeasureSchema,
  UpdateMeasureSchema,
  CreateMISchema,
  UpdateMISchema,
} from "@/lib/schemas/consumer-duty";

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

describe("UserRole", () => {
  it("accepts all valid roles", () => {
    for (const role of ["CCRO_TEAM", "CEO", "OWNER", "VIEWER"]) {
      expect(UserRole.safeParse(role).success).toBe(true);
    }
  });

  it("rejects unknown roles", () => {
    expect(UserRole.safeParse("ADMIN").success).toBe(false);
    expect(UserRole.safeParse("").success).toBe(false);
  });
});

describe("CreateUserSchema", () => {
  const valid = { email: "alice@example.com", name: "Alice" };

  it("accepts valid minimal input", () => {
    expect(CreateUserSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults role to VIEWER", () => {
    const result = CreateUserSchema.safeParse(valid);
    expect(result.success && result.data.role).toBe("VIEWER");
  });

  it("defaults isActive to true", () => {
    const result = CreateUserSchema.safeParse(valid);
    expect(result.success && result.data.isActive).toBe(true);
  });

  it("defaults assignedMeasures to []", () => {
    const result = CreateUserSchema.safeParse(valid);
    expect(result.success && result.data.assignedMeasures).toEqual([]);
  });

  it("rejects invalid email", () => {
    expect(CreateUserSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(CreateUserSchema.safeParse({ ...valid, email: "" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(CreateUserSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects missing email", () => {
    expect(CreateUserSchema.safeParse({ name: "Alice" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(CreateUserSchema.safeParse({ email: "alice@example.com" }).success).toBe(false);
  });

  it("rejects invalid role enum value", () => {
    expect(CreateUserSchema.safeParse({ ...valid, role: "SUPERADMIN" }).success).toBe(false);
  });

  it("accepts all valid roles", () => {
    for (const role of ["CCRO_TEAM", "CEO", "OWNER", "VIEWER"]) {
      expect(CreateUserSchema.safeParse({ ...valid, role }).success).toBe(true);
    }
  });

  it("accepts optional id field", () => {
    expect(CreateUserSchema.safeParse({ ...valid, id: "user-123" }).success).toBe(true);
  });
});

describe("UpdateUserSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(UpdateUserSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid email if provided", () => {
    expect(UpdateUserSchema.safeParse({ email: "bad-email" }).success).toBe(false);
  });

  it("rejects empty name if provided", () => {
    expect(UpdateUserSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects invalid role if provided", () => {
    expect(UpdateUserSchema.safeParse({ role: "GOD" }).success).toBe(false);
  });

  it("accepts partial valid updates", () => {
    expect(UpdateUserSchema.safeParse({ name: "Bob", isActive: false }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe("ActionStatus", () => {
  it("accepts all valid statuses", () => {
    for (const s of ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "PROPOSED_CLOSED"]) {
      expect(ActionStatus.safeParse(s).success).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(ActionStatus.safeParse("PENDING").success).toBe(false);
    expect(ActionStatus.safeParse("").success).toBe(false);
  });
});

describe("CreateActionSchema", () => {
  const valid = { title: "Fix it", assignedTo: "user-1" };

  it("accepts valid minimal input", () => {
    expect(CreateActionSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults status to OPEN", () => {
    const result = CreateActionSchema.safeParse(valid);
    expect(result.success && result.data.status).toBe("OPEN");
  });

  it("defaults description to empty string", () => {
    const result = CreateActionSchema.safeParse(valid);
    expect(result.success && result.data.description).toBe("");
  });

  it("rejects empty title", () => {
    expect(CreateActionSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects missing title", () => {
    expect(CreateActionSchema.safeParse({ assignedTo: "user-1" }).success).toBe(false);
  });

  it("rejects empty assignedTo", () => {
    expect(CreateActionSchema.safeParse({ ...valid, assignedTo: "" }).success).toBe(false);
  });

  it("rejects missing assignedTo", () => {
    expect(CreateActionSchema.safeParse({ title: "Fix it" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(CreateActionSchema.safeParse({ ...valid, status: "BLOCKED" }).success).toBe(false);
  });

  it("rejects invalid priority", () => {
    expect(CreateActionSchema.safeParse({ ...valid, priority: "HIGH" }).success).toBe(false);
  });

  it("accepts all valid priorities", () => {
    for (const p of ["P1", "P2", "P3"]) {
      expect(CreateActionSchema.safeParse({ ...valid, priority: p }).success).toBe(true);
    }
  });

  it("accepts null for nullable optional fields", () => {
    expect(CreateActionSchema.safeParse({ ...valid, dueDate: null, reportId: null }).success).toBe(true);
  });
});

describe("UpdateActionSchema", () => {
  it("accepts an empty object", () => {
    expect(UpdateActionSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty title if provided", () => {
    expect(UpdateActionSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects invalid status if provided", () => {
    expect(UpdateActionSchema.safeParse({ status: "STALLED" }).success).toBe(false);
  });

  it("rejects invalid approvalStatus if provided", () => {
    expect(UpdateActionSchema.safeParse({ approvalStatus: "MAYBE" }).success).toBe(false);
  });

  it("accepts valid approvalStatus values", () => {
    for (const s of ["APPROVED", "PENDING_APPROVAL", "REJECTED"]) {
      expect(UpdateActionSchema.safeParse({ approvalStatus: s }).success).toBe(true);
    }
  });

  it("accepts partial valid updates", () => {
    expect(UpdateActionSchema.safeParse({ title: "New title", status: "COMPLETED" }).success).toBe(true);
  });
});

describe("ActionQuerySchema", () => {
  it("accepts empty object", () => {
    expect(ActionQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid status in query", () => {
    expect(ActionQuerySchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);
  });

  it("accepts valid status filter", () => {
    expect(ActionQuerySchema.safeParse({ status: "OPEN" }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

describe("ReportStatus", () => {
  it("accepts all valid statuses", () => {
    for (const s of ["DRAFT", "PUBLISHED", "ARCHIVED"]) {
      expect(ReportStatus.safeParse(s).success).toBe(true);
    }
  });

  it("rejects unknown status", () => {
    expect(ReportStatus.safeParse("PENDING").success).toBe(false);
  });
});

describe("CreateReportSchema", () => {
  const valid = { title: "Q1 Report", period: "Q1 2025" };

  it("accepts valid minimal input", () => {
    expect(CreateReportSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults status to DRAFT", () => {
    const result = CreateReportSchema.safeParse(valid);
    expect(result.success && result.data.status).toBe("DRAFT");
  });

  it("rejects empty title", () => {
    expect(CreateReportSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejects missing title", () => {
    expect(CreateReportSchema.safeParse({ period: "Q1 2025" }).success).toBe(false);
  });

  it("rejects empty period", () => {
    expect(CreateReportSchema.safeParse({ ...valid, period: "" }).success).toBe(false);
  });

  it("rejects missing period", () => {
    expect(CreateReportSchema.safeParse({ title: "Q1 Report" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(CreateReportSchema.safeParse({ ...valid, status: "LIVE" }).success).toBe(false);
  });

  it("accepts optional id", () => {
    expect(CreateReportSchema.safeParse({ ...valid, id: "rpt-1" }).success).toBe(true);
  });
});

describe("UpdateReportSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateReportSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty title if provided", () => {
    expect(UpdateReportSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects invalid status if provided", () => {
    expect(UpdateReportSchema.safeParse({ status: "LIVE" }).success).toBe(false);
  });

  it("accepts valid partial update", () => {
    expect(UpdateReportSchema.safeParse({ status: "PUBLISHED" }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

describe("SectionType", () => {
  const types = [
    "TEXT_BLOCK", "DATA_TABLE", "CONSUMER_DUTY_DASHBOARD", "CHART",
    "CARD_GRID", "IMPORTED_COMPONENT", "TEMPLATE_INSTANCE", "ACCORDION", "IMAGE_BLOCK",
  ];

  it("accepts all valid section types", () => {
    for (const t of types) {
      expect(SectionType.safeParse(t).success).toBe(true);
    }
  });

  it("rejects unknown section type", () => {
    expect(SectionType.safeParse("UNKNOWN_BLOCK").success).toBe(false);
    expect(SectionType.safeParse("").success).toBe(false);
  });
});

describe("CreateTemplateSchema", () => {
  const valid = { name: "My Template" };

  it("accepts valid minimal input (name only)", () => {
    expect(CreateTemplateSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults description to empty string", () => {
    const result = CreateTemplateSchema.safeParse(valid);
    expect(result.success && result.data.description).toBe("");
  });

  it("defaults category to General", () => {
    const result = CreateTemplateSchema.safeParse(valid);
    expect(result.success && result.data.category).toBe("General");
  });

  it("defaults sectionType to TEXT_BLOCK", () => {
    const result = CreateTemplateSchema.safeParse(valid);
    expect(result.success && result.data.sectionType).toBe("TEXT_BLOCK");
  });

  it("defaults isGlobal to false", () => {
    const result = CreateTemplateSchema.safeParse(valid);
    expect(result.success && result.data.isGlobal).toBe(false);
  });

  it("defaults version to 1", () => {
    const result = CreateTemplateSchema.safeParse(valid);
    expect(result.success && result.data.version).toBe(1);
  });

  it("rejects empty name", () => {
    expect(CreateTemplateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(CreateTemplateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects invalid sectionType", () => {
    expect(CreateTemplateSchema.safeParse({ ...valid, sectionType: "UNKNOWN" }).success).toBe(false);
  });

  it("accepts all valid sectionType values", () => {
    for (const t of ["TEXT_BLOCK", "CHART", "ACCORDION", "IMAGE_BLOCK"]) {
      expect(CreateTemplateSchema.safeParse({ ...valid, sectionType: t }).success).toBe(true);
    }
  });
});

describe("UpdateTemplateSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateTemplateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty name if provided", () => {
    expect(UpdateTemplateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects invalid sectionType if provided", () => {
    expect(UpdateTemplateSchema.safeParse({ sectionType: "BOGUS" }).success).toBe(false);
  });

  it("accepts partial valid update", () => {
    expect(UpdateTemplateSchema.safeParse({ name: "New Name", isGlobal: true }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

describe("CreateComponentSchema", () => {
  const valid = { name: "Risk Table", htmlContent: "<table></table>" };

  it("accepts valid input", () => {
    expect(CreateComponentSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults description to empty string", () => {
    const result = CreateComponentSchema.safeParse(valid);
    expect(result.success && result.data.description).toBe("");
  });

  it("defaults category to General", () => {
    const result = CreateComponentSchema.safeParse(valid);
    expect(result.success && result.data.category).toBe("General");
  });

  it("rejects empty name", () => {
    expect(CreateComponentSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(CreateComponentSchema.safeParse({ htmlContent: "<p/>" }).success).toBe(false);
  });

  it("rejects empty htmlContent", () => {
    expect(CreateComponentSchema.safeParse({ ...valid, htmlContent: "" }).success).toBe(false);
  });

  it("rejects missing htmlContent", () => {
    expect(CreateComponentSchema.safeParse({ name: "Widget" }).success).toBe(false);
  });
});

describe("UpdateComponentSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateComponentSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty name if provided", () => {
    expect(UpdateComponentSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts partial updates", () => {
    expect(UpdateComponentSchema.safeParse({ category: "Charts" }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMER DUTY
// ─────────────────────────────────────────────────────────────────────────────

describe("RAGStatus (consumer-duty)", () => {
  it("accepts GOOD, WARNING, HARM", () => {
    for (const s of ["GOOD", "WARNING", "HARM"]) {
      expect(RAGStatus.safeParse(s).success).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(RAGStatus.safeParse("RED").success).toBe(false);
    expect(RAGStatus.safeParse("green").success).toBe(false);
    expect(RAGStatus.safeParse("").success).toBe(false);
  });
});

describe("CreateOutcomeSchema", () => {
  const valid = {
    reportId: "rpt-1",
    outcomeId: "O1",
    name: "Products & Services",
    shortDesc: "Covers product outcomes",
  };

  it("accepts valid input", () => {
    expect(CreateOutcomeSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults ragStatus to GOOD", () => {
    const result = CreateOutcomeSchema.safeParse(valid);
    expect(result.success && result.data.ragStatus).toBe("GOOD");
  });

  it("defaults position to 0", () => {
    const result = CreateOutcomeSchema.safeParse(valid);
    expect(result.success && result.data.position).toBe(0);
  });

  it("rejects empty reportId", () => {
    expect(CreateOutcomeSchema.safeParse({ ...valid, reportId: "" }).success).toBe(false);
  });

  it("rejects empty outcomeId", () => {
    expect(CreateOutcomeSchema.safeParse({ ...valid, outcomeId: "" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(CreateOutcomeSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects invalid ragStatus", () => {
    expect(CreateOutcomeSchema.safeParse({ ...valid, ragStatus: "AMBER" }).success).toBe(false);
  });

  it("rejects negative position", () => {
    expect(CreateOutcomeSchema.safeParse({ ...valid, position: -1 }).success).toBe(false);
  });
});

describe("UpdateOutcomeSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateOutcomeSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty name if provided", () => {
    expect(UpdateOutcomeSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects invalid ragStatus if provided", () => {
    expect(UpdateOutcomeSchema.safeParse({ ragStatus: "AMBER" }).success).toBe(false);
  });

  it("accepts null previousRAG", () => {
    expect(UpdateOutcomeSchema.safeParse({ previousRAG: null }).success).toBe(true);
  });
});

describe("CreateMeasureSchema", () => {
  const valid = { outcomeId: "O1", measureId: "M001", name: "Customer complaints" };

  it("accepts valid input", () => {
    expect(CreateMeasureSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults ragStatus to GOOD", () => {
    const result = CreateMeasureSchema.safeParse(valid);
    expect(result.success && result.data.ragStatus).toBe("GOOD");
  });

  it("defaults position to 0", () => {
    const result = CreateMeasureSchema.safeParse(valid);
    expect(result.success && result.data.position).toBe(0);
  });

  it("defaults summary to empty string", () => {
    const result = CreateMeasureSchema.safeParse(valid);
    expect(result.success && result.data.summary).toBe("");
  });

  it("rejects empty outcomeId", () => {
    expect(CreateMeasureSchema.safeParse({ ...valid, outcomeId: "" }).success).toBe(false);
  });

  it("rejects empty measureId", () => {
    expect(CreateMeasureSchema.safeParse({ ...valid, measureId: "" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(CreateMeasureSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects negative position", () => {
    expect(CreateMeasureSchema.safeParse({ ...valid, position: -5 }).success).toBe(false);
  });
});

describe("UpdateMeasureSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateMeasureSchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty name if provided", () => {
    expect(UpdateMeasureSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects negative position if provided", () => {
    expect(UpdateMeasureSchema.safeParse({ position: -1 }).success).toBe(false);
  });
});

describe("CreateMISchema", () => {
  const valid = { measureId: "m-1", metric: "NPS Score", current: "72" };

  it("accepts valid input", () => {
    expect(CreateMISchema.safeParse(valid).success).toBe(true);
  });

  it("defaults ragStatus to GOOD", () => {
    const result = CreateMISchema.safeParse(valid);
    expect(result.success && result.data.ragStatus).toBe("GOOD");
  });

  it("defaults previous to empty string", () => {
    const result = CreateMISchema.safeParse(valid);
    expect(result.success && result.data.previous).toBe("");
  });

  it("defaults change to empty string", () => {
    const result = CreateMISchema.safeParse(valid);
    expect(result.success && result.data.change).toBe("");
  });

  it("rejects empty measureId", () => {
    expect(CreateMISchema.safeParse({ ...valid, measureId: "" }).success).toBe(false);
  });

  it("rejects empty metric", () => {
    expect(CreateMISchema.safeParse({ ...valid, metric: "" }).success).toBe(false);
  });

  it("rejects invalid ragStatus", () => {
    expect(CreateMISchema.safeParse({ ...valid, ragStatus: "ORANGE" }).success).toBe(false);
  });
});

describe("UpdateMISchema", () => {
  it("accepts empty object", () => {
    expect(UpdateMISchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid ragStatus if provided", () => {
    expect(UpdateMISchema.safeParse({ ragStatus: "YELLOW" }).success).toBe(false);
  });

  it("accepts partial valid update", () => {
    expect(UpdateMISchema.safeParse({ current: "80", ragStatus: "WARNING" }).success).toBe(true);
  });
});
