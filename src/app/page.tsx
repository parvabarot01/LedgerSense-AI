import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-ink-navy-soft">
          Reconciliation, explained and governed
        </p>
        <h1 className="font-display text-4xl leading-tight text-ink-navy sm:text-5xl">
          Find every anomaly. <span className="text-exception">Explain</span> it.{" "}
          <span className="text-brass">Seal</span> it.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-ink-navy-soft">
          LedgerSense detects duplicates, outliers, and reconciliation breaks with
          transparent statistical rules, grounds every explanation in the exact flagged
          rows, and requires a second signature before anything is resolved.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/signup">
            <Button>Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="rounded-sm border border-hairline bg-paper-raised p-5">
            <p className="font-display text-reconciled">Reconciled</p>
            <p className="mt-1 text-sm text-ink-navy-soft">
              Deterministic matching, exact then fuzzy, so every clean pair is visible at a
              glance.
            </p>
          </div>
          <div className="rounded-sm border border-hairline bg-paper-raised p-5">
            <p className="font-display text-trace">Traceable</p>
            <p className="mt-1 text-sm text-ink-navy-soft">
              Every AI explanation cites the exact rows and rule that triggered it. No
              unsupported claims.
            </p>
          </div>
          <div className="rounded-sm border border-hairline bg-paper-raised p-5">
            <p className="font-display text-brass">Governed</p>
            <p className="mt-1 text-sm text-ink-navy-soft">
              Maker proposes, checker seals. Nothing resolves without a second signature.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
