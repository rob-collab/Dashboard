"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Search, Shield, Scale, ListChecks, BarChart3, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

interface TipEntry {
  icon: typeof Shield;
  colour: string;
  text: string;
}

const ROLE_TIPS: Record<string, { heading: string; subheading: string; tips: TipEntry[] }> = {
  CCRO_TEAM: {
    heading: "Welcome to the CCRO Dashboard",
    subheading: "You have full access as a CCRO team member. Here's what to do first.",
    tips: [
      { icon: Shield, colour: "text-red-500", text: "Check the Action Required panel for urgent items needing your attention." },
      { icon: Scale, colour: "text-indigo-500", text: "Review the Compliance Overview for any regulations with gaps or overdue assessments." },
      { icon: BarChart3, colour: "text-updraft-bright-purple", text: "Publish a report using the Reports section to share status with stakeholders." },
      { icon: Search, colour: "text-gray-500", text: "Press ⌘K (or Ctrl+K) at any time to search across all risks, policies, and controls." },
    ],
  },
  OWNER: {
    heading: "Welcome to the CCRO Dashboard",
    subheading: "You are logged in as a Risk Owner. Here's what you can do.",
    tips: [
      { icon: ListChecks, colour: "text-amber-500", text: "Check your Actions — any overdue or high priority items will show here." },
      { icon: Shield, colour: "text-red-500", text: "View the Risk Register to see risks assigned to you and their current status." },
      { icon: BookOpen, colour: "text-blue-500", text: "Review your Consumer Duty measures in the Consumer Duty section." },
      { icon: Search, colour: "text-gray-500", text: "Use ⌘K to quickly find any risk, control, or policy by name or reference." },
    ],
  },
  REVIEWER: {
    heading: "Welcome to the CCRO Dashboard",
    subheading: "You are logged in as a Reviewer. Here's what to focus on.",
    tips: [
      { icon: Scale, colour: "text-indigo-500", text: "Browse the Compliance section to review regulations and policy coverage." },
      { icon: Shield, colour: "text-red-500", text: "View the Risk Register for a summary of organisational risks." },
      { icon: BarChart3, colour: "text-updraft-bright-purple", text: "Reports are available for review and download in the Reports section." },
      { icon: Search, colour: "text-gray-500", text: "Use ⌘K to search across all entities quickly." },
    ],
  },
};

const STORAGE_KEY_PREFIX = "ccro_welcome_dismissed_";

interface WelcomeBannerProps {
  currentUser: User;
}

export default function WelcomeBanner({ currentUser }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${currentUser.id}`;

  useEffect(() => {
    if (!currentUser.id) return;
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setVisible(true);
    }
  }, [currentUser.id, storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const config = ROLE_TIPS[currentUser.role] ?? ROLE_TIPS.REVIEWER;

  return (
    <div className="mb-6 rounded-2xl border border-updraft-pale-purple bg-gradient-to-br from-updraft-pale-purple/30 to-white p-5 shadow-sm relative">
      {/* Dismiss */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 transition-colors"
        aria-label="Dismiss welcome banner"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="mb-4 pr-8">
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">{config.heading}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{config.subheading}</p>
      </div>

      {/* Tips grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {config.tips.map((tip, i) => {
          const Icon = tip.icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-white/70 px-4 py-3 border border-white shadow-sm">
              <Icon size={18} className={cn("mt-0.5 shrink-0", tip.colour)} />
              <p className="text-sm text-gray-700">{tip.text}</p>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-semibold text-white hover:bg-updraft-deep transition-colors"
        >
          Got it <ArrowRight size={14} />
        </button>
        <span className="text-xs text-gray-400">This message will not appear again</span>
      </div>
    </div>
  );
}
