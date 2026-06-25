import { defineAction, ResultUnavailableError, type PromptResultResponse } from '@flue/runtime';
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
import {
  createWholesaleLead,
  createWholesaleLeadTool,
  getWholesaleInvitation,
  markWholesaleInvitationPending,
  resolveWholesaleInvitation,
  wholesaleLeadInputSchema,
} from '../tools/wholesale';

const FALLBACK_REPLY_TEXT =
  'Thanks for reaching out to The Coffee Cluster. We have received your message and a member of our team will follow up with you personally shortly.';

export const handleSupportEmailInputSchema = v.object({
  from: emailAddressSchema,
  to: emailAddressSchema,
  subject: subjectSchema,
  text: messageTextSchema,
  html: optionalHtmlBodySchema,
  messageId: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500))),
  threadId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
});

const wholesaleStatusSchema = v.pipe(
  v.picklist(['none', 'invited', 'opted_in', 'declined']),
  v.description(
    'Wholesale outcome of this email: "none" if unrelated to wholesale, "invited" if the reply asks (or re-asks) the customer to opt in, "opted_in" if the customer accepted a pending invitation, "declined" if the customer declined.',
  ),
);

const emailDecisionSchema = v.object({
  reply: supportReplyInputSchema,
  wholesaleStatus: wholesaleStatusSchema,
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

/**
 * Action that fully handles one inbound support email: answers catalog/inventory
 * questions, runs the wholesale opt-in flow, escalates when needed, and sends
 * exactly one validated reply.
 *
 * Design note on the wholesale opt-in flow:
 *   The opt-in is a two-email handshake (invite -> accept/decline), but each
 *   inbound email is a separate `dispatch()` and each Action invocation gets a
 *   fresh, isolated child session. The Action therefore has NO conversational
 *   memory of the earlier invitation, so we cannot ask the model to "remember"
 *   whether the customer was already invited.
 *
 *   Instead we treat the `wholesale_invitations` table (keyed by `threadId`) as
 *   the source of truth: we read the prior state before prompting, pass it to the
 *   model as an explicit `wholesaleInvitationPending` flag, and the model reports
 *   back a `wholesaleStatus` that we persist. The upserts are keyed on the unique
 *   `thread_id` index, which also makes the side effects idempotent across Flue
 *   durable retries and at-least-once Email Routing redelivery.
 */
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

      // Action child sessions are isolated per invocation, so the agent has no
      // conversational memory of an earlier wholesale opt-in invitation. Read the
      // durable, per-thread invitation state and pass it in as an explicit,
      // deterministic flag instead of relying on session continuity that does not
      // exist.
      const existingInvitation = await getWholesaleInvitation(env, input.threadId);
      const wholesaleInvitationPending = existingInvitation?.status === 'pending';

      log.info('Wholesale invitation state loaded', {
        threadId: input.threadId,
        wholesaleInvitationPending,
        previousStatus: existingInvitation?.status,
      });

      const session = await harness.session('email-handler');

      const reply = async (replyInput: v.InferInput<typeof supportReplyInputSchema>) =>
        sendSupportReply(
          env,
          {
            toEmail: input.from,
            fromEmail: getSupportFromEmail(env),
            originalSubject: input.subject,
            originalMessageId: input.messageId,
          },
          replyInput,
        );

      let decision: PromptResultResponse<v.InferOutput<typeof emailDecisionSchema>>;
      try {
        decision = await session.prompt(
          `Process this inbound support email for The Coffee Cluster.

Use catalog and inventory tools for all coffee facts.

Wholesale workflow:
- The Coffee Cluster does not currently offer wholesale ordering.
- This Action has NO memory of earlier emails. The trusted "wholesaleInvitationPending" flag below is the only authoritative signal of whether this thread already has an outstanding wholesale opt-in invitation. Do not guess from wording alone.
- When wholesaleInvitationPending is false and this is a first wholesale, bulk, cafe, office, restaurant, or recurring high-volume inquiry: do not call create_wholesale_lead and do not include wholesaleLead. Reply naturally that wholesale is not available yet, ask whether they would like to be notified when that changes, and set wholesaleStatus to "invited".
- When wholesaleInvitationPending is true, treat this email as the customer's reply to that earlier invitation:
  - If they clearly accept (for example "yes", "sure", "ok", "please do", "sounds good"): call create_wholesale_lead with only customer-provided details, include the same wholesaleLead object in your final structured result, set wholesaleStatus to "opted_in", and confirm they are on the short notification list.
  - If they clearly decline: do not call create_wholesale_lead, set wholesaleStatus to "declined", and acknowledge politely.
  - If the reply is genuinely ambiguous: do not call create_wholesale_lead, set wholesaleStatus to "invited" so the invitation stays open, and ask a brief natural clarification.
- When the email is not about wholesale at all, set wholesaleStatus to "none" and do not include wholesaleLead.
- Keep the opt-in question human and conversational. Do not say "please reply yes or no" and do not use the phrase "yes or no".
- Do not promise pricing, discounts, launch dates, supply levels, contracts, or availability.

If it needs human escalation, use request_human_escalation and include the same escalation object in your final structured result.

Do not call handle_support_email from inside this Action. Do not send the customer reply yourself; trusted application code will send exactly one final reply after your structured result is validated.

Thread wholesale state:
${JSON.stringify({ wholesaleInvitationPending, previousStatus: existingInvitation?.status ?? null }, null, 2)}

Inbound email JSON:
${JSON.stringify(input, null, 2)}

Return a structured result with:
- reply: the final customer reply subject and plain text body; use "${replySubjectFor(input.subject)}" unless a clearer reply subject is needed.
- wholesaleStatus: one of "none", "invited", "opted_in", "declined" per the workflow above.
- wholesaleLead: include only when wholesaleStatus is "opted_in".
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
      } catch (error) {
        if (!(error instanceof ResultUnavailableError)) throw error;

        // The model could not produce a schema-valid decision. Do NOT silently
        // drop the customer: escalate to a human and send a generic holding reply
        // so exactly one reply still goes out.
        log.error('Support decision unavailable; falling back to escalation', {
          threadId: input.threadId,
          reason: error.reason,
        });

        let fallbackEscalated = Boolean(escalationState.requested);
        if (!fallbackEscalated) {
          const escalation = await requestHumanEscalation(env, inboundContext, {
            reason: 'Support agent could not produce a structured decision for this email.',
            urgency: 'normal',
            summary: `Automated handling failed (${error.reason}). Assistant text: ${error.assistantText || '(none)'}`,
          });
          Object.assign(escalationState, escalation);
          fallbackEscalated = true;
        }

        const fallbackReply = await reply({
          subject: replySubjectFor(input.subject),
          text: FALLBACK_REPLY_TEXT,
        });

        const fallbackOutput: v.InferOutput<typeof handleSupportEmailOutputSchema> = {
          handled: true,
          replied: true,
          escalated: fallbackEscalated,
          summary: 'Automated decision unavailable; escalated to a human and sent a holding reply.',
        };
        if (fallbackReply.messageId !== undefined) fallbackOutput.replyMessageId = fallbackReply.messageId;
        return fallbackOutput;
      }

      let wholesaleLeadId = wholesaleState.leadId;
      if (!wholesaleLeadId && decision.data.wholesaleLead) {
        const lead = await createWholesaleLead(env, inboundContext, decision.data.wholesaleLead);
        wholesaleLeadId = lead.leadId;
        log.info('Wholesale lead captured by action fallback', { wholesaleLeadId, threadId: input.threadId });
      }

      // Persist the per-thread wholesale opt-in state so future emails in this
      // thread are gated deterministically (and idempotently) without relying on
      // conversational memory.
      const wholesaleStatus = decision.data.wholesaleStatus;
      try {
        if (wholesaleLeadId !== undefined) {
          await resolveWholesaleInvitation(env, {
            threadId: input.threadId,
            email: input.from,
            status: 'opted_in',
            leadId: wholesaleLeadId,
          });
        } else if (wholesaleStatus === 'invited') {
          await markWholesaleInvitationPending(env, {
            threadId: input.threadId,
            email: input.from,
            summary: decision.data.summary,
          });
        } else if (wholesaleStatus === 'declined') {
          await resolveWholesaleInvitation(env, {
            threadId: input.threadId,
            email: input.from,
            status: 'declined',
          });
        }
      } catch (error) {
        // Persisting thread state must never block the customer reply; log and continue.
        log.error('Failed to persist wholesale invitation state', {
          threadId: input.threadId,
          wholesaleStatus,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let escalated = Boolean(escalationState.requested);
      if (!escalated && decision.data.escalation) {
        const escalation = await requestHumanEscalation(env, inboundContext, decision.data.escalation);
        Object.assign(escalationState, escalation);
        escalated = true;
        log.info('Human escalation requested by action fallback', { threadId: input.threadId, sent: escalation.sent });
      }

      const sentReply = await reply(decision.data.reply);

      log.info('Support email handled', {
        threadId: input.threadId,
        replied: true,
        escalated,
        wholesaleLeadId,
        wholesaleStatus,
        dryRun: sentReply.dryRun,
      });

      const output: v.InferOutput<typeof handleSupportEmailOutputSchema> = {
        handled: true,
        replied: true,
        escalated,
        summary: decision.data.summary,
      };

      if (wholesaleLeadId !== undefined) output.wholesaleLeadId = wholesaleLeadId;
      if (sentReply.messageId !== undefined) output.replyMessageId = sentReply.messageId;

      return output;
    },
  });
}
