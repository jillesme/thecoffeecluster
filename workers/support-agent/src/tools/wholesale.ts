import { defineTool } from '@flue/runtime';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import {
  wholesaleInvitations,
  wholesaleLeads,
  type NewWholesaleLead,
  type WholesaleInvitation,
} from '../../../../src/db/schema';
import type { SupportAgentEnv } from '../shared/env';
import { optionalShortTextSchema, positiveIntegerSchema, summarySchema } from '../shared/schemas';
import { withSupportDb } from '../shared/support-db';

export interface WholesaleLeadContext {
  customerEmail: string;
  originalMessage: string;
}

export interface WholesaleLeadState {
  leadId?: number;
  status?: string;
}

export const wholesaleLeadInputSchema = v.object({
  name: optionalShortTextSchema,
  companyName: optionalShortTextSchema,
  location: optionalShortTextSchema,
  estimatedVolume: optionalShortTextSchema,
  agentSummary: v.pipe(summarySchema, v.description('Concise summary of the wholesale interest and any customer-provided details.')),
});

export const wholesaleLeadOutputSchema = v.object({
  leadId: positiveIntegerSchema,
  status: v.string(),
});

export type WholesaleLeadInput = v.InferOutput<typeof wholesaleLeadInputSchema>;
export type WholesaleLeadOutput = v.InferOutput<typeof wholesaleLeadOutputSchema>;

export async function createWholesaleLead(
  env: SupportAgentEnv,
  context: WholesaleLeadContext,
  input: WholesaleLeadInput,
): Promise<WholesaleLeadOutput> {
  return withSupportDb(env, async (db) => {
    const leadValues: NewWholesaleLead = {
      email: context.customerEmail,
      name: input.name ?? null,
      companyName: input.companyName ?? null,
      location: input.location ?? null,
      estimatedVolume: input.estimatedVolume ?? null,
      originalMessage: context.originalMessage,
      agentSummary: input.agentSummary,
      status: 'new',
    };

    const [lead] = await db
      .insert(wholesaleLeads)
      .values(leadValues)
      .returning({ id: wholesaleLeads.id, status: wholesaleLeads.status });

    if (!lead) throw new Error('Wholesale lead insert did not return a row');
    return { leadId: lead.id, status: lead.status };
  });
}

export type WholesaleInvitationStatus = 'pending' | 'opted_in' | 'declined';

/**
 * Read the persisted wholesale opt-in state for an email thread.
 *
 * The Action runs in an isolated per-invocation child session with no
 * cross-email memory, so this durable row is the only reliable signal of
 * whether the current inbound email is replying to an earlier opt-in invitation.
 */
export async function getWholesaleInvitation(
  env: SupportAgentEnv,
  threadId: string,
): Promise<WholesaleInvitation | null> {
  return withSupportDb(env, async (db) => {
    const [invitation] = await db
      .select()
      .from(wholesaleInvitations)
      .where(eq(wholesaleInvitations.threadId, threadId))
      .limit(1);
    return invitation ?? null;
  });
}

/**
 * Record that the agent sent a wholesale opt-in invitation for this thread.
 * Idempotent: re-running for the same thread keeps a single pending row.
 */
export async function markWholesaleInvitationPending(
  env: SupportAgentEnv,
  input: { threadId: string; email: string; summary?: string },
): Promise<void> {
  await withSupportDb(env, async (db) => {
    await db
      .insert(wholesaleInvitations)
      .values({
        threadId: input.threadId,
        email: input.email,
        status: 'pending',
        invitationSummary: input.summary ?? null,
      })
      .onConflictDoUpdate({
        target: wholesaleInvitations.threadId,
        set: {
          email: input.email,
          status: 'pending',
          invitationSummary: input.summary ?? null,
          updatedAt: new Date(),
        },
      });
  });
}

/**
 * Resolve a thread's wholesale invitation once the customer opts in or declines.
 * Upserts so an out-of-order opt-in (no prior pending row) is still recorded.
 */
export async function resolveWholesaleInvitation(
  env: SupportAgentEnv,
  input: { threadId: string; email: string; status: Exclude<WholesaleInvitationStatus, 'pending'>; leadId?: number },
): Promise<void> {
  await withSupportDb(env, async (db) => {
    await db
      .insert(wholesaleInvitations)
      .values({
        threadId: input.threadId,
        email: input.email,
        status: input.status,
        leadId: input.leadId ?? null,
      })
      .onConflictDoUpdate({
        target: wholesaleInvitations.threadId,
        set: {
          email: input.email,
          status: input.status,
          leadId: input.leadId ?? null,
          updatedAt: new Date(),
        },
      });
  });
}

export function createWholesaleLeadTool(env: SupportAgentEnv, context: WholesaleLeadContext, state?: WholesaleLeadState) {
  return defineTool({
    name: 'create_wholesale_lead',
    description:
      'Capture confirmed opt-in from the inbound email sender for the wholesale notification shortlist. Use only after the customer has clearly said they want to be notified when wholesale becomes available. Customer email and original message are bound by trusted application code.',
    input: wholesaleLeadInputSchema,
    output: wholesaleLeadOutputSchema,
    async run({ input, signal }) {
      signal?.throwIfAborted();
      if (state?.leadId) {
        throw new Error(`Wholesale lead was already captured for this inbound email as ${state.leadId}`);
      }

      const result = await createWholesaleLead(env, context, input);
      if (state) {
        state.leadId = result.leadId;
        state.status = result.status;
      }
      return result;
    },
  });
}
