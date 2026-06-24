import * as v from 'valibot';

export const emailAddressSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.maxLength(320),
  v.description('A single email address controlled by trusted inbound context.'),
);

export const subjectSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.regex(/^[^\r\n]+$/, 'Subject must not contain line breaks.'),
  v.maxLength(240),
  v.description('A concise email subject without line breaks.'),
);

export const shortTextSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500));
export const summarySchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2000));
export const messageTextSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(12000));
export const htmlBodySchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(50000));

export const positiveIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(1));
export const nonNegativeIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
export const limitSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(10),
  v.description('Maximum number of records to return, from 1 to 10.'),
);

export const optionalShortTextSchema = v.optional(shortTextSchema);
export const optionalHtmlBodySchema = v.optional(htmlBodySchema);
