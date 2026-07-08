"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseCsvFile, type ParsedCsv } from "@/lib/ingestion/csv";
import { ingestRows } from "@/app/actions/dataSources";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Select } from "@/components/ui/Input";

const MAPPING_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "externalRef", label: "Reference / external ID", required: false },
  { key: "counterparty", label: "Counterparty", required: false },
  { key: "description", label: "Description", required: false },
] as const;

type MappingState = Partial<Record<(typeof MAPPING_FIELDS)[number]["key"], string>>;

function guessMapping(headers: string[]): MappingState {
  const find = (candidates: string[]) =>
    headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c)));

  return {
    date: find(["date"]),
    amount: find(["amount", "value"]),
    externalRef: find(["ref", "id", "reference"]),
    counterparty: find(["counterparty", "payee", "vendor", "name"]),
    description: find(["description", "memo", "note"]),
  };
}

export function CsvUploadWizard({ orgId, dataSourceId }: { orgId: string; dataSourceId: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<MappingState>({});
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    const parsed = await parseCsvFile(selected);
    setCsv(parsed);
    setMapping(guessMapping(parsed.headers));
  }

  async function handleSubmit() {
    if (!csv || !mapping.date || !mapping.amount) return;
    setStatus("uploading");
    setMessage(null);

    let storagePath: string | undefined;
    if (file) {
      const supabase = createClient();
      const path = `${orgId}/${dataSourceId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("raw-uploads").upload(path, file);
      if (!uploadError) storagePath = path;
    }

    const result = await ingestRows({
      orgId,
      dataSourceId,
      mapping: {
        date: mapping.date,
        amount: mapping.amount,
        externalRef: mapping.externalRef,
        counterparty: mapping.counterparty,
        description: mapping.description,
      },
      rows: csv.rows,
      storagePath,
    });

    if (result.error) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("done");
    setMessage(
      `Imported ${result.inserted} row(s)${result.skipped ? `, skipped ${result.skipped} that couldn't be parsed` : ""}.`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!csv && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed border-hairline bg-paper-raised px-6 py-12 text-center transition-colors duration-fast ease-out hover:border-trace">
          <span className="text-sm font-medium text-ink-navy">Choose a CSV file</span>
          <span className="mt-1 text-xs text-ink-navy-soft">or drag and drop</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />
        </label>
      )}

      {csv && status !== "done" && (
        <>
          <div>
            <p className="mb-3 text-sm font-medium text-ink-navy">Map columns</p>
            <div className="grid grid-cols-2 gap-4">
              {MAPPING_FIELDS.map((field) => (
                <div key={field.key}>
                  <FieldLabel>
                    {field.label}
                    {field.required && <span className="text-exception"> *</span>}
                  </FieldLabel>
                  <Select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}
                  >
                    <option value="">Not mapped</option>
                    {csv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-navy">Preview ({csv.rows.length} rows)</p>
            <div className="overflow-x-auto rounded-sm border border-hairline">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-paper text-left text-xs uppercase tracking-wide text-ink-navy-soft">
                    {csv.headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csv.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-hairline last:border-0">
                      {csv.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-ink-navy-soft">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {message && <p className="text-sm text-exception">{message}</p>}

          <Button onClick={handleSubmit} disabled={!mapping.date || !mapping.amount || status === "uploading"}>
            {status === "uploading" ? "Importing..." : `Import ${csv.rows.length} rows`}
          </Button>
        </>
      )}

      {status === "done" && (
        <div className="rounded-sm border border-reconciled/30 bg-reconciled-tint p-4 text-sm text-reconciled">
          {message}
        </div>
      )}
    </div>
  );
}
