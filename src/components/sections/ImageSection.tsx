"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Replace, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileToBase64, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/image-utils";
import type { Section } from "@/lib/types";

interface ImageSectionProps {
  section: Section;
  editable: boolean;
  onUpdate: (content: Record<string, unknown>) => void;
}

const OBJECT_FIT_OPTIONS: { label: string; value: string }[] = [
  { label: "Contain", value: "contain" },
  { label: "Cover", value: "cover" },
  { label: "Fill", value: "fill" },
];

const ALIGNMENT_OPTIONS: { label: string; value: string; icon: React.ReactNode }[] = [
  { label: "Left", value: "left", icon: <AlignLeft size={14} /> },
  { label: "Centre", value: "center", icon: <AlignCenter size={14} /> },
  { label: "Right", value: "right", icon: <AlignRight size={14} /> },
];

export default function ImageSection({ section, editable, onUpdate }: ImageSectionProps) {
  const content = section.content as Record<string, unknown>;
  const src = (content?.src as string) || "";
  const alt = (content?.alt as string) || "";
  const caption = (content?.caption as string) || "";
  const width = (content?.width as number | null) ?? null;
  const alignment = (content?.alignment as string) || "center";
  const objectFit = (content?.objectFit as string) || "contain";

  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToBase64(file);
        onUpdate({ ...content, src: dataUrl, alt: alt || file.name.replace(/\.[^.]+$/, "") });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load image");
      }
    },
    [content, alt, onUpdate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      onUpdate({ ...content, ...patch });
    },
    [content, onUpdate]
  );

  // Alignment CSS for the figure
  const alignClass =
    alignment === "left" ? "mr-auto" : alignment === "right" ? "ml-auto" : "mx-auto";

  // View mode (and edit mode with image loaded)
  if (src && !editable) {
    return (
      <figure className={cn("flex flex-col", alignClass)} style={{ maxWidth: width ? `${width}px` : "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="rounded-lg"
          style={{ width: "100%", objectFit: objectFit as React.CSSProperties["objectFit"] }}
        />
        {caption && (
          <figcaption className="mt-2 text-center text-xs text-gray-500 italic">{caption}</figcaption>
        )}
      </figure>
    );
  }

  // Edit mode
  return (
    <div className="space-y-3">
      {/* Upload zone or preview */}
      {!src ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-12 cursor-pointer transition-colors",
            dragOver
              ? "border-updraft-bright-purple bg-updraft-pale-purple/20"
              : "border-gray-300 bg-gray-50 hover:border-updraft-light-purple hover:bg-updraft-pale-purple/10"
          )}
        >
          <Upload size={32} className={dragOver ? "text-updraft-bright-purple" : "text-gray-400"} />
          <p className="text-sm font-medium text-gray-600">
            {dragOver ? "Drop image here" : "Drag & drop an image, or click to browse"}
          </p>
          <p className="text-xs text-gray-400">
            PNG, JPG, GIF, WebP, SVG &bull; Max {MAX_IMAGE_SIZE_MB}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Image preview */}
          <figure className={cn("relative flex flex-col", alignClass)} style={{ maxWidth: width ? `${width}px` : "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="rounded-lg"
              style={{ width: "100%", objectFit: objectFit as React.CSSProperties["objectFit"] }}
            />
            {/* Overlay controls */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-white/90 p-1.5 text-gray-600 shadow-sm hover:bg-white transition-colors"
                title="Replace image"
              >
                <Replace size={14} />
              </button>
              <button
                type="button"
                onClick={() => update({ src: "", alt: "", caption: "" })}
                className="rounded-md bg-white/90 p-1.5 text-red-500 shadow-sm hover:bg-white transition-colors"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleFileInput}
              className="hidden"
            />
          </figure>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alt Text</label>
              <input
                type="text"
                value={alt}
                onChange={(e) => update({ alt: e.target.value })}
                placeholder="Describe the image"
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => update({ caption: e.target.value })}
                placeholder="Optional caption"
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Alignment */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alignment</label>
              <div className="flex gap-1">
                {ALIGNMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ alignment: opt.value })}
                    className={cn(
                      "flex-1 flex items-center justify-center rounded-md border py-1.5 text-xs transition-colors",
                      alignment === opt.value
                        ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                    title={opt.label}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Width */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Width {width ? `${width}px` : "Auto"}
              </label>
              <input
                type="range"
                min={100}
                max={1200}
                step={10}
                value={width ?? 800}
                onChange={(e) => update({ width: Number(e.target.value) })}
                className="w-full accent-updraft-bright-purple"
              />
            </div>

            {/* Object Fit */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fit</label>
              <div className="flex gap-1">
                {OBJECT_FIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ objectFit: opt.value })}
                    className={cn(
                      "flex-1 rounded-md border py-1.5 text-[10px] transition-colors",
                      objectFit === opt.value
                        ? "border-updraft-bright-purple bg-updraft-pale-purple/30 text-updraft-bright-purple"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
