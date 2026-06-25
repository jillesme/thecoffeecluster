import PostalMime from 'postal-mime';

export interface ParsedSupportEmail {
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
}

const MAX_TEXT_CHARS = 12_000;
const MAX_HTML_CHARS = 50_000;

function truncate(value: string, maxChars: number) {
  return value.length > maxChars ? `${value.slice(0, maxChars)}\n\n[Message truncated]` : value;
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
    text: truncate(text, MAX_TEXT_CHARS),
    html: parsed.html ? truncate(parsed.html.trim(), MAX_HTML_CHARS) : undefined,
    messageId: parsed.messageId,
  };
}
