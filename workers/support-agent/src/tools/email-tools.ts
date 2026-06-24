import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { isEnabled, type SupportAgentEnv } from '../env';

export function createEmailTools(env: SupportAgentEnv) {
  return [
    defineTool({
      name: 'send_support_reply',
      description:
        'Send the final customer support reply. Use this exactly once when you have enough information or after escalating. Include both a concise text body and an email subject.',
      input: v.object({
        toEmail: v.pipe(v.string(), v.description('The inbound customer email address to reply to.')),
        subject: v.string(),
        text: v.string(),
        html: v.optional(v.string()),
      }),
      output: v.object({ sent: v.boolean(), dryRun: v.boolean(), messageId: v.optional(v.string()) }),
      async run({ input }) {
        const dryRun = isEnabled(env.SUPPORT_EMAIL_DRY_RUN, true);
        const from = env.SUPPORT_FROM_EMAIL || 'support@thecoffeecluster.com';

        if (dryRun || !env.EMAIL) {
          console.log('[support-agent] dry-run reply', {
            to: input.toEmail,
            from,
            subject: input.subject,
            text: input.text,
          });
          return { sent: false, dryRun: true };
        }

        const result = await env.EMAIL.send({
          to: input.toEmail,
          from: { email: from, name: 'The Coffee Cluster Support' },
          subject: input.subject,
          text: input.text,
          html: input.html,
        });

        return { sent: true, dryRun: false, messageId: result.messageId };
      },
    }),
  ];
}
