export interface ColumnMapping {
  date: string;
  amount: string;
  externalRef?: string;
  counterparty?: string;
  description?: string;
}

export interface NormalizedRecord {
  external_ref: string | null;
  date: string; // ISO yyyy-mm-dd
  amount: number;
  counterparty: string | null;
  description: string | null;
  raw: Record<string, unknown>;
}

export interface NormalizeResult {
  records: NormalizedRecord[];
  errors: { rowIndex: number; reason: string }[];
}

/**
 * Accounting-format-aware amount parser: strips currency symbols and
 * thousands separators, and treats parenthesized values as negative
 * (`($1,234.50)` -> -1234.50), the common ledger convention for debits.
 */
function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isParenNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[()$,\s]/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;

  return isParenNegative ? -Math.abs(value) : value;
}

function parseDate(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const value = new Date(raw as string | number);
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

export function normalizeRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): NormalizeResult {
  const records: NormalizedRecord[] = [];
  const errors: NormalizeResult["errors"] = [];

  rows.forEach((row, rowIndex) => {
    const date = parseDate(row[mapping.date]);
    const amount = parseAmount(row[mapping.amount]);

    if (date === null) {
      errors.push({ rowIndex, reason: `Could not parse date from column "${mapping.date}"` });
      return;
    }
    if (amount === null) {
      errors.push({ rowIndex, reason: `Could not parse amount from column "${mapping.amount}"` });
      return;
    }

    records.push({
      date,
      amount,
      external_ref: mapping.externalRef ? String(row[mapping.externalRef] ?? "").trim() || null : null,
      counterparty: mapping.counterparty ? String(row[mapping.counterparty] ?? "").trim() || null : null,
      description: mapping.description ? String(row[mapping.description] ?? "").trim() || null : null,
      raw: row,
    });
  });

  return { records, errors };
}
