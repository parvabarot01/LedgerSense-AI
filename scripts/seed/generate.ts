// Synthetic data generators for demoing LedgerSense without any real
// financial data. Deterministic (seeded) so every fresh `npm run seed` run
// produces the same known set of anomalies to showcase the detection engine.

export interface SeedRecord {
  date: string; // ISO yyyy-mm-dd
  amount: number;
  externalRef: string;
  counterparty: string;
  description: string;
}

const COUNTERPARTIES = [
  "Northwind Supply Co",
  "Acme Logistics",
  "Blue Harbor Freight",
  "Fairview Payroll Services",
  "Meridian Software",
  "Crestline Utilities",
  "Ashford Office Supplies",
  "Palmetto Insurance Group",
];

// Simple mulberry32 PRNG so the seed is deterministic across runs.
function makeRandom(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Generates a bank feed alongside its "true" internal ledger, then perturbs
 * the ledger with a fixed set of anomalies so the detection engine always
 * has something real to find in a fresh demo: a handful of duplicate
 * postings, a couple of statistical outliers, a few amount/date mismatches
 * on otherwise-matched pairs, and some genuinely unmatched entries on each
 * side (including a couple recent enough to read as timing gaps).
 */
export function generateReconciliationDemoData(seed = 42, baseCount = 120) {
  const random = makeRandom(seed);
  const today = new Date();
  const startDate = addDays(today.toISOString().slice(0, 10), -60);

  const bankFeed: SeedRecord[] = [];
  const ledger: SeedRecord[] = [];

  for (let i = 0; i < baseCount; i++) {
    const dayOffset = Math.floor(random() * 55);
    const date = addDays(startDate, dayOffset);
    const amount = Math.round((20 + random() * 4800) * 100) / 100;
    const counterparty = COUNTERPARTIES[Math.floor(random() * COUNTERPARTIES.length)];
    const ref = `TXN-${1000 + i}`;

    bankFeed.push({
      date,
      amount,
      externalRef: ref,
      counterparty,
      description: `Payment to ${counterparty}`,
    });
    ledger.push({
      date,
      amount,
      externalRef: ref,
      counterparty,
      description: `AP: ${counterparty}`,
    });
  }

  // 1. Duplicate ledger postings (same invoice keyed twice).
  for (const idx of [3, 3, 40]) {
    const dup = { ...ledger[idx], externalRef: `${ledger[idx].externalRef}-DUP` };
    ledger.push(dup);
  }

  // 2. Statistical outliers on the bank feed (a couple of unusually large payments).
  bankFeed.push({
    date: addDays(startDate, 10),
    amount: 48250.0,
    externalRef: "TXN-9001",
    counterparty: "Meridian Software",
    description: "Annual enterprise license renewal",
  });
  ledger.push({
    date: addDays(startDate, 10),
    amount: 48250.0,
    externalRef: "TXN-9001",
    counterparty: "Meridian Software",
    description: "AP: Meridian Software annual license",
  });

  // 3. Amount/date mismatches on otherwise-matched pairs (disputed matches).
  for (const idx of [15, 55]) {
    ledger[idx] = { ...ledger[idx], amount: Math.round((ledger[idx].amount + 37.42) * 100) / 100 };
  }
  ledger[70] = { ...ledger[70], date: addDays(ledger[70].date, 5) };

  // 4. Genuinely unmatched bank entries (no ledger counterpart at all).
  for (let i = 0; i < 3; i++) {
    bankFeed.push({
      date: addDays(startDate, 20 + i * 7),
      amount: Math.round((100 + random() * 900) * 100) / 100,
      externalRef: `TXN-UNM-${i}`,
      counterparty: "Crestline Utilities",
      description: "Unreconciled bank debit",
    });
  }

  // 5. Recent entries with no counterpart yet (should read as timing gaps, not breaks).
  for (let i = 0; i < 2; i++) {
    const recentDate = addDays(today.toISOString().slice(0, 10), -1 - i);
    bankFeed.push({
      date: recentDate,
      amount: Math.round((50 + random() * 500) * 100) / 100,
      externalRef: `TXN-RECENT-${i}`,
      counterparty: "Ashford Office Supplies",
      description: "Pending settlement",
    });
  }

  return { bankFeed, ledger };
}
