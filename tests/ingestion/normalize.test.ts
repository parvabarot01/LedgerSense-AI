import { describe, expect, it } from "vitest";
import { normalizeRows } from "@/lib/ingestion/normalize";

describe("normalizeRows", () => {
  const mapping = {
    date: "Date",
    amount: "Amount",
    externalRef: "Ref",
    counterparty: "Payee",
    description: "Memo",
  };

  it("normalizes plain rows", () => {
    const { records, errors } = normalizeRows(
      [{ Date: "2026-01-05", Amount: "100.50", Ref: "REF1", Payee: "Acme", Memo: "Invoice" }],
      mapping
    );
    expect(errors).toHaveLength(0);
    expect(records[0]).toMatchObject({ date: "2026-01-05", amount: 100.5, external_ref: "REF1" });
  });

  it("treats parenthesized amounts as negative", () => {
    const { records } = normalizeRows([{ Date: "2026-01-05", Amount: "($1,234.50)" }], mapping);
    expect(records[0].amount).toBe(-1234.5);
  });

  it("strips currency symbols and thousands separators", () => {
    const { records } = normalizeRows([{ Date: "2026-01-05", Amount: "$2,500.00" }], mapping);
    expect(records[0].amount).toBe(2500);
  });

  it("collects errors for unparseable rows instead of throwing", () => {
    const { records, errors } = normalizeRows(
      [
        { Date: "not-a-date", Amount: "100" },
        { Date: "2026-01-05", Amount: "not-a-number" },
        { Date: "2026-01-05", Amount: "50" },
      ],
      mapping
    );
    expect(records).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
