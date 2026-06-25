# TODO

## Flue cross-reference findings (support agent)

Cross-referenced `workers/support-agent` against the Flue framework docs and the
installed `@flue/runtime@1.0.0-beta.5` source on 2026-06-24. The agent uses Flue's
primitives correctly and the Cloudflare deployment wiring is idiomatic. Verified as
correct: `defineAgent`/`actions`/`defineTool`/`defineAction`, `dispatch(...)`, the
`<dispatch>` signal envelope claim, the `cloudflare/@cf/...` binding-backed Workers AI
provider (requires the `AI` binding, which is present), the `cloudflare.ts` default
export carrying only the non-HTTP `email()` handler, the `FlueRegistry` +
`FlueCoffeeSupportAgent` migration naming, deploying via the generated
`dist/.../wrangler.json`, and the private (no `route`) dispatch-only agent.

Open issues, ranked by severity:

- [x] **(High) Wholesale opt-in relies on Action session continuity that does not exist.** ✅ Fixed 2026-06-24.
  - Root cause confirmed: `handle-support-email.ts` prompted the model to "use the previous
    conversation in this session" inside `harness.session('email-handler')`, but Action child
    sessions are keyed per invocation, so each inbound email got a fresh, empty session that never
    saw the thread. The opt-in gate was therefore non-deterministic for ambiguous replies.
  - Fix implemented (TODO option 1 + structured signal):
    - New durable `wholesale_invitations` table keyed by `threadId` (`src/db/schema.ts`,
      migration `drizzle/migrations/0002_add_wholesale_invitations.sql`) tracks `pending` /
      `opted_in` / `declined` per thread.
    - `tools/wholesale.ts` adds `getWholesaleInvitation`, `markWholesaleInvitationPending`, and
      `resolveWholesaleInvitation` (upserts on the unique `thread_id` index, so they are
      idempotent across durable retries / redelivery).
    - The Action now reads the persisted state up front and passes an explicit, deterministic
      `wholesaleInvitationPending` flag into the prompt; the false "previous conversation in this
      session" language is removed.
    - The decision schema gained a required `wholesaleStatus` (`none|invited|opted_in|declined`)
      that drives persistence: `invited` writes a pending row, a captured lead resolves the thread
      to `opted_in` (with `leadId`), and `declined` resolves it. State-write failures are logged
      and never block the customer reply.
- [x] **(Medium) Unhandled `ResultUnavailableError` silently drops a customer email.** ✅ Fixed 2026-06-24.
  - The `session.prompt(..., { result: emailDecisionSchema })` call is now wrapped in a
    `try/catch` for `ResultUnavailableError`. On failure the Action requests a human escalation and
    sends a single generic "a human will follow up" holding reply, returning a valid output
    (`handled`, `replied`, `escalated`) instead of dropping the email.

## Support agent follow-ups

- [ ] Add idempotency for external side effects.
  - Track inbound support emails by `messageId` and/or raw email hash.
  - Prevent duplicate customer replies, escalation emails, and wholesale lead inserts across Flue durable retries/recovery.
  - Consider a `support_email_events` table with unique inbound key, `threadId`, reply status/message id, escalation status/message id, and wholesale lead id.
  - Flue's durable recovery is deliberately conservative and will NOT dedupe at-least-once Email
    Routing redelivery. `dispatchId` is logged in `cloudflare.ts` but never claimed; claim the inbound
    `messageId`/raw-email hash in app storage BEFORE `dispatch()`. In-Action `wholesaleState`/
    `escalationState` guards only protect within a single invocation, not across redeliveries.
- [ ] Decide demo/production behavior for support email feature flags.
  - Current defaults are safe but disabled: `SUPPORT_AGENT_ENABLED=false`, `SUPPORT_EMAIL_DRY_RUN=true`.
  - For a live demo, document required values or provide a separate demo environment config.
  - When disabled, consider forwarding inbound support mail to a human instead of silently dropping it.
- [ ] Improve structured logging and privacy.
  - Prefer JSON-stringified structured logs for Workers Observability searchability.
  - Avoid logging full email/reply bodies outside local dry-run debugging.
- [ ] Harden email threading.
  - Current thread id uses sender + normalized subject, which is demo-friendly but can merge unrelated threads.
  - Consider stable reply routing via `support+<threadId>@...`, custom headers, or stored `References`/`In-Reply-To` metadata.
  - Consistent with Flue's Resend-channel guidance ("define and persist any reply-grouping policy in
    application code"). Ties into the high-severity wholesale opt-in fix above.
- [ ] Polish Cloudflare runtime config before production.
  - Update `compatibility_date` periodically.
  - Add explicit observability log/tracing sampling if traffic grows.
  - If `SUPPORT_EMAIL_DRY_RUN=false`, fail fast when the `EMAIL` binding is unavailable instead of silently treating it as dry-run.
  - Bump the `agents` dependency floor from `^0.14.1` to `^0.14.2` to match the Flue Cloudflare deploy
    guide (resolved install is currently `0.14.5`, so no runtime impact yet).
  - Sync the README `wrangler.jsonc` snippet with the real config (it omits `placement.region:
    "aws:eu-central-1"`). Cosmetic doc drift.
