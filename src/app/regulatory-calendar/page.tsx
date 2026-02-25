"use client";

import RegulatoryCalendarWidget from "@/components/or/RegulatoryCalendarWidget";
import { usePageTitle } from "@/lib/usePageTitle";

export default function RegulatoryCalendarPage() {
  usePageTitle("Regulatory Calendar");
  return (
    <div className="p-6">
      <RegulatoryCalendarWidget />
    </div>
  );
}
