"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, hasRole } from "@/lib/membership";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rateLimit";
import { normalizeRows, type ColumnMapping } from "@/lib/ingestion/normalize";
import {
  createDataSourceSchema,
  ingestRowsSchema,
} from "@/lib/validation/schemas";
import type { ActionState } from "./auth";

export interface CreateDataSourceState extends ActionState {
  dataSourceId?: string;
}

export async function createDataSource(
  _prevState: CreateDataSourceState,
  formData: FormData
): Promise<CreateDataSourceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = createDataSourceSchema.safeParse({
    orgId: formData.get("orgId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    origin: formData.get("origin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const role = await getMembership(supabase, user!.id, parsed.data.orgId);
  if (!hasRole(role, ["owner", "admin", "analyst"])) {
    return { error: "You don't have permission to add a data source." };
  }

  const { data: source, error } = await supabase
    .from("data_sources")
    .insert({
      org_id: parsed.data.orgId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      origin: parsed.data.origin,
      created_by: user!.id,
    })
    .select()
    .single();

  if (error || !source) return { error: error?.message ?? "Could not create data source." };

  await recordAudit(supabase, {
    orgId: parsed.data.orgId,
    actorId: user!.id,
    action: "data_source.created",
    entityType: "data_source",
    entityId: source.id,
    after: { name: source.name, kind: source.kind, origin: source.origin },
  });

  return { dataSourceId: source.id };
}

export interface IngestRowsState extends ActionState {
  inserted?: number;
  skipped?: number;
}

const initialIngestState: IngestRowsState = {};

export async function ingestRows(input: {
  orgId: string;
  dataSourceId: string;
  mapping: ColumnMapping;
  rows: Record<string, unknown>[];
  storagePath?: string;
}): Promise<IngestRowsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = ingestRowsSchema.safeParse({
    orgId: input.orgId,
    dataSourceId: input.dataSourceId,
    mapping: input.mapping,
    rows: input.rows,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const role = await getMembership(supabase, user.id, parsed.data.orgId);
  if (!hasRole(role, ["owner", "admin", "analyst"])) {
    return { error: "You don't have permission to ingest data." };
  }

  const limit = await rateLimit.ingestion(`${parsed.data.orgId}:${user.id}`);
  if (!limit.success) return { error: "Too many ingestion requests. Try again in a minute." };

  const { data: source, error: sourceError } = await supabase
    .from("data_sources")
    .select("*")
    .eq("id", parsed.data.dataSourceId)
    .eq("org_id", parsed.data.orgId)
    .single();
  if (sourceError || !source) return { error: "Data source not found." };

  const { records, errors } = normalizeRows(parsed.data.rows, parsed.data.mapping);
  if (records.length === 0) {
    return { error: "No rows could be normalized. Check your column mapping.", skipped: errors.length };
  }

  const table = source.kind === "ledger" ? "ledger_entries" : "transactions";
  const insertRows = records.map((r) => ({
    org_id: parsed.data.orgId,
    data_source_id: parsed.data.dataSourceId,
    external_ref: r.external_ref,
    ...(table === "ledger_entries" ? { entry_date: r.date } : { txn_date: r.date }),
    amount: r.amount,
    counterparty: r.counterparty,
    description: r.description,
    raw: r.raw,
    created_by: user.id,
  }));

  const { error: insertError } = await supabase.from(table).insert(insertRows);
  if (insertError) return { error: insertError.message };

  await supabase
    .from("data_sources")
    .update({
      row_count: source.row_count + records.length,
      storage_path: input.storagePath ?? source.storage_path,
    })
    .eq("id", source.id);

  await recordAudit(supabase, {
    orgId: parsed.data.orgId,
    actorId: user.id,
    action: "data_source.ingested",
    entityType: "data_source",
    entityId: source.id,
    after: { inserted: records.length, skipped: errors.length, table },
  });

  return { inserted: records.length, skipped: errors.length };
}

export const ingestRowsInitialState = initialIngestState;
