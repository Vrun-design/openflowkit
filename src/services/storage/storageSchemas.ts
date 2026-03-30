import { z } from 'zod';
import type { ChatMessage } from '@/services/geminiService';
import { parsePersistedAISettingsJson } from '@/store/aiSettingsSchemas';

type ParsedLegacyChatMessage = {
  role: ChatMessage['role'];
  parts: ChatMessage['parts'];
};

type ChatMessagePart = ChatMessage['parts'][number];

const chatMessagePartSchema = z.object({
  text: z.string().optional(),
  inlineData: z
    .object({
      mimeType: z.string(),
      data: z.string(),
    })
    .optional(),
});

const legacyChatMessagePartSchema = z.union([
  z.string().transform((text) => ({ text })),
  chatMessagePartSchema,
]);

const persistedLegacyChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(legacyChatMessagePartSchema).transform((parts) =>
    parts.filter((part) => typeof part !== 'string')
  ),
});

function toChatMessagePart(part: z.infer<typeof chatMessagePartSchema>): ChatMessagePart {
  return {
    text: part.text,
    inlineData: part.inlineData
      ? {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        }
      : undefined,
  };
}

export { parsePersistedAISettingsJson as parsePersistentAISettingsJson };

export function parseLegacyChatMessagesJson(
  serialized: string | null
): ParsedLegacyChatMessage[] {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized);
    const result = z.array(persistedLegacyChatMessageSchema).safeParse(parsed);
    if (!result.success) {
      return [];
    }

    return result.data.map((message): ParsedLegacyChatMessage => ({
      role: message.role,
      parts: message.parts.map(toChatMessagePart),
    }));
  } catch {
    return [];
  }
}
