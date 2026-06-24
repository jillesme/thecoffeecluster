import { defineAction } from '@flue/runtime';
import * as v from 'valibot';
import { getSupportFromEmail, type SupportAgentEnv } from '../shared/env';
import {
  emailAddressSchema,
  messageTextSchema,
  optionalHtmlBodySchema,
  positiveIntegerSchema,
  subjectSchema,
  summarySchema,
} from '../shared/schemas';
import { createHumanEscalationTool, humanEscalationInputSchema, requestHumanEscalation } from '../tools/escalation';
import { replySubjectFor, sendSupportReply, supportReplyInputSchema } from '../tools/email';
import { createWholesaleLead, createWholesaleLeadTool, wholesaleLeadInputSchema } from '../tools/wholesale';

export const handleSupportEmailInputSchema = v.object({
  from: emailAddressSchema,
  to: emailAddressSchema,
  subject: subjectSchema,
  text: messageTextSchema,
  html: optionalHtmlBodySchema,
  messageId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500))),
  threadId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
});

const emailDecisionSchema = v.object({
  reply: supportReplyInputSchema,
  wholesaleLead: v.optional(wholesaleLeadInputSchema),
  escalation: v.optional(humanEscalationInputSchema),
  summary: summarySchema,
});

export const handleSupportEmailOutputSchema = v.object({
  handled: v.boolean(),
  replied: v.boolean(),
  escalated: v.boolean(),
  wholesaleLeadId: v.optional(positiveIntegerSchema),
  replyMessageId: v.optional(v.string()),
  summary: summarySchema,
});

export function createHandleSupportEmailAction(env: SupportAgentEnv) {
  return defineAction({
    name: 'handle_support_email',
    description:
      'Reliably handle one inbound support email: answer catalog/inventory questions, ask for wholesale opt-in before capturing leads, request human escalation when needed, and send exactly one final reply.',
    input: handleSupportEmailInputSchema,
    output: handleSupportEmailOutputSchema,
    async run({ harness, input, log }) {
      log.info('Handling support email', {
        from: input.from,
        to: input.to,
        subject: input.subject,
        threadId: input.threadId,
        messageId: input.messageId,
      });

      const wholesaleState: { leadId?: number; status?: string } = {};
      const escalationState: { requested?: boolean; sent?: boolean; dryRun?: boolean; messageId?: string } = {};

      const inboundContext = {
        customerEmail: input.from,
        originalSubject: input.subject,
        originalMessage: input.text,
        originalMessageId: input.messageId,
      };

      const session = await harness.session('email-handler');
      const decision = await session.prompt(
        `Process this inbound support email for The Coffee Cluster.

Use catalog and inventory tools for all coffee facts.

Wholesale workflow:
- The Coffee Cluster does not currently offer wholesale ordering.
- This session is durable for the email thread, so use the previous conversation in this session to decide whether the customer is replying to an earlier wholesale opt-in invitation.
- For a first wholesale, bulk, cafe, office, restaurant, or recurring high-volume inquiry, do not call create_wholesale_lead and do not include wholesaleLead. Reply naturally that wholesale is not available yet, and ask whether they would like to be notified when that changes.
- Keep the opt-in question human and conversational. Do not say "please reply yes or no" and do not use the phrase "yes or no".
- If this email clearly accepts a previous opt-in invitation in this same thread, use create_wholesale_lead with only customer-provided details and include the same wholesaleLead object in your final structured result. Then confirm they are on the short notification list.
- If the customer declines or does not clearly opt in, do not call create_wholesale_lead and do not include wholesaleLead. For ambiguous replies, ask a brief natural clarification.
- Do not promise pricing, discounts, launch dates, supply levels, contracts, or availability.

If it needs human escalation, use request_human_escalation and include the same escalation object in your final structured result.

Do not call handle_support_email from inside this Action. Do not send the customer reply yourself; trusted application code will send exactly one final reply after your structured result is validated.

Inbound email JSON:
${JSON.stringify(input, null, 2)}

Return a structured result with:
- reply: the final customer reply subject and plain text body; use "${replySubjectFor(input.subject)}" unless a clearer reply subject is needed.
- wholesaleLead: include only when the customer clearly opted in to be notified after a previous wholesale invitation in this thread.
- escalation: include only when a human escalation should be requested.
- summary: concise internal summary of the handled email.`,
        {
          tools: [
            createWholesaleLeadTool(env, inboundContext, wholesaleState),
            createHumanEscalationTool(env, inboundContext, escalationState),
          ],
          result: emailDecisionSchema,
        },
      );

      let wholesaleLeadId = wholesaleState.leadId;
      if (!wholesaleLeadId && decision.data.wholesaleLead) {
        const lead = await createWholesaleLead(env, inboundContext, decision.data.wholesaleLead);
        wholesaleLeadId = lead.leadId;
        log.info('Wholesale lead captured by action fallback', { wholesaleLeadId, threadId: input.threadId });
      }

      let escalated = Boolean(escalationState.requested);
      if (!escalated && decision.data.escalation) {
        const escalation = await requestHumanEscalation(env, inboundContext, decision.data.escalation);
        Object.assign(escalationState, escalation);
        escalated = true;
        log.info('Human escalation requested by action fallback', { threadId: input.threadId, sent: escalation.sent });
      }

      const reply = await sendSupportReply(
        env,
        {
          toEmail: input.from,
          fromEmail: getSupportFromEmail(env),
          originalSubject: input.subject,
          originalMessageId: input.messageId,
        },
        decision.data.reply,
      );

      log.info('Support email handled', {
        threadId: input.threadId,
        replied: true,
        escalated,
        wholesaleLeadId,
        dryRun: reply.dryRun,
      });

      const output: v.InferOutput<typeof handleSupportEmailOutputSchema> = {
        handled: true,
        replied: true,
        escalated,
        summary: decision.data.summary,
      };

      if (wholesaleLeadId !== undefined) output.wholesaleLeadId = wholesaleLeadId;
      if (reply.messageId !== undefined) output.replyMessageId = reply.messageId;

      return output;
    },
  });
}
