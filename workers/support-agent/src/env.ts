export interface SupportAgentEnv {
  HYPERDRIVE?: { connectionString: string };
  AGENT_DATABASE_URL?: string;
  DATABASE_URL?: string;
  EMAIL?: SendEmail;
  SUPPORT_FROM_EMAIL: string;
  SUPPORT_ESCALATION_EMAIL: string;
  SUPPORT_EMAIL_DRY_RUN?: string;
  SUPPORT_AGENT_ENABLED?: string;
}

export function isEnabled(value: string | undefined, defaultValue = false) {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
