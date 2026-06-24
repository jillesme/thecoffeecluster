import { dispatch } from '@flue/runtime';
import coffeeSupport from './agents/coffee-support';
import { isEnabled, type SupportAgentEnv } from '../src/env';
import { parseSupportEmail } from '../src/email/parse';
import { supportEmailThreadId } from '../src/email/thread-key';

const cloudflareHandlers = {
  async email(message: ForwardableEmailMessage, env: SupportAgentEnv, ctx: ExecutionContext): Promise<void> {
    const enabled = isEnabled(env.SUPPORT_AGENT_ENABLED, false);
    const parsed = await parseSupportEmail(message.raw);
    const sessionId = await supportEmailThreadId({ from: message.from, subject: parsed.subject, messageId: parsed.messageId });

    if (!enabled) {
      console.log('[support-agent] email received while disabled', {
        from: message.from,
        to: message.to,
        subject: parsed.subject,
        sessionId,
      });
      return;
    }

    ctx.waitUntil(
      dispatch(coffeeSupport, {
        id: sessionId,
        input: {
          type: 'support.email.received',
          from: message.from,
          to: message.to,
          subject: parsed.subject,
          text: parsed.text,
          html: parsed.html,
          messageId: parsed.messageId,
        },
      }).then((receipt) => {
        console.log('[support-agent] email dispatched', { sessionId, dispatchId: receipt.dispatchId });
      }),
    );
  },
};

export default cloudflareHandlers;
