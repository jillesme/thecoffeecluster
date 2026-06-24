import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { wholesaleLeads, type NewWholesaleLead } from '../../../../src/db/schema';
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
