/**
 * Colour utilities for dynamic sidebar theming.
 * Uses WCAG 2.0 relative luminance to determine light/dark backgrounds.
 */

/** Parse a hex colour string to RGB components */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** WCAG 2.0 sRGB relative luminance (0 = black, 1 = white) */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Returns true if the hex colour is dark (luminance < 0.179 — WCAG threshold) */
export function isDarkBackground(hex: string): boolean {
  return relativeLuminance(hex) < 0.179;
}

/** Darken a hex colour by a factor (0–1, where 0 = black) */
function darken(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const d = (c: number) =>
    Math.round(c * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${d(rgb.r)}${d(rgb.g)}${d(rgb.b)}`;
}

/** Generate a vertical gradient from the given hex, darkened at the bottom */
export function sidebarGradient(hex: string): string {
  return `linear-gradient(180deg, ${hex} 0%, ${darken(hex, 0.85)} 100%)`;
}

/** Default sidebar colour (dark purple) */
export const DEFAULT_SIDEBAR_COLOUR = "#1C1B29";
