"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

// Segment label overrides — maps URL segment to human-readable label
const SEGMENT_LABELS: Record<string, string> = {
  "risk-register": "Risk Register",
  "risk-acceptances": "Risk Acceptances",
  "consumer-duty": "Consumer Duty",
  compliance: "Compliance",
  controls: "Controls",
  actions: "Actions",
  audit: "Audit Trail",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
  templates: "Templates",
  "components-lib": "Component Library",
  new: "New Report",
  edit: "Edit Report",
};

function labelForSegment(segment: string, index: number, segments: string[]): string {
  // Dynamic ID segments after "reports" — give friendly labels
  if (index > 0 && segments[index - 1] === "reports" && segment !== "new") {
    return "View Report";
  }
  return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumb() {
  const pathname = usePathname();

  // Don't render on dashboard or auth pages
  if (pathname === "/" || pathname === "/login" || pathname === "/unauthorised") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];

  // Build crumbs incrementally
  let path = "";
  segments.forEach((segment, i) => {
    path += `/${segment}`;
    const label = labelForSegment(segment, i, segments);
    const isLast = i === segments.length - 1;
    crumbs.push({ label, href: isLast ? undefined : path });
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-400 mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
          {i === 0 && <Home size={11} className="shrink-0" />}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-updraft-bright-purple transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-600 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
