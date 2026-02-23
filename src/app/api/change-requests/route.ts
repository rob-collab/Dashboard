import { NextRequest } from "next/server";
import { prisma, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { serialiseDates } from "@/lib/serialise";

export interface PendingChange {
  id: string;              // composite key: `${entityType}-${changeId}`
  changeId: string;
  entityType: "action" | "control" | "risk";
  entityId: string;
  entityRef: string;
  entityName: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  rationale: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proposedBy: string;
  proposerName: string;
  proposedAt: string;
  reviewNote: string | null;
  reviewerName: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") ?? "PENDING";
    const status = statusParam === "ALL" ? undefined : (statusParam as "PENDING" | "APPROVED" | "REJECTED");

    const [actionChanges, controlChanges, riskChanges] = await Promise.all([
      prisma.actionChange.findMany({
        where: status ? { status } : {},
        include: {
          proposer: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          action: { select: { id: true, title: true } },
        },
        orderBy: { proposedAt: "desc" },
        take: 200,
      }),
      prisma.controlChange.findMany({
        where: status ? { status } : {},
        include: {
          proposer: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          control: { select: { id: true, controlRef: true, controlName: true } },
        },
        orderBy: { proposedAt: "desc" },
        take: 200,
      }),
      prisma.riskChange.findMany({
        where: status ? { status } : {},
        include: {
          proposer: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          risk: { select: { id: true, reference: true, name: true } },
        },
        orderBy: { proposedAt: "desc" },
        take: 200,
      }),
    ]);

    const results: PendingChange[] = [];

    for (const c of actionChanges) {
      results.push({
        id: `action-${c.id}`,
        changeId: c.id,
        entityType: "action",
        entityId: c.actionId,
        entityRef: "",
        entityName: c.action?.title ?? c.actionId,
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue,
        newValue: c.newValue,
        rationale: null,
        status: c.status as "PENDING" | "APPROVED" | "REJECTED",
        proposedBy: c.proposedBy,
        proposerName: c.proposer?.name ?? c.proposedBy,
        proposedAt: c.proposedAt.toISOString(),
        reviewNote: c.reviewNote,
        reviewerName: c.reviewer?.name ?? null,
      });
    }

    for (const c of controlChanges) {
      results.push({
        id: `control-${c.id}`,
        changeId: c.id,
        entityType: "control",
        entityId: c.controlId,
        entityRef: c.control?.controlRef ?? "",
        entityName: c.control?.controlName ?? c.controlId,
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue,
        newValue: c.newValue,
        rationale: c.rationale,
        status: c.status as "PENDING" | "APPROVED" | "REJECTED",
        proposedBy: c.proposedBy,
        proposerName: c.proposer?.name ?? c.proposedBy,
        proposedAt: c.proposedAt.toISOString(),
        reviewNote: c.reviewNote,
        reviewerName: c.reviewer?.name ?? null,
      });
    }

    for (const c of riskChanges) {
      results.push({
        id: `risk-${c.id}`,
        changeId: c.id,
        entityType: "risk",
        entityId: c.riskId,
        entityRef: c.risk?.reference ?? "",
        entityName: c.risk?.name ?? c.riskId,
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue,
        newValue: c.newValue,
        rationale: null,
        status: c.status as "PENDING" | "APPROVED" | "REJECTED",
        proposedBy: c.proposedBy,
        proposerName: c.proposer?.name ?? c.proposedBy,
        proposedAt: c.proposedAt.toISOString(),
        reviewNote: c.reviewNote,
        reviewerName: c.reviewer?.name ?? null,
      });
    }

    // Sort newest first
    results.sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime());

    return jsonResponse(serialiseDates(results));
  } catch (err) {
    console.error("[GET /api/change-requests]", err);
    return errorResponse("Internal server error", 500);
  }
}
