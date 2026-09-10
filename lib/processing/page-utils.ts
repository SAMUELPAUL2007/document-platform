/**
 * Parses a page selection string like "1,3,5-8" into an array of 0-based page indices.
 * @param value - Selection string (e.g., "1,3,5-8" or undefined)
 * @param totalPages - Total number of pages in the document
 * @returns Array of 0-based page indices, sorted ascending
 */
export function parsePageSelection(value: string | undefined, totalPages: number): number[] {
  if (!value || value.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages: number[] = [];
  const parts = value.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) continue;
      const s = Math.max(1, Math.min(start, totalPages));
      const e = Math.max(1, Math.min(end, totalPages));
      for (let i = s; i <= e; i++) {
        if (!pages.includes(i - 1)) pages.push(i - 1);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        if (!pages.includes(num - 1)) pages.push(num - 1);
      }
    }
  }

  pages.sort((a, b) => a - b);
  return pages;
}

/**
 * Parses a page order string like "3,1,2" into an array of 0-based page indices.
 * @param value - Order string (e.g., "3,1,2" or undefined)
 * @param totalPages - Total number of pages in the document
 * @returns Array of 0-based page indices in the specified order
 */
export function parsePageOrder(value: string | undefined, totalPages: number): number[] {
  if (!value || value.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages: number[] = [];
  const parts = value.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      pages.push(num - 1);
    }
  }

  return pages.length > 0 ? pages : Array.from({ length: totalPages }, (_, i) => i);
}

const STATIC_PAGE_PRESETS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "First", value: "1" },
];

export function getPagePresets(totalPages?: number): Array<{ label: string; value: string }> {
  if (!totalPages || totalPages <= 1) return STATIC_PAGE_PRESETS;

  const presets = [...STATIC_PAGE_PRESETS];

  if (totalPages >= 2) {
    presets.push({ label: "Last", value: String(totalPages) });
  }

  const evenPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n % 2 === 0)
    .join(",");
  presets.push({ label: "Even", value: evenPages });

  const oddPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n % 2 === 1)
    .join(",");
  presets.push({ label: "Odd", value: oddPages });

  return presets;
}

export function parsePresetValue(presetValue: string, totalPages: number): number[] {
  return parsePageSelection(presetValue, totalPages);
}

/**
 * Validates a page range string and returns an error message if invalid.
 * Returns null if the string is empty (which means "all pages") or valid.
 */
export function validatePageRange(value: string): string | null {
  if (!value || value.trim() === "") return null;

  const parts = value.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === "") continue;

    if (trimmed.includes("-")) {
      const segments = trimmed.split("-");
      if (segments.length !== 2) return `"${trimmed}" is not a valid range`;
      const start = parseInt(segments[0], 10);
      const end = parseInt(segments[1], 10);
      if (isNaN(start) || isNaN(end)) return `"${trimmed}" contains invalid numbers`;
      if (start > end) return `Range "${trimmed}" has start greater than end`;
      if (start < 1) return `Page numbers must be at least 1`;
    } else {
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) return `"${trimmed}" is not a valid page number`;
      if (num < 1) return `Page numbers must be at least 1`;
    }
  }

  return null;
}
