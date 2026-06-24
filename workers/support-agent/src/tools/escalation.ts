import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { getSupportEscalationEmail, getSupportFromEmail, isEnabled, type SupportAgentEnv } from '../shared/env';
import { shortTextSchema, summarySchema } from '../shared/schemas';

const urgencySchema = v.pipe(
  v.picklist(['low', 'normal', 'high']),
  v.description('Use high only for urgent safety, legal, payment, or highly upset customer cases.'),
);

export interface HumanEscalationContext {
  customerEmail: string;
  originalSubject: string;
  originalMessage: string;
  originalMessageId?: string;
}

export interface HumanEscalationState {
  requested?: boolean;
  sent?: boolean;
  dryRun?: boolean;
  messageId?: string;
}

export const humanEscalationInputSchema = v.object({
  reason: v.pipe(shortTextSchema, v.description('Specific policy or support reason for escalation.')),
  urgency: urgencySchema,
  summary: v.pipe(summarySchema, v.description('Concise human-readable summary for the support team.')),
});

export const humanEscalationOutputSchema = v.object({
  requested: v.boolean(),
  sent: v.boolean(),
  dryRun: v.boolean(),
  messageId: v.optional(v.string()),
});

export type HumanEscalationInput = v.InferOutput<typeof humanEscalationInputSchema>;
export type HumanEscalationOutput = v.InferOutput<typeof humanEscalationOutputSchema>;

function cleanSubject(subject: string) {
  return subject.replace(/[\r\n]+/g, ' ').trim() || '(no subject)';
}

export async function requestHumanEscalation(
  env: SupportAgentEnv,
  context: HumanEscalationContext,
  input: HumanEscalationInput,
): Promise<HumanEscalationOutput> {
  const dryRun = isEnabled(env.SUPPORT_EMAIL_DRY_RUN, true);
  const from = getSupportFromEmail(env);
  const to = getSupportEscalationEmail(env);
  const subject = cleanSubject(context.originalSubject);
  const text = `Support escalation requested\n\nUrgency: ${input.urgency}\nReason: ${input.reason}\nCustomer: ${context.customerEmail}\nSubject: ${subject}\n\nSummary:\n${input.summary}\n\nOriginal message:\n${context.originalMessage}`;

  if (dryRun || !env.EMAIL) {
    console.log('[support-agent] dry-run escalation', { to, from, subject, text });
    return { requested: true, sent: false, dryRun: true };
  }

  const result = await env.EMAIL.send({
    to,
    from: { email: from, name: 'The Coffee Cluster Support Agent' },
    subject: `[Support escalation:${input.urgency}] ${subject}`,
    text,
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Coffee-Cluster-Agent': 'support-agent',
      ...(context.originalMessageId
        ? {
            'In-Reply-To': context.originalMessageId,
            References: context.originalMessageId,
          }
        : {}),
    },
  });

  return { requested: true, sent: true, dryRun: false, messageId: result.messageId };
}

export function createHumanEscalationTool(
  env: SupportAgentEnv,
  context: HumanEscalationContext,
  state?: HumanEscalationState,
) {
  return defineTool({
    name: 'request_human_escalation',
    description:
      'Escalate the current inbound email to a human for refunds, order-specific issues, payment questions, legal/privacy requests, allergy/medical safety claims, angry customers, abusive content, or uncertain cases. Destination and customer context are bound by trusted application code.',
    input: humanEscalationInputSchema,
    output: humanEscalationOutputSchema,
    async run({ input, signal }) {
      signal?.throwIfAborted();
      if (state?.requested) {
        throw new Error('Human escalation was already requested for this inbound email');
      }

      const result = await requestHumanEscalation(env, context, input);
      if (state) Object.assign(state, result);
      return result;
    },
  });
}
