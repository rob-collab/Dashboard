"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  minRows?: number;
}

/**
 * Textarea that grows vertically to fit its content.
 * Replaces all fixed-height textareas in detail panels.
 * No external dependencies — uses a resize effect on value change.
 */
export function AutoResizeTextarea({ className, value, onChange, minRows = 2, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset then expand to scroll height
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      className={cn("resize-none overflow-hidden", className)}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}
