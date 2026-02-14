"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pencil,
  Copy,
  Trash2,
  MoreVertical,
  Globe,
  User,
  LayoutTemplate,
} from "lucide-react";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: Template;
  onUse: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDuplicate: (template: Template) => void;
  onDelete: (template: Template) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "consumer-duty": "bg-purple-100 text-purple-700",
  metrics: "bg-blue-100 text-blue-700",
  narrative: "bg-emerald-100 text-emerald-700",
  data: "bg-amber-100 text-amber-700",
  general: "bg-gray-100 text-gray-600",
};

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.general;
}

export default function TemplateCard({
  template,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-bento transition-all duration-200",
        "hover:shadow-bento-hover hover:-translate-y-0.5 hover:border-updraft-light-purple"
      )}
    >
      {/* Thumbnail placeholder */}
      <div className="relative h-36 rounded-t-xl bg-gradient-to-br from-updraft-bar via-updraft-bright-purple to-updraft-medium-purple overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <LayoutTemplate size={64} className="text-white" />
        </div>
        {/* Visibility badge */}
        <div className="absolute top-2 left-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
              template.isGlobal
                ? "bg-white/20 text-white"
                : "bg-black/20 text-white"
            )}
          >
            {template.isGlobal ? <Globe size={10} /> : <User size={10} />}
            {template.isGlobal ? "Global" : "Personal"}
          </span>
        </div>
        {/* Actions menu */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-black/20 text-white backdrop-blur-sm hover:bg-black/40 transition-colors"
            aria-label="Template actions"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg animate-fade-in z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    onUse(template);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Play size={14} className="text-updraft-bar" />
                  Use Template
                </button>
                <button
                  onClick={() => {
                    onEdit(template);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={14} className="text-gray-500" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDuplicate(template);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy size={14} className="text-gray-500" />
                  Duplicate
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => {
                    onDelete(template);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-risk-red hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category badge */}
        <div className="mb-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              categoryColor(template.category)
            )}
          >
            {template.category}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 font-poppins line-clamp-1">
          {template.name}
        </h3>

        {/* Description */}
        <p className="mt-1 text-xs text-gray-500 line-clamp-2 flex-1">
          {template.description || "No description"}
        </p>

        {/* Footer: Creator + date */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-[11px] text-gray-400 truncate max-w-[60%]">
            {template.creator?.name ?? "Unknown"}
          </span>
          <span className="text-[11px] text-gray-400">
            v{template.version}
          </span>
        </div>
      </div>

      {/* Quick use button on hover */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={() => onUse(template)}
          className="flex w-full items-center justify-center gap-2 rounded-b-xl bg-updraft-bar py-2.5 text-xs font-semibold text-white hover:bg-updraft-bright-purple transition-colors"
        >
          <Play size={14} />
          Use Template
        </button>
      </div>
    </div>
  );
}
