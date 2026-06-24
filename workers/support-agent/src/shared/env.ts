export type SupportAgentEnv = Partial<Cloudflare.Env> & {
  AGENT_DATABASE_URL?: string;
  DATABASE_URL?: string;
};

export function isEnabled(value: string | undefined, defaultValue = false) {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getSupportFromEmail(env: Pick<SupportAgentEnv, 'SUPPORT_FROM_EMAIL'>) {
  return env.SUPPORT_FROM_EMAIL || 'support@thecoffeecluster.com';
}

export function getSupportEscalationEmail(env: Pick<SupportAgentEnv, 'SUPPORT_ESCALATION_EMAIL' | 'SUPPORT_FROM_EMAIL'>) {
  return env.SUPPORT_ESCALATION_EMAIL || getSupportFromEmail(env);
}
