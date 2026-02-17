"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface StatusIndicator {
  label: string;
  variant: "success" | "warning" | "error" | "info";
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  status?: StatusIndicator;
  currentUser: User;
  onUserSwitch?: (user: User) => void;
  children?: ReactNode;
}

const STATUS_STYLES: Record<StatusIndicator["variant"], string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

const STATUS_DOT_STYLES: Record<StatusIndicator["variant"], string> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};


export default function Header({
  title,
  subtitle,
  description,
  breadcrumbs,
  status,
  currentUser,
  onUserSwitch,
  children,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const storeUsers = useAppStore((s) => s.users);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dropdownOpen]);

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-2 flex items-center gap-1 text-sm text-gray-500"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight size={14} className="text-gray-300" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-updraft-bar transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Main row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Title block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900 font-poppins truncate">
              {title}
            </h1>

            {status && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_STYLES[status.variant]
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    STATUS_DOT_STYLES[status.variant]
                  )}
                />
                {status.label}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-0.5 text-sm font-medium text-updraft-bar">
              {subtitle}
            </p>
          )}

          {description && (
            <p className="mt-1 text-sm text-gray-500 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Right side: Actions + User Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Action buttons slot */}
          {children && (
            <div className="flex items-center gap-2">{children}</div>
          )}

          {/* User Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-updraft-bar text-xs font-semibold text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-medium">
                {currentUser.name}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-gray-400 transition-transform",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg animate-fade-in">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Switch User
                  </p>
                </div>
                <div className="py-1 max-h-72 overflow-y-auto">
                  {storeUsers.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onUserSwitch?.(user);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-updraft-pale-purple/30 text-updraft-deep"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                            isSelected ? "bg-updraft-deep" : "bg-updraft-bar"
                          )}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <Check
                            size={16}
                            className="shrink-0 text-updraft-bright-purple"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
