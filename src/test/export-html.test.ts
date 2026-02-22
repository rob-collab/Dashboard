import { describe, it, expect } from "vitest";
import { generateHTMLExport } from "@/lib/export-html";
import type {
  Report,
  Section,
  ConsumerDutyOutcome,
  BrandingConfig,
  ReportVersion,
} from "@/lib/types";

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeReport(overrides: { id?: string; title?: string; period?: string } = {}) {
  return {
    id: overrides.id ?? "r-1",
    title: overrides.title ?? "Test Report",
    period: overrides.period ?? "Q1 2025",
  } as unknown as Report;
}

function makeSection(
  type: string,
  content: Record<string, unknown> = {},
  overrides: {
    title?: string;
    position?: number;
    styleConfig?: Record<string, unknown> | null;
  } = {}
) {
  return {
    id: `s-${type}`,
    type,
    title: overrides.title !== undefined ? overrides.title : "Section Title",
    position: overrides.position ?? 1,
    content,
    styleConfig: overrides.styleConfig ?? null,
  } as unknown as Section;
}

function makeOutcome(overrides: {
  id?: string;
  outcomeId?: string;
  name?: string;
  shortDesc?: string;
  ragStatus?: string;
  position?: number;
  measures?: unknown[];
} = {}) {
  return {
    id: overrides.id ?? "o-1",
    outcomeId: overrides.outcomeId ?? "OUT-1",
    name: overrides.name ?? "Test Outcome",
    shortDesc: overrides.shortDesc ?? "Short description",
    ragStatus: overrides.ragStatus ?? "GOOD",
    position: overrides.position ?? 1,
    measures: overrides.measures ?? [],
  } as unknown as ConsumerDutyOutcome;
}

function makeMeasure(overrides: {
  id?: string;
  measureId?: string;
  name?: string;
  summary?: string;
  ragStatus?: string;
  lastUpdatedAt?: string | null;
} = {}) {
  return {
    id: overrides.id ?? "m-1",
    measureId: overrides.measureId ?? "M-001",
    name: overrides.name ?? "Test Measure",
    summary: overrides.summary ?? "Measure summary",
    ragStatus: overrides.ragStatus ?? "GOOD",
    lastUpdatedAt: overrides.lastUpdatedAt !== undefined ? overrides.lastUpdatedAt : null,
  };
}

function makeVersion(reportId: string, publishedAt: string) {
  return { id: "v-1", reportId, publishedAt } as unknown as ReportVersion;
}

// Matches the private ExportOptions shape for type-safe option passing in tests
type ExportOpts = {
  includeInteractive?: boolean;
  embedImages?: boolean;
  minify?: boolean;
  watermark?: string;
  includeMetadata?: boolean;
};

const BASE = makeReport();

/** Shorthand wrapper for the most common test scenarios. */
function gen(
  sections: Section[] = [],
  outcomes: ConsumerDutyOutcome[] = [],
  options: ExportOpts = {},
  branding?: BrandingConfig,
  versions?: ReportVersion[]
) {
  return generateHTMLExport(BASE, sections, outcomes, options, branding, versions);
}

// ── Document structure ────────────────────────────────────────────────────────

describe("generateHTMLExport — document structure", () => {
  it("starts with <!DOCTYPE html>", () => {
    expect(gen()).toMatch(/^<!DOCTYPE html>/);
  });

  it("contains <html lang=\"en\">", () => {
    expect(gen()).toContain('<html lang="en">');
  });

  it("includes the report title and period in the <title> tag", () => {
    expect(gen()).toContain("<title>Test Report - Q1 2025</title>");
  });

  it("includes the report title in the <h1> tag", () => {
    expect(gen()).toContain("<h1>Test Report</h1>");
  });

  it("closes with </html>", () => {
    expect(gen()).toMatch(/<\/html>\s*$/);
  });
});

// ── HTML escaping (escapeHtml via public surface) ─────────────────────────────

