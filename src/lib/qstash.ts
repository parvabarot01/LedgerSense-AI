import { Client } from "@upstash/qstash";

export const qstashConfigured = Boolean(
  process.env.QSTASH_TOKEN && process.env.NEXT_PUBLIC_APP_URL
);

export function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;
  return new Client({ token: process.env.QSTASH_TOKEN });
}
