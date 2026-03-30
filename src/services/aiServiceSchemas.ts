import { z } from 'zod';

const openAICompatibleResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.unknown().optional(),
        })
        .optional(),
    })
  ),
});

const claudeResponseSchema = z.object({
  content: z.array(
    z.object({
      text: z.unknown().optional(),
    })
  ),
});

const openAIDeltaSchema = z.object({
  choices: z.array(
    z.object({
      delta: z
        .object({
          content: z.string().optional(),
        })
        .optional(),
    })
  ),
});

const claudeDeltaSchema = z.object({
  type: z.string().optional(),
  delta: z
    .object({
      type: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
});

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function getOpenAICompatibleContent(data: unknown): string | undefined {
  const parsed = openAICompatibleResponseSchema.safeParse(data);
  if (!parsed.success) {
    return undefined;
  }

  const content = parsed.data.choices[0]?.message?.content;
  return typeof content === 'string' ? content : undefined;
}

export function getClaudeContent(data: unknown): string | undefined {
  const parsed = claudeResponseSchema.safeParse(data);
  if (!parsed.success) {
    return undefined;
  }

  const content = parsed.data.content[0]?.text;
  return typeof content === 'string' ? content : undefined;
}

export function parseOpenAIStreamDelta(data: string): string | undefined {
  const parsed = openAIDeltaSchema.safeParse(parseJsonSafely(data));
  if (!parsed.success) {
    return undefined;
  }

  return parsed.data.choices[0]?.delta?.content;
}

export function parseClaudeStreamDelta(data: string): string | undefined {
  const parsed = claudeDeltaSchema.safeParse(parseJsonSafely(data));
  if (!parsed.success) {
    return undefined;
  }

  if (
    parsed.data.type === 'content_block_delta' &&
    parsed.data.delta?.type === 'text_delta'
  ) {
    return parsed.data.delta.text;
  }

  return undefined;
}
