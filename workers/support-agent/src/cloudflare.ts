import { dispatch } from '@flue/runtime';
import coffeeSupport from './agents/coffee-support';
import { parseSupportEmail } from './email/parse';
import { supportEmailThreadId } from './email/thread-key';
import { getSupportFromEmail, isEnabled, type SupportAgentEnv } from './shared/env';

const MAX_RAW_EMAIL_BYTES = 256_000;

function isAutomatedEmail(message: ForwardableEmailMessage, env: SupportAgentEnv) {
  const autoSubmitted = message.headers.get('auto-submitted')?.toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return true;

  return message.from.toLowerCase() === getSupportFromEmail(env).toLowerCase();
}

const cloudflareHandlers = {
  async email(message: ForwardableEmailMessage, env: SupportAgentEnv): Promise<void> {
    const enabled = isEnabled(env.SUPPORT_AGENT_ENABLED, false);

    if (message.rawSize > MAX_RAW_EMAIL_BYTES) {
      console.warn('[support-agent] rejecting oversized email', {
        from: message.from,
        to: message.to,
        rawSize: message.rawSize,
        maxRawSize: MAX_RAW_EMAIL_BYTES,
      });
      message.setReject('Message exceeds support agent size limit');
      return;
    }

    if (isAutomatedEmail(message, env)) {
      console.log('[support-agent] ignoring automated or self-sent email', {
        from: message.from,
        to: message.to,
        autoSubmitted: message.headers.get('auto-submitted'),
      });
      return;
    }

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

    try {
      const receipt = await dispatch(coffeeSupport, {
        id: sessionId,
        input: {
          type: 'support.email.received',
          from: message.from,
          to: message.to,
          subject: parsed.subject,
          text: parsed.text,
          html: parsed.html,
          messageId: parsed.messageId,
          threadId: sessionId,
        },
      });
      console.log('[support-agent] email dispatched', { sessionId, dispatchId: receipt.dispatchId });
    } catch (error) {
      console.error('[support-agent] email dispatch failed', { sessionId, error });
      message.setReject('Support agent could not accept this message');
      throw error;
    }
  },
} satisfies ExportedHandler<SupportAgentEnv>;

export default cloudflareHandlers;
