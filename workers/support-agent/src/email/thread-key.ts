function normalizeSubject(subject: string) {
  return subject.toLowerCase().replace(/^(re|fw|fwd):\s*/i, '').replace(/\s+/g, ' ').trim();
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function supportEmailThreadId(input: { from: string; subject: string; messageId?: string }) {
  // Sender+normalized subject keeps simple follow-up demos in one durable agent
  // session even when Email Routing does not provide enough References context.
  // Message-ID stays available to downstream idempotency logic but is not part of
  // the continuing agent id because each reply normally has a new Message-ID.
  const stable = `${input.from.toLowerCase()}|${normalizeSubject(input.subject)}`;
  return `email-${await sha256(stable)}`;
}
