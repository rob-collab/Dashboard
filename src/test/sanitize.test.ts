import { describe, it, expect } from "vitest";
import { sanitizeHTML, scopeCSS } from "@/lib/sanitize";

// ── sanitizeHTML ──────────────────────────────────────────────────────────────

describe("sanitizeHTML", () => {
  // ── Safe content ────────────────────────────────────────────────────────────

  it("passes clean HTML through unchanged", () => {
    const { html, safe, blocked } = sanitizeHTML("<p>Hello <strong>world</strong></p>");
    expect(html).toContain("Hello");
    expect(html).toContain("strong");
    expect(safe).toBe(true);
    expect(blocked).toHaveLength(0);
  });

  it("preserves allowed structural tags", () => {
    const input = "<div><h1>Title</h1><p>Body</p><ul><li>Item</li></ul></div>";
    const { html, safe } = sanitizeHTML(input);
    expect(html).toContain("<h1>");
    expect(html).toContain("<p>");
    expect(html).toContain("<li>");
    expect(safe).toBe(true);
  });

  it("preserves allowed table tags", () => {
    const input = "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    const { html, safe } = sanitizeHTML(input);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
    expect(html).toContain("<td>");
    expect(safe).toBe(true);
  });

  it("preserves allowed inline formatting", () => {
    const input = "<p><strong>bold</strong> <em>italic</em> <u>underline</u></p>";
    const { html, safe } = sanitizeHTML(input);
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(safe).toBe(true);
  });

  it("preserves class and style attributes", () => {
    const input = '<p class="my-class" style="color:red">Styled</p>';
    const { html } = sanitizeHTML(input);
    expect(html).toContain('class="my-class"');
    expect(html).toContain("color");
  });

  it("returns safe:true and empty blocked/warnings for benign input", () => {
    const { safe, blocked, warnings } = sanitizeHTML("<p>Safe content</p>");
    expect(safe).toBe(true);
    expect(blocked).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  // ── Forbidden tags removed ───────────────────────────────────────────────────

  it("removes <script> tags", () => {
    const { html } = sanitizeHTML('<p>Hi</p><script>alert("xss")</script>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("removes <iframe> element content", () => {
    const { html } = sanitizeHTML('<iframe src="https://evil.com"></iframe>');
    expect(html).not.toContain("<iframe");
  });

  it("removes <form> element content", () => {
    const { html } = sanitizeHTML('<form action="/steal"><input name="pw"></form>');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });

  it("removes <object> and <embed> tags", () => {
    const { html } = sanitizeHTML('<object data="evil.swf"></object><embed src="evil.swf">');
    expect(html).not.toContain("<object");
    expect(html).not.toContain("<embed");
  });

  // ── Forbidden attributes stripped ────────────────────────────────────────────

  it("strips event handler attributes", () => {
    const { html } = sanitizeHTML('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips onclick attribute", () => {
    const { html } = sanitizeHTML('<p onclick="steal()">Click me</p>');
    expect(html).not.toContain("onclick");
    expect(html).toContain("Click me"); // content preserved
  });

  it("strips onload, onmouseover, onfocus, onblur", () => {
    const input = '<img src="x" onload="x()" onmouseover="y()" onfocus="z()" onblur="w()">';
    const { html } = sanitizeHTML(input);
    expect(html).not.toContain("onload");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("onfocus");
    expect(html).not.toContain("onblur");
  });

  // ── Dangerous pattern detection ──────────────────────────────────────────────

  it("detects eval() and marks unsafe", () => {
    const { blocked, safe } = sanitizeHTML("<script>eval('xss')</script>");
    expect(blocked.some((b) => b.includes("eval()"))).toBe(true);
    expect(safe).toBe(false);
  });

  it("detects eval() with whitespace variants", () => {
    const { blocked } = sanitizeHTML("eval  (document.cookie)");
    expect(blocked.some((b) => b.includes("eval()"))).toBe(true);
  });

  it("detects Function() constructor", () => {
    const { blocked, safe } = sanitizeHTML("Function('alert(1)')()");
    expect(blocked.some((b) => b.includes("Function()"))).toBe(true);
    expect(safe).toBe(false);
  });

  it("detects innerHTML assignment", () => {
    const { blocked, safe } = sanitizeHTML("el.innerHTML = '<img onerror=x>'");
    expect(blocked.some((b) => b.includes("innerHTML"))).toBe(true);
    expect(safe).toBe(false);
  });

  it("detects <iframe> element and marks unsafe", () => {
    const { blocked, safe } = sanitizeHTML('<iframe src="x"></iframe>');
    expect(blocked.some((b) => b.includes("<iframe>"))).toBe(true);
    expect(safe).toBe(false);
  });

  it("detects <form> element and marks unsafe", () => {
    const { blocked, safe } = sanitizeHTML('<form><input></form>');
    expect(blocked.some((b) => b.includes("<form>"))).toBe(true);
    expect(safe).toBe(false);
  });

  it("detects external script src and adds warning", () => {
    const { warnings } = sanitizeHTML('<script src="https://evil.com/x.js"></script>');
    expect(warnings.some((w) => w.includes("External script blocked"))).toBe(true);
  });

  it("can accumulate multiple blocked entries", () => {
    const { blocked } = sanitizeHTML('<iframe></iframe><form></form>eval("x")');
    expect(blocked.length).toBeGreaterThan(1);
  });

  it("returns correct safe flag based on blocked array", () => {
    const withBlocked = sanitizeHTML("eval(1)");
    expect(withBlocked.safe).toBe(withBlocked.blocked.length === 0);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("handles empty string", () => {
    const { html, safe, blocked, warnings } = sanitizeHTML("");
    expect(html).toBe("");
    expect(safe).toBe(true);
    expect(blocked).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("handles plain text (no tags)", () => {
    const { html, safe } = sanitizeHTML("Just plain text with no HTML");
    expect(html).toContain("Just plain text");
    expect(safe).toBe(true);
  });

  it("handles deeply nested allowed tags", () => {
    const input = "<div><section><article><p><strong>deep</strong></p></article></section></div>";
    const { html, safe } = sanitizeHTML(input);
    expect(html).toContain("deep");
    expect(safe).toBe(true);
  });
});

// ── scopeCSS ─────────────────────────────────────────────────────────────────

describe("scopeCSS", () => {
  it("prefixes plain element selectors", () => {
    const result = scopeCSS("p { color: red; }", "scope-123");
    // The regex trims the selector then appends the suffix (which includes no space),
    // so output is "#scope-123 p{" not "#scope-123 p {"
    expect(result).toContain("#scope-123 p");
    expect(result).not.toContain("scope-123 p}"); // sanity: not mangled
    expect(result).toContain("color: red");
  });

  it("prefixes class selectors", () => {
    const result = scopeCSS(".my-class { font-size: 14px; }", "scope-123");
    expect(result).toContain("#scope-123 .my-class");
    expect(result).toContain("font-size");
  });

  it("prefixes ID selectors", () => {
    const result = scopeCSS("#header { margin: 0; }", "scope-123");
    expect(result).toContain("#scope-123 #header");
    expect(result).toContain("margin");
  });

  it("does not prefix @media queries", () => {
    const css = "@media (max-width: 768px) { p { display: none; } }";
    const result = scopeCSS(css, "scope-123");
    expect(result).toContain("@media (max-width: 768px)");
    // The @media rule itself should not be prefixed
    expect(result).not.toMatch(/#scope-123 @media/);
  });

  it("does not prefix @keyframes rules", () => {
    const css = "@keyframes fade { from { opacity: 0; } to { opacity: 1; } }";
    const result = scopeCSS(css, "scope-123");
    expect(result).toContain("@keyframes fade");
    expect(result).not.toMatch(/#scope-123 @keyframes/);
  });

  it("does not prefix 'from' and 'to' keyframe stops", () => {
    const css = "@keyframes slide { from { left: 0; } to { left: 100px; } }";
    const result = scopeCSS(css, "scope-123");
    // from/to should remain unscoped
    expect(result).toContain("from {");
    expect(result).toContain("to {");
  });

  it("does not prefix percentage keyframe stops", () => {
    const css = "@keyframes grow { 0% { width: 0; } 50% { width: 50%; } 100% { width: 100%; } }";
    const result = scopeCSS(css, "scope-123");
    expect(result).toContain("0% {");
    expect(result).toContain("50% {");
    expect(result).toContain("100% {");
  });

  it("handles multiple rules", () => {
    const css = "h1 { color: blue; } p { margin: 0; }";
    const result = scopeCSS(css, "scope-abc");
    expect(result).toContain("#scope-abc h1");
    expect(result).toContain("#scope-abc p");
    expect(result).toContain("color: blue");
    expect(result).toContain("margin: 0");
  });

  it("handles empty CSS", () => {
    const result = scopeCSS("", "scope-123");
    expect(result).toBe("");
  });

  it("uses the provided scopeId in the prefix", () => {
    const result = scopeCSS("p { color: red; }", "my-custom-id");
    expect(result).toContain("#my-custom-id p");
  });
});
