"use client";

import { Calendar } from "lucide-react";
import RegulatoryCalendarWidget from "@/components/or/RegulatoryCalendarWidget";
import { usePageTitle } from "@/lib/usePageTitle";

export default function RegulatoryCalendarPage() {
  usePageTitle("Regulatory Calendar");
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
          <Calendar className="h-6 w-6 text-updraft-bright-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Regulatory Calendar</h1>
          <p className="text-sm text-fca-gray mt-0.5">Upcoming FCA deadlines, submissions and review dates</p>
        </div>
      </div>
      <RegulatoryCalendarWidget />
    </div>
  );
}
