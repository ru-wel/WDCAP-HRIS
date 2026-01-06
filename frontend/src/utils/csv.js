import { downloadBlobFile } from './download.js';

const normalizeCsvValue = (value) => {
  if (value == null) return "";

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? value.toISOString() : "";
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join("; ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const escapeCsvValue = (value) => {
  const s = normalizeCsvValue(value);
  if (!s) return "";
  const mustQuote = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
};

export const buildCsv = ({ columns, rows }) => {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = typeof c.value === "function" ? c.value(row) : row?.[c.value];
        return escapeCsvValue(v);
      })
      .join(",")
  );

  // Use CRLF for best compatibility with Excel.
  return [header, ...lines].join("\r\n");
};

export const downloadTextFile = ({ filename, text, mimeType }) => {
  const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
  downloadBlobFile({ filename, blob });
};

export const exportRowsToCsv = ({ filename, columns, rows }) => {
  const csv = buildCsv({ columns, rows });
  // Add UTF-8 BOM to improve Excel compatibility with non-ASCII characters.
  const withBom = `\ufeff${csv}`;
  downloadTextFile({
    filename,
    text: withBom,
    mimeType: "text/csv;charset=utf-8",
  });
};
