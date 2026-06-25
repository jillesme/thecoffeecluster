import { observe, type FlueObservation } from '@flue/runtime';
import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

function summarizeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return { name: error.name, message: error.message };
  if (typeof error === 'string') return { message: error };
  return { message: String(error) };
}

function baseEvent(event: FlueObservation) {
  return {
    type: event.type,
    agentName: event.agentName,
    instanceId: event.instanceId,
    dispatchId: event.dispatchId,
    submissionId: event.submissionId,
    session: event.session,
    harness: event.harness,
    operationId: event.operationId,
    turnId: event.turnId,
  };
}

observe((event) => {
  const base = baseEvent(event);

  switch (event.type) {
    case 'agent_start':
    case 'operation_start':
    case 'turn_start':
    case 'tool_start':
    case 'idle':
      console.log(
        JSON.stringify({
          message: 'flue event',
          ...base,
          operationKind: 'operationKind' in event ? event.operationKind : undefined,
          toolName: 'toolName' in event ? event.toolName : undefined,
          purpose: 'purpose' in event ? event.purpose : undefined,
        }),
      );
      break;

    case 'log':
      console[event.level](
        JSON.stringify({
          message: event.message,
          ...base,
          attributes: event.attributes,
        }),
      );
      break;

    case 'tool':
      console[event.isError ? 'error' : 'log'](
        JSON.stringify({
          message: 'flue tool completed',
          ...base,
          toolName: event.toolName,
          isError: event.isError,
          durationMs: event.durationMs,
          errorInfo: event.errorInfo,
        }),
      );
      break;

    case 'turn':
      console[event.isError ? 'error' : 'log'](
        JSON.stringify({
          message: 'flue turn completed',
          ...base,
          isError: event.isError,
          durationMs: event.durationMs,
          provider: event.request.providerId,
          model: event.request.requestedModel,
          finishReason: event.response.finishReason,
          error: event.response.error,
        }),
      );
      break;

    case 'operation':
      console[event.isError ? 'error' : 'log'](
        JSON.stringify({
          message: 'flue operation completed',
          ...base,
          operationKind: event.operationKind,
          isError: event.isError,
          durationMs: event.durationMs,
          error: summarizeError(event.error),
        }),
      );
      break;

    case 'submission_settled':
      console[event.outcome === 'failed' ? 'error' : 'log'](
        JSON.stringify({
          message: 'flue submission settled',
          ...base,
          outcome: event.outcome,
          error: event.error,
        }),
      );
      break;

    case 'agent_end':
      console.log(JSON.stringify({ message: 'flue agent ended', ...base }));
      break;
  }
});

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'the-coffee-cluster-support-agent' }));
app.route('/', flue());

export default app;
