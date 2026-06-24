import * as v from 'valibot';
import { getSupportFromEmail, isEnabled, type SupportAgentEnv } from '../shared/env';
import { optionalHtmlBodySchema, subjectSchema, messageTextSchema } from '../shared/schemas';

export interface SupportReplyContext {
  toEmail: string;
  fromEmail?: string;
  originalSubject: string;
  originalMessageId?: string;
}

export const supportReplyInputSchema = v.object({
  subject: subjectSchema,
  text: v.pipe(messageTextSchema, v.description('Plain-text customer reply body.')),
  html: optionalHtmlBodySchema,
});

export const supportReplyOutputSchema = v.object({
  sent: v.boolean(),
  dryRun: v.boolean(),
  messageId: v.optional(v.string()),
});

export type SupportReplyInput = v.InferOutput<typeof supportReplyInputSchema>;
export type SupportReplyOutput = v.InferOutput<typeof supportReplyOutputSchema>;

function cleanSubject(subject: string) {
  return subject.replace(/[\r\n]+/g, ' ').trim();
}

function summarizeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { message: String(error) };
}

export function replySubjectFor(originalSubject: string) {
  const subject = cleanSubject(originalSubject || '(no subject)');
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export async function sendSupportReply(
  env: SupportAgentEnv,
  context: SupportReplyContext,
  input: SupportReplyInput,
): Promise<SupportReplyOutput> {
  const dryRun = isEnabled(env.SUPPORT_EMAIL_DRY_RUN, true);
  const from = context.fromEmail || getSupportFromEmail(env);
  const subject = cleanSubject(input.subject || replySubjectFor(context.originalSubject));

  if (dryRun) {
    console.log('[support-agent] dry-run reply', {
      to: context.toEmail,
      from,
      subject,
      text: input.text,
    });
    return { sent: false, dryRun: true };
  }

  if (!env.EMAIL) {
    throw new Error('SUPPORT_EMAIL_DRY_RUN=false but EMAIL binding is unavailable');
  }

  console.log(
    JSON.stringify({
      message: 'support reply send attempt',
      to: context.toEmail,
      from,
      subject,
      hasHtml: Boolean(input.html),
      inReplyTo: context.originalMessageId,
    }),
  );

  let result: Awaited<ReturnType<SendEmail['send']>>;
  try {
    result = await env.EMAIL.send({
      to: context.toEmail,
      from: { email: from, name: 'The Coffee Cluster Support' },
      subject,
      text: input.text,
      html: input.html,
      headers: {
        'Auto-Submitted': 'auto-replied',
        'X-Coffee-Cluster-Agent': 'support-agent',
        ...(context.originalMessageId
          ? {
              'In-Reply-To': context.originalMessageId,
              References: context.originalMessageId,
            }
          : {}),
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: 'support reply send failed',
        to: context.toEmail,
        from,
        subject,
        error: summarizeError(error),
      }),
    );
    throw error;
  }

  console.log(
    JSON.stringify({
      message: 'support reply sent',
      to: context.toEmail,
      from,
      subject,
      messageId: result.messageId,
    }),
  );

  return { sent: true, dryRun: false, messageId: result.messageId };
}
