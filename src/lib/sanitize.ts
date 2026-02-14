import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "section", "article", "header", "footer", "nav", "main", "aside",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "strong", "em", "b", "i", "u", "s", "small", "mark", "sub", "sup",
  "blockquote", "pre", "code", "br", "hr", "img",
  "svg", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse",
  "g", "defs", "use", "symbol", "text", "tspan",
  "figure", "figcaption", "details", "summary", "time", "abbr",
];

const ALLOWED_ATTR = [
  "class", "style", "id", "title", "role", "aria-label", "aria-hidden",
  "data-*", "href", "target", "rel", "src", "alt", "width", "height",
  "viewBox", "d", "fill", "stroke", "stroke-width", "opacity",
  "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2",
  "points", "transform", "xmlns", "preserveAspectRatio",
  "colspan", "rowspan", "scope",
];

const FORBID_TAGS = ["script", "iframe", "object", "embed", "form", "input", "textarea", "select", "button"];
const FORBID_ATTR = ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"];

export interface SanitizeResult {
  html: string;
  warnings: string[];
  blocked: string[];
  safe: boolean;
}

export function sanitizeHTML(rawHtml: string): SanitizeResult {
  const warnings: string[] = [];
  const blocked: string[] = [];

  // Check for dangerous patterns
  if (/eval\s*\(/i.test(rawHtml)) blocked.push("eval() detected in code");
  if (/Function\s*\(/i.test(rawHtml)) blocked.push("Function() constructor detected");
  if (/innerHTML\s*=/i.test(rawHtml)) blocked.push("innerHTML assignment detected");
  if (/<iframe/i.test(rawHtml)) blocked.push("<iframe> element detected");
  if (/<form/i.test(rawHtml)) blocked.push("<form> element detected");

  // Check for external scripts
  const externalScripts = rawHtml.match(/<script[^>]*src\s*=\s*["'][^"']*["'][^>]*>/gi);
  if (externalScripts) {
    externalScripts.forEach((s) => {
      warnings.push(`External script blocked: ${s.substring(0, 60)}...`);
    });
  }

  const html = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: true,
    ADD_TAGS: ["style"],
    WHOLE_DOCUMENT: false,
  });

  return {
    html,
    warnings,
    blocked,
    safe: blocked.length === 0,
  };
}

export function scopeCSS(css: string, scopeId: string): string {
  return css.replace(
    /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
    (match, selector, suffix) => {
      const trimmed = selector.trim();
      if (trimmed.startsWith("@") || trimmed === "from" || trimmed === "to" || /^\d+%$/.test(trimmed)) {
        return match;
      }
      return `#${scopeId} ${trimmed}${suffix}`;
    }
  );
}
