export const DESCRIPTION_MAX = 12_000;

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function stripHtml(html: string): string {
  return collapseWhitespace(html.replace(/<[^>]+>/g, ' '));
}

export function normalizeDescription(raw: string): {
  description: string;
  truncated: boolean;
} {
  const cleaned = collapseWhitespace(raw);
  if (cleaned.length <= DESCRIPTION_MAX) {
    return { description: cleaned, truncated: false };
  }
  return {
    description: cleaned.slice(0, DESCRIPTION_MAX),
    truncated: true,
  };
}

export function firstText(
  doc: Document,
  selectors: readonly string[],
): string | null {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (!el) continue;
    const text = collapseWhitespace(el.textContent ?? '');
    if (text) return text;
  }
  return null;
}

export function allTexts(
  doc: Document,
  selectors: readonly string[],
): string[] {
  const out: string[] = [];
  for (const sel of selectors) {
    doc.querySelectorAll(sel).forEach((el) => {
      const text = collapseWhitespace(el.textContent ?? '');
      if (text && !out.includes(text)) out.push(text);
    });
    if (out.length) break;
  }
  return out;
}

export function hasAny(doc: Document, selectors: readonly string[]): boolean {
  return selectors.some((sel) => doc.querySelector(sel) !== null);
}
