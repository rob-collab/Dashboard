"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { fileToBase64, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from "@/lib/image-utils";
import { toast } from "sonner";

export default function BrandingSettings() {
  const branding = useAppStore((s) => s.branding);
  const updateBranding = useAppStore((s) => s.updateBranding);
  const siteSettings = useAppStore((s) => s.siteSettings);
  const updateSiteSettings = useAppStore((s) => s.updateSiteSettings);

  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo positioning state — initialise from siteSettings if available
  const [logoX, setLogoX] = useState(siteSettings?.logoX ?? 16);
  const [logoY, setLogoY] = useState(siteSettings?.logoY ?? 16);
  const [logoScale, setLogoScale] = useState(siteSettings?.logoScale ?? 1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync from siteSettings on load
  useEffect(() => {
    if (siteSettings) {
      setLogoX(siteSettings.logoX);
      setLogoY(siteSettings.logoY);
      setLogoScale(siteSettings.logoScale);
      // Also apply logo from DB if local branding doesn't have one
      if (siteSettings.logoBase64 && !branding.logoSrc) {
        updateBranding({ logoSrc: siteSettings.logoBase64 });
      }
    }
  }, [siteSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const dataUrl = await fileToBase64(file);
        updateBranding({ logoSrc: dataUrl });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load image");
      }
    },
    [updateBranding]
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
      e.target.value = "";
    },
    [handleFile]
  );

  // Drag-to-position handlers for logo preview
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - logoX, y: e.clientY - logoY });
    },
    [logoX, logoY]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(200, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(60, e.clientY - dragStart.y));
      setLogoX(newX);
      setLogoY(newY);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  function resetPosition() {
    setLogoX(16);
    setLogoY(16);
    setLogoScale(1.0);
  }

  async function saveBrandingToDb() {
    try {
      const data = {
        logoBase64: branding.logoSrc ?? null,
        logoMarkBase64: branding.dashboardIconSrc ?? null,
        logoX,
        logoY,
        logoScale,
        primaryColour: null as string | null,
        accentColour: null as string | null,
      };
      updateSiteSettings(data);
      toast.success("Branding settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branding");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">Branding & Logo</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload your team logo to display in report headers, footers, and HTML exports.
        </p>
      </div>

      {/* Logo upload */}
      <div className="bento-card space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Team Logo</h3>

        {!branding.logoSrc ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors",
              dragOver
                ? "border-updraft-bright-purple bg-updraft-pale-purple/20"
                : "border-gray-300 bg-gray-50 hover:border-updraft-light-purple hover:bg-updraft-pale-purple/10"
            )}
          >
            <Upload size={28} className={dragOver ? "text-updraft-bright-purple" : "text-gray-400"} />
            <p className="text-sm font-medium text-gray-600">
              {dragOver ? "Drop logo here" : "Drag & drop your logo, or click to browse"}
            </p>
            <p className="text-xs text-gray-400">
              PNG, JPG, GIF, WebP, SVG &bull; Max {MAX_IMAGE_SIZE_MB}MB
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <img
                src={branding.logoSrc}
                alt={branding.logoAlt}
                style={{ width: branding.logoWidth, maxHeight: 120, objectFit: "contain" }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ImageIcon size={14} /> Replace Logo
              </button>
              <button
                type="button"
                onClick={() => updateBranding({ logoSrc: null })}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <X size={14} /> Remove
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {/* Logo Position Preview */}
      {branding.logoSrc && (
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Logo Position & Scale</h3>
            <button
              type="button"
              onClick={resetPosition}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Preview panel — simulates sidebar header */}
          <div
            ref={previewRef}
            className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple"
            style={{ height: 100 }}
          >
            <p className="absolute top-2 right-3 text-[9px] text-white/50 font-medium uppercase tracking-wider">
              Preview — drag logo to reposition
            </p>
            {branding.logoSrc && (
              <img
                src={branding.logoSrc}
                alt={branding.logoAlt}
                onMouseDown={handleMouseDown}
                className={cn(
                  "absolute select-none",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
                style={{
                  left: logoX,
                  top: logoY,
                  transform: `scale(${logoScale})`,
                  transformOrigin: "top left",
                  maxHeight: 60,
                  maxWidth: 180,
                }}
                draggable={false}
              />
            )}
          </div>

          {/* Scale slider */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Scale: {(logoScale * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={logoScale}
              onChange={(e) => setLogoScale(Number(e.target.value))}
              className="w-full accent-updraft-bright-purple"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>30%</span>
              <span>250%</span>
            </div>
          </div>

          {/* Position display */}
          <div className="flex gap-4 text-xs text-gray-500">
            <span>X: {logoX}px</span>
            <span>Y: {logoY}px</span>
          </div>
        </div>
      )}

      {/* Logo settings */}
      <div className="bento-card space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Logo Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
            <input
              type="text"
              value={branding.companyName}
              onChange={(e) => updateBranding({ companyName: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Logo Alt Text</label>
            <input
              type="text"
              value={branding.logoAlt}
              onChange={(e) => updateBranding({ logoAlt: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple/50 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Logo Width: {branding.logoWidth}px
          </label>
          <input
            type="range"
            min={40}
            max={300}
            step={5}
            value={branding.logoWidth}
            onChange={(e) => updateBranding({ logoWidth: Number(e.target.value) })}
            className="w-full accent-updraft-bright-purple"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>40px</span>
            <span>300px</span>
          </div>
        </div>
      </div>

      {/* Display toggles */}
      <div className="bento-card space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Display Options</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={branding.showInHeader}
            onChange={(e) => updateBranding({ showInHeader: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-light-purple"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Show in Report Header</span>
            <p className="text-xs text-gray-500">Display the logo above the report title</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={branding.showInFooter}
            onChange={(e) => updateBranding({ showInFooter: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-light-purple"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Show in Report Footer</span>
            <p className="text-xs text-gray-500">Display the logo in the report footer area</p>
          </div>
        </label>
      </div>

      {/* Dashboard Icon */}
      <div className="bento-card space-y-3">
        <label className="block text-sm font-semibold text-gray-800">
          Dashboard Welcome Icon
        </label>
        <p className="text-xs text-gray-500">
          Upload an icon to display on the dashboard welcome section (recommended: 100x100px, transparent PNG)
        </p>

        {branding.dashboardIconSrc ? (
          <div className="relative inline-block">
            <img
              src={branding.dashboardIconSrc}
              alt={branding.dashboardIconAlt}
              className="h-20 w-20 object-contain rounded-lg border border-gray-200 bg-white p-2"
            />
            <button
              onClick={() => updateBranding({ dashboardIconSrc: null })}
              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                try {
                  const dataUrl = await fileToBase64(file);
                  updateBranding({ dashboardIconSrc: dataUrl });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to load image");
                }
              }
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = ACCEPTED_IMAGE_TYPES.join(',');
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const dataUrl = await fileToBase64(file);
                    updateBranding({ dashboardIconSrc: dataUrl });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to load image");
                  }
                }
              };
              input.click();
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",
              dragOver
                ? "border-updraft-bright-purple bg-updraft-pale-purple/20"
                : "border-gray-300 hover:border-updraft-light-purple hover:bg-gray-50"
            )}
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Drop icon here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 5MB</p>
          </div>
        )}
      </div>

      {/* Save to Database button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveBrandingToDb}
          className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-5 py-2.5 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <Save size={16} /> Save Branding Settings
        </button>
      </div>
    </div>
  );
}
