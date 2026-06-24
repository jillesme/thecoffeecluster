import PostalMime from 'postal-mime';

export interface ParsedSupportEmail {
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
}

export async function parseSupportEmail(raw: ReadableStream<Uint8Array>): Promise<ParsedSupportEmail> {
  const buffer = await new Response(raw).arrayBuffer();
  const parsed = await PostalMime.parse(buffer);

  const subject = parsed.subject || '(no subject)';
  const text =
    parsed.text?.trim() ||
    parsed.html
      ?.replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    '(empty message)';

  return {
    subject,
    text,
    html: parsed.html,
    messageId: parsed.messageId,
  };
}