describe("generateHTMLExport — HTML escaping", () => {
  it("escapes & in the report title", () => {
    const report = makeReport({ title: "A & B" });
    const html = generateHTMLExport(report, [], [], {});
    expect(html).toContain("A &amp; B");
    expect(html).not.toContain("A & B");
  });

  it("escapes < and > in the report title", () => {
    const report = makeReport({ title: "<script>" });
    // Disable the interactive script block so the only possible <script> would be an unescaped title
    const html = generateHTMLExport(report, [], [], { includeInteractive: false });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("escapes \" in the report title", () => {
    const report = makeReport({ title: 'Say "hello"' });
    const html = generateHTMLExport(report, [], [], {});
    expect(html).toContain("Say &quot;hello&quot;");
  });

  it("escapes ' in the report title", () => {
    const report = makeReport({ title: "O'Brien" });
    const html = generateHTMLExport(report, [], [], {});
    expect(html).toContain("O&#039;Brien");
  });

  it("escapes special characters in section titles", () => {
    const section = makeSection("TEXT_BLOCK", { html: "" }, { title: "<b>Bold</b>" });
    expect(gen([section])).toContain("&lt;b&gt;Bold&lt;/b&gt;");
  });
});

// ── Export options ────────────────────────────────────────────────────────────

describe("generateHTMLExport — options", () => {
  it("includes metadata HTML comments by default", () => {
    expect(gen()).toContain("<!-- CCRO Report Export Metadata -->");
  });

  it("omits metadata comments when includeMetadata is false", () => {
    expect(gen([], [], { includeMetadata: false })).not.toContain(
      "<!-- CCRO Report Export Metadata -->"
    );
  });

  it("renders a watermark div when a watermark string is provided", () => {
    const html = gen([], [], { watermark: "DRAFT" });
    expect(html).toContain('class="watermark"');
    expect(html).toContain("DRAFT");
  });

  it("does not render a watermark div when no watermark is set", () => {
    expect(gen()).not.toContain('class="watermark"');
  });

  it("includes the interactive <script> block by default", () => {
    expect(gen()).toContain("<script>");
  });

  it("omits the interactive script when includeInteractive is false", () => {
    expect(gen([], [], { includeInteractive: false })).not.toContain("<script>");
  });

  it("removes all newlines when minify is true", () => {
    expect(gen([], [], { minify: true })).not.toContain("\n");
  });

  it("preserves newlines when minify is false (default)", () => {
    expect(gen()).toContain("\n");
  });
});

// ── Branding ──────────────────────────────────────────────────────────────────

describe("generateHTMLExport — branding", () => {
  const branding = {
    logoSrc: "data:image/png;base64,abc",
    logoAlt: "Acme Logo",
    logoWidth: 120,
    showInHeader: true,
    showInFooter: true,
    companyName: "Acme Corp",
  } as unknown as BrandingConfig;

  it("includes the logo div in the header when showInHeader is true", () => {
    const html = gen([], [], {}, branding);
    expect(html).toContain('<div class="header-logo">');
    expect(html).toContain(branding.logoSrc);
  });

  it("omits the header logo div when showInHeader is false", () => {
    const b = { ...branding, showInHeader: false } as unknown as BrandingConfig;
    // The CSS always includes ".header-logo {}" — check for the HTML element, not the class name
    expect(gen([], [], {}, b)).not.toContain('<div class="header-logo">');
  });

  it("renders the company name in the footer", () => {
    expect(gen([], [], {}, branding)).toContain("Acme Corp");
  });

  it("includes the footer logo div when showInFooter is true", () => {
    expect(gen([], [], {}, branding)).toContain('<div class="footer-logo">');
  });
});

// ── Section filtering and sorting ─────────────────────────────────────────────

describe("generateHTMLExport — section filtering and sorting", () => {
  it("filters out CONSUMER_DUTY_DASHBOARD sections entirely", () => {
    const s = makeSection("CONSUMER_DUTY_DASHBOARD", {}, { title: "Should Not Appear" });
    expect(gen([s])).not.toContain("Should Not Appear");
  });

  it("sorts sections by position (lower position renders first)", () => {
    const first = makeSection("TEXT_BLOCK", { html: "FIRST" }, { title: "A", position: 1 });
    const second = makeSection("TEXT_BLOCK", { html: "SECOND" }, { title: "B", position: 2 });
    // Pass in reverse order — the sort should still put FIRST before SECOND
    const html = gen([second, first]);
    expect(html.indexOf("FIRST")).toBeLessThan(html.indexOf("SECOND"));
  });
});

// ── TEXT_BLOCK section ────────────────────────────────────────────────────────

describe("generateHTMLExport — TEXT_BLOCK", () => {
  it("renders the section title in an <h2> tag", () => {
    const s = makeSection("TEXT_BLOCK", { html: "<p>body</p>" }, { title: "My Section" });
    expect(gen([s])).toContain("<h2>My Section</h2>");
  });

  it("renders raw HTML content inside a text-content div", () => {
    const s = makeSection("TEXT_BLOCK", { html: "<p>Hello</p>" });
    expect(gen([s])).toContain('<div class="text-content"><p>Hello</p></div>');
  });

  it("omits the <h2> tag when the section title is an empty string", () => {
    const s = makeSection("TEXT_BLOCK", { html: "" }, { title: "" });
    expect(gen([s])).not.toContain("<h2></h2>");
  });
});

// ── DATA_TABLE section ────────────────────────────────────────────────────────

describe("generateHTMLExport — DATA_TABLE", () => {
  it("renders a table with escaped headers and rows", () => {
    const s = makeSection("DATA_TABLE", {
      headers: ["Name", "Value"],
      rows: [["Alice", "42"]],
    });
    const html = gen([s]);
    expect(html).toContain('<table class="data-table">');
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>Alice</td>");
  });

  it("escapes HTML in table cell content", () => {
    const s = makeSection("DATA_TABLE", {
      headers: ["Col"],
      rows: [["<b>bold</b>"]],
    });
    expect(gen([s])).toContain("<td>&lt;b&gt;bold&lt;/b&gt;</td>");
  });
});

// ── CARD_GRID section ─────────────────────────────────────────────────────────

describe("generateHTMLExport — CARD_GRID", () => {
  it("renders a card-grid with card value and title", () => {
    const s = makeSection("CARD_GRID", {
      cards: [{ title: "Score", value: "95%" }],
    });
    const html = gen([s]);
    expect(html).toContain('<div class="card-grid">');
    expect(html).toContain('<div class="card-value">95%</div>');
    expect(html).toContain('<div class="card-title">Score</div>');
  });

  it("renders the subtitle when present", () => {
    const s = makeSection("CARD_GRID", {
      cards: [{ title: "Score", value: "95%", subtitle: "Excellent" }],
    });
    expect(gen([s])).toContain('<div class="card-subtitle">Excellent</div>');
  });

  it("omits the subtitle div when not provided", () => {
    const s = makeSection("CARD_GRID", {
      cards: [{ title: "Score", value: "95%" }],
    });
    expect(gen([s])).not.toContain('class="card-subtitle"');
  });

  it("renders the card icon when present", () => {
    const s = makeSection("CARD_GRID", {
      cards: [{ title: "Score", value: "10", icon: "⭐" }],
    });
    expect(gen([s])).toContain('<div class="card-icon">⭐</div>');
  });
});

// ── ACCORDION section ─────────────────────────────────────────────────────────

describe("generateHTMLExport — ACCORDION", () => {
  it("renders accordion items with summaries inside a .accordion container", () => {
    const s = makeSection("ACCORDION", {
      items: [
        { title: "Item 1", content: "<p>Content 1</p>" },
        { title: "Item 2", content: "<p>Content 2</p>" },
      ],
    });
    const html = gen([s]);
    expect(html).toContain('<div class="accordion">');
    expect(html).toContain("<summary>Item 1</summary>");
    expect(html).toContain("<summary>Item 2</summary>");
  });

  it("marks only the first accordion item as open", () => {
    const s = makeSection("ACCORDION", {
      items: [
        { title: "First", content: "A" },
        { title: "Second", content: "B" },
      ],
    });
    const html = gen([s]);
    expect(html).toContain('<details class="accordion-item" open>');
    // Subsequent items have an empty string in place of "open", leaving a trailing space
    expect(html).toContain('<details class="accordion-item" >');
  });
});

// ── IMAGE_BLOCK section ───────────────────────────────────────────────────────

describe("generateHTMLExport — IMAGE_BLOCK", () => {
  it("renders an <img> with src and escaped alt when src is present", () => {
    const s = makeSection("IMAGE_BLOCK", {
      src: "data:image/png;base64,abc",
      alt: "A <photo>",
    });
    const html = gen([s]);
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(html).toContain('alt="A &lt;photo&gt;"');
  });

  it("renders an escaped caption in a <figcaption> when provided", () => {
    const s = makeSection("IMAGE_BLOCK", {
      src: "data:image/png;base64,abc",
      alt: "photo",
      caption: "Figure <1>",
    });
    expect(gen([s])).toContain("Figure &lt;1&gt;");
  });

  it("renders an image-placeholder div when src is empty", () => {
    const s = makeSection("IMAGE_BLOCK", { src: "" });
    const html = gen([s]);
    expect(html).toContain('class="image-placeholder"');
    expect(html).toContain("No image");
  });

  it("omits the figcaption when no caption is provided", () => {
    const s = makeSection("IMAGE_BLOCK", { src: "data:image/png;base64,abc", alt: "photo" });
    expect(gen([s])).not.toContain("figcaption");
  });
});

// ── IMPORTED_COMPONENT section ────────────────────────────────────────────────

describe("generateHTMLExport — IMPORTED_COMPONENT", () => {
  it("renders raw HTML content without escaping", () => {
    const s = makeSection("IMPORTED_COMPONENT", { html: "<div class='custom'>hello</div>" });
    expect(gen([s])).toContain("<div class='custom'>hello</div>");
  });
});

// ── Default / unknown section type ────────────────────────────────────────────

describe("generateHTMLExport — default section type", () => {
  it("renders the content as a JSON string for an unrecognised section type", () => {
    const content = { key: "value", num: 42 };
    const s = makeSection("UNKNOWN_TYPE", content);
    expect(gen([s])).toContain(JSON.stringify(content));
  });
});

// ── buildSectionStyle ─────────────────────────────────────────────────────────

describe("generateHTMLExport — buildSectionStyle", () => {
  it("applies backgroundColor to the section style attribute", () => {
    const s = makeSection(
      "TEXT_BLOCK",
      { html: "" },
      { styleConfig: { backgroundColor: "#ff0000" } }
    );
    expect(gen([s])).toContain("background-color:#ff0000");
  });

  it("applies border when borderWidth and borderStyle are set", () => {
    const s = makeSection(
      "TEXT_BLOCK",
      { html: "" },
      { styleConfig: { borderWidth: 2, borderStyle: "solid", borderColor: "#000000" } }
    );
    expect(gen([s])).toContain("border:2px solid #000000");
  });

  it("applies padding from the styleConfig padding object", () => {
    const s = makeSection(
      "TEXT_BLOCK",
      { html: "" },
      { styleConfig: { padding: { top: 10, right: 20, bottom: 10, left: 20 } } }
    );
    expect(gen([s])).toContain("padding:10px 20px 10px 20px");
  });
});

// ── Consumer Duty Dashboard ───────────────────────────────────────────────────

describe("generateHTMLExport — Consumer Duty Dashboard", () => {
  it("renders the consumer-duty-section when outcomes are provided", () => {
    expect(gen([], [makeOutcome()])).toContain('class="consumer-duty-section"');
  });

  it("does not render the consumer-duty-section when outcomes is empty", () => {
    expect(gen()).not.toContain('class="consumer-duty-section"');
  });

  it("lowercases the RAG status in the outcome card CSS class", () => {
    expect(gen([], [makeOutcome({ ragStatus: "WARNING" })])).toContain("rag-warning");
    expect(gen([], [makeOutcome({ ragStatus: "HARM" })])).toContain("rag-harm");
  });

  it("sorts outcomes by position (lower position renders first)", () => {
    const first = makeOutcome({ name: "FIRST_OUT", position: 1 });
    const second = makeOutcome({ id: "o-2", outcomeId: "OUT-2", name: "SECOND_OUT", position: 2 });
    const html = gen([], [second, first]); // reversed input
    expect(html.indexOf("FIRST_OUT")).toBeLessThan(html.indexOf("SECOND_OUT"));
  });

  it("shows a Stale badge for a measure updated before the last publish date", () => {
    const measure = makeMeasure({ lastUpdatedAt: "2025-01-01T00:00:00Z" });
    const outcome = makeOutcome({ measures: [measure] });
    const versions = [makeVersion("r-1", "2025-06-01T00:00:00Z")];
    const html = gen([], [outcome], {}, undefined, versions);
    expect(html).toContain("Stale");
  });

  it("does not show a Stale badge for a measure updated after the last publish date", () => {
    const measure = makeMeasure({ lastUpdatedAt: "2025-08-01T00:00:00Z" });
    const outcome = makeOutcome({ measures: [measure] });
    const versions = [makeVersion("r-1", "2025-06-01T00:00:00Z")];
    const html = gen([], [outcome], {}, undefined, versions);
    expect(html).not.toContain("Stale");
  });

  it("shows a 'Not Updated' badge on a stale individual measure card", () => {
    const measure = makeMeasure({ lastUpdatedAt: "2025-01-01T00:00:00Z" });
    const outcome = makeOutcome({ measures: [measure] });
    const versions = [makeVersion("r-1", "2025-06-01T00:00:00Z")];
    expect(gen([], [outcome], {}, undefined, versions)).toContain("Not Updated");
  });
});
