import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { isEnabled, type SupportAgentEnv } from '../env';

export function createEscalationTools(env: SupportAgentEnv) {
  return [
    defineTool({
      name: 'request_human_escalation',
      description:
        'Escalate to a human for refunds, order-specific issues, payment questions, legal/privacy requests, allergy/medical safety claims, angry customers, or uncertain cases.',
      input: v.object({
        customerEmail: v.string(),
        subject: v.string(),
        reason: v.string(),
        urgency: v.picklist(['low', 'normal', 'high']),
        summary: v.string(),
        originalMessage: v.string(),
      }),
      output: v.object({ escalated: v.boolean(), dryRun: v.boolean() }),
      async run({ input }) {
        const dryRun = isEnabled(env.SUPPORT_EMAIL_DRY_RUN, true);
        const from = env.SUPPORT_FROM_EMAIL || 'support@thecoffeecluster.com';
        const to = env.SUPPORT_ESCALATION_EMAIL || from;
        const text = `Support escalation requested\n\nUrgency: ${input.urgency}\nReason: ${input.reason}\nCustomer: ${input.customerEmail}\nSubject: ${input.subject}\n\nSummary:\n${input.summary}\n\nOriginal message:\n${input.originalMessage}`;

        if (dryRun || !env.EMAIL) {
          console.log('[support-agent] dry-run escalation', { to, from, subject: input.subject, text });
          return { escalated: false, dryRun: true };
        }

        await env.EMAIL.send({
          to,
          from: { email: from, name: 'The Coffee Cluster Support Agent' },
          subject: `[Support escalation:${input.urgency}] ${input.subject}`,
          text,
        });

        return { escalated: true, dryRun: false };
      },
    }),
  ];
}
