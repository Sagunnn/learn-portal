import katex from "katex";
import type { RichText } from "../types/content";

/**
 * Turns lesson text into HTML. Supported markup:
 *   $x^2$  inline math      $$...$$  display math     \$  literal dollar
 *   **bold**   *italic*   ==highlight==   `code`
 *   lines starting with "- " or "1. " become lists; every other line is a paragraph.
 * All non-math text is HTML-escaped, so content can't inject markup.
 */

const cache = new Map<string, string>();
const PH = "\u0000";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toText(input: RichText): string {
  return Array.isArray(input) ? input.join("\n") : input;
}

function renderMath(tex: string, displayMode: boolean) {
  return katex.renderToString(tex.trim(), { displayMode, throwOnError: false, output: "htmlAndMathml" });
}

function inlineMarks(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/==(.+?)==/g, "<mark>$1</mark>")
    .replace(/(^|[^*\w])\*(?=\S)(.+?)(?<=\S)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function renderRich(input: RichText, opts: { inline?: boolean } = {}): string {
  const src = toText(input);
  const key = (opts.inline ? "i:" : "b:") + src;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const math: string[] = [];
  const display = new Set<string>();
  const stash = (html: string, isDisplay = false) => {
    const token = `${PH}${math.push(html) - 1}${PH}`;
    if (isDisplay) display.add(token);
    return token;
  };

  let s = src
    .replace(/\\\$/g, `${PH}D${PH}`)
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => stash(renderMath(tex, true), true))
    .replace(/\$([^\n$]+?)\$/g, (_, tex: string) => stash(renderMath(tex, false)));

  s = inlineMarks(escapeHtml(s));

  if (opts.inline) {
    s = s.replace(/\n/g, "<br>");
  } else {
    const out: string[] = [];
    let listTag: "ul" | "ol" | null = null;
    let items: string[] = [];
    const flush = () => {
      if (listTag) out.push(`<${listTag}>${items.map((i) => `<li>${i}</li>`).join("")}</${listTag}>`);
      listTag = null;
      items = [];
    };
    for (const raw of s.split("\n")) {
      const line = raw.trim();
      const m = /^([-•]|\d+[.)])\s+(.*)$/.exec(line);
      if (m) {
        const tag = /^\d/.test(m[1]) ? "ol" : "ul";
        if (listTag !== tag) flush();
        listTag = tag;
        items.push(m[2]);
        continue;
      }
      flush();
      if (!line) continue;
      // A line that is only display math shouldn't get wrapped in <p>.
      out.push(display.has(line) ? line : `<p>${line}</p>`);
    }
    flush();
    s = out.join("");
  }

  s = s.replace(new RegExp(`${PH}(\\d+|D)${PH}`, "g"), (_, i: string) => (i === "D" ? "$" : math[Number(i)]));
  if (cache.size > 2000) cache.clear();
  cache.set(key, s);
  return s;
}
