"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";

interface AccordionItem {
  id?: string;
  title: string;
  content: string;
}

interface AccordionContent {
  items: AccordionItem[];
}

interface AccordionSectionProps {
  content: AccordionContent;
  editable: boolean;
  onChange: (data: AccordionContent) => void;
}

export default function AccordionSection({ content, editable, onChange }: AccordionSectionProps) {
  const { items } = content;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const updateItem = (idx: number, patch: Partial<AccordionItem>) => {
    const newItems = items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChange({ items: newItems });
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.id ?? i}
            className="rounded-lg border border-gray-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors",
                isOpen
                  ? "bg-updraft-pale-purple/20 text-updraft-deep"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              {editable ? (
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateItem(i, { title: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent outline-none font-medium"
                />
              ) : (
                <span>{item.title}</span>
              )}
              {isOpen ? (
                <ChevronDown size={16} className="shrink-0 text-gray-400" />
              ) : (
                <ChevronRight size={16} className="shrink-0 text-gray-400" />
              )}
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-3">
                {editable ? (
                  <textarea
                    value={item.content.replace(/<[^>]*>/g, "")}
                    onChange={(e) => updateItem(i, { content: `<p>${e.target.value}</p>` })}
                    rows={3}
                    className="w-full resize-none rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-updraft-light-purple"
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.content).html }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
