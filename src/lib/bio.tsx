import type { ReactNode } from "react";

/** Splits a bio into paragraphs on blank lines. */
export function bioParagraphs(bio: string): string[] {
  return bio
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Renders **bold** markers within a single paragraph as <strong>. */
export function renderBioLine(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
