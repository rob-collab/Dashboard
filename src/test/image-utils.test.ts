import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
  fileToBase64,
  isValidImageDataUrl,
} from "@/lib/image-utils";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("ACCEPTED_IMAGE_TYPES contains all five expected MIME types", () => {
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/png");
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/jpeg");
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/gif");
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/webp");
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/svg+xml");
    expect(ACCEPTED_IMAGE_TYPES).toHaveLength(5);
  });

  it("MAX_IMAGE_SIZE_MB is 5", () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(5);
  });
});

// ── isValidImageDataUrl ───────────────────────────────────────────────────────

describe("isValidImageDataUrl", () => {
  it("returns true for a valid png data URL", () => {
    expect(isValidImageDataUrl("data:image/png;base64,abc123==")).toBe(true);
  });

  it("returns true for a valid jpeg data URL", () => {
    expect(isValidImageDataUrl("data:image/jpeg;base64,abc123==")).toBe(true);
  });

  it("returns true for a valid gif data URL", () => {
    expect(isValidImageDataUrl("data:image/gif;base64,abc123==")).toBe(true);
  });

  it("returns true for a valid webp data URL", () => {
    expect(isValidImageDataUrl("data:image/webp;base64,abc123==")).toBe(true);
  });

  it("returns true for a valid svg+xml data URL", () => {
    expect(isValidImageDataUrl("data:image/svg+xml;base64,abc123==")).toBe(true);
  });

  it("returns false for an unsupported image subtype (bmp)", () => {
    expect(isValidImageDataUrl("data:image/bmp;base64,abc123==")).toBe(false);
  });

  it("returns false for a non-image MIME type", () => {
    expect(isValidImageDataUrl("data:text/html;base64,abc123==")).toBe(false);
  });

  it("returns false for a plain https URL", () => {
    expect(isValidImageDataUrl("https://example.com/photo.png")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidImageDataUrl("")).toBe(false);
  });

  it("returns false when the base64 marker is absent", () => {
    // Missing ;base64, — just a plain data URI
    expect(isValidImageDataUrl("data:image/png,abc123==")).toBe(false);
  });

  it("is case-sensitive — uppercase PNG subtype is rejected", () => {
    expect(isValidImageDataUrl("data:image/PNG;base64,abc123==")).toBe(false);
  });
});

// ── fileToBase64 ──────────────────────────────────────────────────────────────

describe("fileToBase64", () => {
  afterEach(() => vi.restoreAllMocks());

  // ── rejection paths ──────────────────────────────────────────────────────

  it("rejects with 'Unsupported file type' for a non-image MIME type", async () => {
    const file = new File(["data"], "document.pdf", { type: "application/pdf" });
    await expect(fileToBase64(file)).rejects.toThrow(
      "Unsupported file type: application/pdf"
    );
  });

  it("includes the list of accepted types in the rejection message", async () => {
    const file = new File(["data"], "document.pdf", { type: "application/pdf" });
    await expect(fileToBase64(file)).rejects.toThrow("Accepted:");
  });

  it("rejects when the file exceeds the custom maxSizeMB limit", async () => {
    // 1 KB file; 0.0001 MB ≈ 102 bytes — smaller than 1 KB, so this rejects
    const file = new File(["x".repeat(1024)], "large.png", { type: "image/png" });
    await expect(fileToBase64(file, 0.0001)).rejects.toThrow("File too large");
  });

  it("includes MB size and maximum info in the 'file too large' message", async () => {
    const file = new File(["x".repeat(1024)], "large.png", { type: "image/png" });
    await expect(fileToBase64(file, 0.0001)).rejects.toThrow("Maximum:");
  });

  it("rejects with 'Failed to read file' when the FileReader fires an error event", async () => {
    const mockReader = {
      readAsDataURL: vi.fn().mockImplementation(function(
        this: { onerror: ((e: Event) => void) | null }
      ) {
        this.onerror?.(new ProgressEvent("error"));
      }),
      onload: null as unknown,
      onerror: null as unknown,
      result: null,
    };

    // Use Object.defineProperty so we can replace the constructor even if it's non-writable,
    // and use a regular function (not an arrow) so Reflect.construct works correctly.
    const original = globalThis.FileReader;
    Object.defineProperty(globalThis, "FileReader", {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      value: function FileReaderMock(..._args: unknown[]) { return mockReader; },
      writable: true,
      configurable: true,
    });

    try {
      const file = new File(["data"], "photo.png", { type: "image/png" });
      await expect(fileToBase64(file)).rejects.toThrow("Failed to read file");
    } finally {
      Object.defineProperty(globalThis, "FileReader", {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  // ── resolution paths ─────────────────────────────────────────────────────

  it("resolves with a data URL string for a valid PNG file", async () => {
    const file = new File(["fake-image-bytes"], "photo.png", { type: "image/png" });
    const result = await fileToBase64(file);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("resolves for every accepted MIME type", async () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      const file = new File(["pixel"], "image", { type });
      await expect(fileToBase64(file)).resolves.toMatch(/^data:/);
    }
  });

  it("passes a file that is smaller than the custom maxSizeMB", async () => {
    const file = new File(["x".repeat(100)], "tiny.png", { type: "image/png" });
    // 100 bytes is well within 10 MB
    await expect(fileToBase64(file, 10)).resolves.toMatch(/^data:/);
  });
});
