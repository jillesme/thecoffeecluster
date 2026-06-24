# Support Agent Runbook

This Worker receives email for `support@thecoffeecluster.com`, dispatches each message into a Flue Durable Object-backed agent session, and sends a real email reply with Cloudflare Email Service.

The current demo flow is intentionally simple:

- First wholesale inquiry: reply that wholesale is not available yet and ask conversationally whether the sender wants to be notified.
- Follow-up opt-in in the same email thread: insert a confirmed row in `wholesale_leads` and confirm by email.
- Follow-up decline or ambiguous reply: do not insert a lead.

## Important implementation notes

- Inbound Email Routing calls `src/cloudflare.ts` via the Worker `email()` handler.
- `src/cloudflare.ts` parses the message, computes a stable demo thread id with `supportEmailThreadId`, and calls `dispatch(coffeeSupport, { id, input })`.
- Flue dispatches are shown to the model as a `<dispatch>` signal containing the JSON event, not as a raw user message. The agent instructions must explicitly tell the model to call `handle_support_email` for `type: "support.email.received"` dispatches.
- Actual customer replies are sent only by trusted application code in `handle_support_email` after the model returns a validated structured decision.
- `SUPPORT_EMAIL_DRY_RUN=false` sends real email. Keep it `true` in local/dev unless you intend to send.
- Idempotency for duplicate inbound messages is not implemented yet. Avoid replaying the same message in production-like tests unless duplicate replies/leads are acceptable.

## Prerequisites

From the repository root:

```bash
pnpm install
```

Cloudflare-side prerequisites:

1. Email Service / Email Routing is enabled for `thecoffeecluster.com`.
2. Email Sending is onboarded for `thecoffeecluster.com` so the Worker can send from `support@thecoffeecluster.com`.
3. Hyperdrive config `d3a2db789ace440eb99d93e8d7fb88c9` points at the app database.
4. The Worker has an AI binding named `AI`.

Check account/auth if needed:

```bash
pnpm exec wrangler whoami
```

## Local environment

Create `workers/support-agent/.dev.vars` for local Flue/Wrangler work. Do not commit real values.

```dotenv
SUPPORT_FROM_EMAIL=support@thecoffeecluster.com
SUPPORT_ESCALATION_EMAIL=support@thecoffeecluster.com
SUPPORT_EMAIL_DRY_RUN=true
SUPPORT_AGENT_ENABLED=true

# Required by Wrangler/Hyperdrive local emulation when using the HYPERDRIVE binding.
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require

# Optional fallback for non-Hyperdrive local scripts.
AGENT_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
```

For local safety, keep `SUPPORT_EMAIL_DRY_RUN=true`. Dry-run mode logs the reply instead of sending it, but database writes can still happen if `create_wholesale_lead` runs.

## Wrangler config checklist

`wrangler.jsonc` should include:

```jsonc
{
  "name": "the-coffee-cluster-support-agent",
  "compatibility_date": "2026-06-24",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "logs": { "head_sampling_rate": 1 }
  },
  "ai": { "binding": "AI" },
  "send_email": [
    {
      "name": "EMAIL",
      "remote": true,
      "allowed_sender_addresses": ["support@thecoffeecluster.com"]
    }
  ],
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "d3a2db789ace440eb99d93e8d7fb88c9"
    }
  ],
  "vars": {
    "SUPPORT_FROM_EMAIL": "support@thecoffeecluster.com",
    "SUPPORT_ESCALATION_EMAIL": "support@thecoffeecluster.com",
    "SUPPORT_EMAIL_DRY_RUN": "false",
    "SUPPORT_AGENT_ENABLED": "true"
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["FlueRegistry", "FlueCoffeeSupportAgent"]
    }
  ]
}
```

For a live demo, the important production vars are:

- `SUPPORT_AGENT_ENABLED=true`
- `SUPPORT_EMAIL_DRY_RUN=false`

## Type generation, checks, and build

Run these from `workers/support-agent`:

```bash
pnpm cf-typegen
pnpm typecheck
pnpm build
```

Notes:

- Use `pnpm run deploy`, not `pnpm deploy`. `pnpm deploy` is a pnpm command and will fail with `ERR_PNPM_NOTHING_TO_DEPLOY`.
- `pnpm build` runs `flue build --target cloudflare` and writes the deployable Worker to `dist/the_coffee_cluster_support_agent`.

## Deploy

From `workers/support-agent`:

```bash
pnpm run deploy
```

The script runs:

