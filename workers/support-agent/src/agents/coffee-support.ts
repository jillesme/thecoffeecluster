import { defineAgent } from '@flue/runtime';
import { createHandleSupportEmailAction } from '../actions/handle-support-email';
import type { SupportAgentEnv } from '../shared/env';
import { createCatalogTools } from '../tools/catalog';
import instructions from './coffee-support.instructions.md' with { type: 'markdown' };

export const description = 'Email support agent for The Coffee Cluster catalog, inventory, and wholesale triage.';

// No `route` export: direct HTTP prompts remain private. Trusted Email Routing
// ingress dispatches support.email.received events from src/cloudflare.ts.

export default defineAgent<SupportAgentEnv>(({ env }) => ({
  description,
  model: 'cloudflare/@cf/moonshotai/kimi-k2.6',
  instructions,
  tools: createCatalogTools(env),
  actions: [createHandleSupportEmailAction(env)],
}));
