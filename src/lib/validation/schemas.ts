import { z } from "zod";

// Every API route validates its input against one of these before touching
// the database. Keeping them in one file makes it easy to audit that every
// route actually has a schema (see the hardening pass notes in ARCHITECTURE.md).

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
});

export const dataSourceKindSchema = z.enum(["transaction", "ledger"]);
export const dataSourceOriginSchema = z.enum(["bank_feed", "ledger", "processor", "other"]);

export const createDataSourceSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  kind: dataSourceKindSchema,
  origin: dataSourceOriginSchema,
});

export const columnMappingSchema = z.object({
  date: z.string().min(1),
  amount: z.string().min(1),
  externalRef: z.string().optional(),
  counterparty: z.string().optional(),
  description: z.string().optional(),
});

export const ingestRowsSchema = z.object({
  orgId: z.string().uuid(),
  dataSourceId: z.string().uuid(),
  mapping: columnMappingSchema,
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(20000),
});

export const createReconciliationSetSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  sourceAId: z.string().uuid(),
  sourceBId: z.string().uuid(),
  matchWindowDays: z.number().int().min(0).max(90).default(3),
  amountTolerance: z.number().min(0).max(1).default(0),
});

export const runDetectionSchema = z.object({
  orgId: z.string().uuid(),
  reconciliationSetId: z.string().uuid(),
});

export const explainExceptionSchema = z.object({
  orgId: z.string().uuid(),
  exceptionId: z.string().uuid(),
});

export const naturalLanguageQuerySchema = z.object({
  orgId: z.string().uuid(),
  reconciliationSetId: z.string().uuid(),
  question: z.string().trim().min(3).max(500),
});

export const resolutionActionSchema = z.enum(["match", "write_off", "escalate", "dismiss"]);

export const proposeResolutionSchema = z.object({
  orgId: z.string().uuid(),
  exceptionId: z.string().uuid(),
  action: resolutionActionSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const decideResolutionSchema = z.object({
  orgId: z.string().uuid(),
  resolutionId: z.string().uuid(),
  approve: z.boolean(),
  decisionNotes: z.string().trim().max(2000).optional(),
});

export const auditReportSchema = z.object({
  orgId: z.string().uuid(),
  reconciliationSetId: z.string().uuid().optional(),
});
