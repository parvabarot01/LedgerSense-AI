import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LedgerRecord } from "@/types/database";

export async function fetchRecordsByIds(
  supabase: SupabaseClient<Database>,
  table: "transactions" | "ledger_entries",
  ids: string[]
): Promise<Map<string, LedgerRecord>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from(table).select("*").in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row]));
}

export function recordDate(record: LedgerRecord): string {
  return record.txn_date ?? record.entry_date ?? "";
}
