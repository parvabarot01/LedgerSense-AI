// Populates a demo bank feed + ledger, with known anomalies, into an
// already-existing organization. Run with:
//
//   npm run seed -- --org=your-workspace-slug
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local (service role, since this bypasses RLS by design as a trusted
// server-side job - never import this outside a script context).
//
// The organization must already exist (sign up in the app, create a
// workspace via onboarding) so the seeded data lands somewhere you're
// already a member of and can see immediately.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateReconciliationDemoData } from "./generate";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name}. Copy .env.example to .env.local and fill it in first.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const orgSlug = process.argv.find((a) => a.startsWith("--org="))?.split("=")[1] ?? "";
  if (!orgSlug) {
    console.error("Usage: npm run seed -- --org=<workspace-slug>");
    process.exit(1);
  }

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgError) throw orgError;
  if (!org) {
    console.error(
      `No organization found with slug "${orgSlug}". Sign up in the app and create a workspace with this URL first, then re-run.`
    );
    process.exit(1);
  }

  console.log(`Seeding demo data into "${org.name}"...`);

  const { data: bankSource, error: bankError } = await supabase
    .from("data_sources")
    .insert({ org_id: org.id, name: "Demo bank feed", kind: "transaction", origin: "bank_feed" })
    .select()
    .single();
  if (bankError) throw bankError;

  const { data: ledgerSource, error: ledgerError } = await supabase
    .from("data_sources")
    .insert({ org_id: org.id, name: "Demo internal ledger", kind: "ledger", origin: "ledger" })
    .select()
    .single();
  if (ledgerError) throw ledgerError;

  const { bankFeed, ledger } = generateReconciliationDemoData();

  const { error: bankInsertError } = await supabase.from("transactions").insert(
    bankFeed.map((r) => ({
      org_id: org.id,
      data_source_id: bankSource.id,
      external_ref: r.externalRef,
      txn_date: r.date,
      amount: r.amount,
      counterparty: r.counterparty,
      description: r.description,
      raw: r,
    }))
  );
  if (bankInsertError) throw bankInsertError;

  const { error: ledgerInsertError } = await supabase.from("ledger_entries").insert(
    ledger.map((r) => ({
      org_id: org.id,
      data_source_id: ledgerSource.id,
      external_ref: r.externalRef,
      entry_date: r.date,
      amount: r.amount,
      counterparty: r.counterparty,
      description: r.description,
      raw: r,
    }))
  );
  if (ledgerInsertError) throw ledgerInsertError;

  await supabase.from("data_sources").update({ row_count: bankFeed.length }).eq("id", bankSource.id);
  await supabase.from("data_sources").update({ row_count: ledger.length }).eq("id", ledgerSource.id);

  const { data: reconSet, error: reconError } = await supabase
    .from("reconciliation_sets")
    .insert({
      org_id: org.id,
      name: "Bank feed vs. internal ledger",
      source_a_id: bankSource.id,
      source_b_id: ledgerSource.id,
      match_window_days: 3,
      amount_tolerance: 0,
    })
    .select()
    .single();
  if (reconError) throw reconError;

  console.log(`Done. Seeded ${bankFeed.length} bank rows and ${ledger.length} ledger rows.`);
  console.log(`Reconciliation set "${reconSet.name}" (${reconSet.id}) is ready to run detection on.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
