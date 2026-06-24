import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { withSupportClient } from '../db';
import type { SupportAgentEnv } from '../env';

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
        return withSupportClient(env, async (client) => {
          const result = await client.query<{ id: number; status: string }>(
            `
              insert into wholesale_leads
                (email, name, company_name, location, estimated_volume, original_message, agent_summary, status)
              values ($1, $2, $3, $4, $5, $6, $7, 'new')
              returning id, status
            `,
            [
              input.email,
              input.name ?? null,
              input.companyName ?? null,
              input.location ?? null,
              input.estimatedVolume ?? null,
              input.originalMessage,
              input.agentSummary,
            ],
          );

          const lead = result.rows[0];
          return { leadId: Number(lead.id), status: lead.status };
        });
      },
    }),
  ];
}
