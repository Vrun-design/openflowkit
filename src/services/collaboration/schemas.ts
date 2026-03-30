import { z } from 'zod';

const localCollaborationIdentitySchema = z.object({
  name: z.string(),
  color: z.string(),
});

export function parseLocalCollaborationIdentity(value: unknown): {
  name: string;
  color: string;
} | null {
  const parsed = localCollaborationIdentitySchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }

  return {
    name: parsed.data.name,
    color: parsed.data.color,
  };
}

export function parseLocalCollaborationIdentityJson(
  serialized: string
): { name: string; color: string } | null {
  try {
    return parseLocalCollaborationIdentity(JSON.parse(serialized));
  } catch {
    return null;
  }
}
