"use client";

import { cn } from "@/lib/utils";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { sanitizeHTML } from "@/lib/sanitize";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TextBlockProps {
  content: string;
  editable: boolean;
  onChange: (html: string) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TextBlock({ content, editable, onChange }: TextBlockProps) {
  if (editable) {
    return (
      <RichTextEditor
        content={content}
        onChange={onChange}
        placeholder="Type your content here..."
      />
    );
  }

  // View mode: render sanitised HTML
  return (
    <div
      className={cn(
        "prose prose-sm sm:prose max-w-none",
        "prose-headings:text-gray-800 prose-p:text-gray-600",
        "prose-a:text-updraft-bright-purple prose-a:underline",
        "[&_table]:border-collapse [&_table]:w-full",
        "[&_td]:border [&_td]:border-gray-300 [&_td]:p-2",
        "[&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold"
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(content).html }}
    />
  );
}
