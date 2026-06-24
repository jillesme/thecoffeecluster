import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { withSupportDb } from '../db';
import type { SupportAgentEnv } from '../env';
import { wholesaleLeads, type NewWholesaleLead } from '../../../../src/db/schema';

export function createWholesaleTools(env: SupportAgentEnv) {
  return [
    defineTool({
      name: 'create_wholesale_lead',
      description:
        'Capture interest from a customer asking about wholesale, bulk, cafe, restaurant, office, or recurring high-volume coffee supply. Call this before replying to wholesale inquiries.',
      input: v.object({
        email: v.pipe(v.string(), v.description('The inbound customer email address.')),
        originalMessage: v.pipe(v.string(), v.description('The customer\'s original email body.')),
        name: v.optional(v.string()),
        companyName: v.optional(v.string()),
        location: v.optional(v.string()),
        estimatedVolume: v.optional(v.string()),
        agentSummary: v.string(),
      }),
      output: v.object({ leadId: v.number(), status: v.string() }),
      async run({ input }) {
        return withSupportDb(env, async (db) => {
          const leadValues: NewWholesaleLead = {
            email: input.email,
            name: input.name ?? null,
            companyName: input.companyName ?? null,
            location: input.location ?? null,
            estimatedVolume: input.estimatedVolume ?? null,
            originalMessage: input.originalMessage,
            agentSummary: input.agentSummary,
            status: 'new',
          };

          const [lead] = await db
            .insert(wholesaleLeads)
            .values(leadValues)
            .returning({ id: wholesaleLeads.id, status: wholesaleLeads.status });

          return { leadId: lead.id, status: lead.status };
        });
      },
    }),
  ];
}
