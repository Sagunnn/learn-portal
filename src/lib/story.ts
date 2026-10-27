import { toText } from "./richText";
import type { RichText } from "../types/content";

/**
 * Splits lesson text into "story" segments (one speech bubble each), so the
 * student never faces a wall of text. Each line starts a new bubble, except:
 *  - list lines stay with the line that introduces them,
 *  - a line that is only display math ($$…$$) stays with the line before it.
 */
export function splitStory(body: RichText): string[] {
  const lines = toText(body)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const segments: string[][] = [];
  for (const line of lines) {
    const isList = /^([-•]|\d+[.)])\s+/.test(line);
    const isMath = /^\$\$[\s\S]*\$\$$/.test(line);
    const prev = segments[segments.length - 1];
    if (prev && (isList || isMath)) prev.push(line);
    else segments.push([line]);
  }
  return segments.map((s) => s.join("\n"));
}