```bash
flue build --target cloudflare && wrangler deploy --config dist/the_coffee_cluster_support_agent/wrangler.json
```

After deploy, confirm the output shows these bindings:

- `env.FLUE_COFFEE_SUPPORT_AGENT` Durable Object
- `env.FLUE_REGISTRY` Durable Object
- `env.EMAIL` Send Email
- `env.HYPERDRIVE` Hyperdrive Config
- `env.AI` AI
- `SUPPORT_EMAIL_DRY_RUN ("false")`
- `SUPPORT_AGENT_ENABLED ("true")`

## Email Routing setup

Check Email Routing status:

```bash
pnpm exec wrangler email routing settings thecoffeecluster.com
```

List existing rules:

```bash
pnpm exec wrangler email routing rules list thecoffeecluster.com
```

Create the routing rule that sends `support@thecoffeecluster.com` to this Worker:

```bash
pnpm exec wrangler email routing rules create thecoffeecluster.com \
  --name "Support agent" \
  --match-type literal \
  --match-field to \
  --match-value support@thecoffeecluster.com \
  --action-type worker \
  --action-value the-coffee-cluster-support-agent \
  --priority 1
```

Verify it:

```bash
pnpm exec wrangler email routing rules list thecoffeecluster.com
```

Expected rule shape:

```text
Name:     Support agent
Enabled:  true
Matchers: to:support@thecoffeecluster.com
Actions:  worker:the-coffee-cluster-support-agent
Priority: 1
```

If the rule already exists, do not create duplicates. Use `wrangler email routing rules get`, `update`, or `delete` as needed:

```bash
pnpm exec wrangler email routing rules --help
```

## Live testing with tail

Start logs:

```bash
pnpm exec wrangler tail the-coffee-cluster-support-agent --format pretty
```

Do not pass `--sampling-rate 1`; Wrangler rejects it. Omit the flag, or use a value less than `1`.

Send a first email from a non-support address:

```text
To: support@thecoffeecluster.com
Subject: Wholesale coffee test

Yoo,

I'd love to buy some beans wholesale. Do you offer special pricing?
```

Expected logs:

- `[support-agent] email dispatched`
- `flue event` / `operation_start`
- `toolName: "handle_support_email"`
- `Handling support email`
- `support reply send attempt`
- `support reply sent`
- `Support email handled` with no `wholesaleLeadId`

Expected customer reply:

- Explains wholesale is not available yet.
- Asks naturally whether the sender wants to be notified.
- Does not say “please reply yes or no”.
- Does not add a wholesale lead yet.

Then reply in the same thread:

```text
Yes, I'd like to be notified.
```

Expected logs:

- Same `sessionId` as the first email.
- `toolName: "create_wholesale_lead"`
- `Support email handled` with `wholesaleLeadId`.
- `support reply sent`.

Expected customer reply:

- Confirms they are on the notification list.

## Troubleshooting

### Inbound email dispatches but no reply

Look for whether `handle_support_email` was called.

- If you only see `[support-agent] email dispatched` and no `toolName: "handle_support_email"`, the model likely did not interpret the dispatched event. Ensure `coffee-support.instructions.md` says dispatched inputs arrive as a `<dispatch>` signal and that `support.email.received` dispatches must call `handle_support_email`.
- If `handle_support_email` runs but there is no `support reply send attempt`, inspect Flue operation/tool errors in tail.

### Email sends, then `Action output is not JSON-serializable`

Flue action outputs must be plain JSON. Do not return object properties with `undefined` values. Omit optional fields instead.

### `support reply send failed`

Check:

- `SUPPORT_EMAIL_DRY_RUN=false` only when you intend to send.
- The deployed Worker has the `EMAIL` binding.
- `support@thecoffeecluster.com` is allowed by `allowed_sender_addresses`.
- Email Sending is onboarded for `thecoffeecluster.com`.

### Hyperdrive/local database errors

For local Cloudflare-target runs, Wrangler needs:

```dotenv
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://...
```

Production uses the `HYPERDRIVE` binding configured in `wrangler.jsonc`.

### Duplicate replies or duplicate leads

This is a known TODO. Add idempotency before production by tracking inbound `messageId` and side-effect status in a table such as `support_email_events`.

## Current known gaps

See the repository-level `TODO.md`. The major production hardening items are:

- Idempotency for inbound email side effects.
- Clear demo/production behavior for feature flags.
- More privacy-conscious structured logging.
- Stronger threading than sender + normalized subject.
- Cloudflare runtime config polish as traffic grows.
