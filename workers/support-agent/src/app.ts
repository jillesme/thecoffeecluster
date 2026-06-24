import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'the-coffee-cluster-support-agent' }));
app.route('/', flue());

export default app;
