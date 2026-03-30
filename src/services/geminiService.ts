import { GoogleGenAI } from "@google/genai";
import { getGeminiSystemInstruction } from './geminiSystemInstruction';

/** Default Gemini model — keep in sync with DEFAULT_MODELS in aiService.ts */
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export function getSystemInstruction(mode: 'create' | 'edit' = 'create'): string {
  return getGeminiSystemInstruction(mode);
}

function processImage(imageBase64?: string): { mimeType: string; cleanBase64: string } {
  const regex = /^data:image\/([^;]+);base64,/;
  const match = imageBase64?.match(regex);
  const mimeType = match ? `image/${match[1]}` : 'image/png';
  const cleanBase64 = imageBase64?.replace(regex, '') || '';
  return { mimeType, cleanBase64 };
}

export async function generateDiagramFromChat(
  history: ChatMessage[],
  newMessage: string,
  currentDSL?: string,
  imageBase64?: string,
  userApiKey?: string,
  modelId?: string,
  isEditMode = false,
  onChunk?: (delta: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<string> {
  const apiKey = userApiKey;

  if (!apiKey) {
    throw new Error("API key is missing. Please add it in Settings → AI.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const userText = isEditMode && currentDSL
    ? `User Request: ${newMessage}\n\nCURRENT DIAGRAM — output the complete updated OpenFlow DSL:\n${currentDSL}`
    : `User Request: ${newMessage}\n\nGenerate a new OpenFlow DSL diagram.`;

  const newMessageContent = {
    role: 'user' as const,
    parts: [{ text: userText }] as { text?: string; inlineData?: { mimeType: string; data: string } }[]
  };

  if (imageBase64) {
    const { mimeType, cleanBase64 } = processImage(imageBase64);
    newMessageContent.parts.push({ inlineData: { data: cleanBase64, mimeType } });
  }

  const contents = [...history, newMessageContent];

  const stream = await ai.models.generateContentStream({
    model: modelId || GEMINI_DEFAULT_MODEL,
    contents,
    config: {
      systemInstruction: getGeminiSystemInstruction(isEditMode ? 'edit' : 'create'),
      responseMimeType: "text/plain",
      temperature: temperature ?? 0.2,
    },
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const delta = chunk.text ?? '';
    if (delta) {
      fullText += delta;
      onChunk?.(delta);
    }
  }

  if (!fullText) throw new Error("No response from AI");

  return fullText;
}

export async function generateDiagramFromPrompt(
  prompt: string,
  currentNodesJSON: string,
  focusedContextJSON?: string,
  imageBase64?: string,
  userApiKey?: string
): Promise<string> {
  const contextParts = [
    currentNodesJSON && `Current Diagram State (JSON): ${currentNodesJSON}`,
    focusedContextJSON && `Focused Context (Selected Nodes): ${focusedContextJSON}`,
  ].filter(Boolean).join('\n');

  return generateDiagramFromChat([], prompt, contextParts || undefined, imageBase64, userApiKey);
}

export async function chatWithDocsGemini(
  history: ChatMessage[],
  newMessage: string,
  docsContext: string,
  userApiKey: string,
  modelId?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: userApiKey });

  const systemInstruction = `
You are an expert support assistant for OpenFlowKit, a local-first node-based diagramming tool.
Your job is to answer user questions accurately based ONLY on the provided documentation.
Be helpful, concise, and use formatting (bold, code blocks) to make your answers easy to read.
If the answer is not in the documentation, politely inform the user that you don't know based on the current docs.

DOCUMENTATION REPOSITORY:
---
${docsContext}
---
`;

  const newMessageContent = {
    role: 'user' as const,
    parts: [{ text: newMessage }]
  };

  const contents = [...history, newMessageContent];

  const response = await ai.models.generateContent({
    model: modelId || GEMINI_DEFAULT_MODEL,
    contents,
    config: {
      systemInstruction,
    }
  });

  if (!response.text) throw new Error("No response from AI");

  return response.text;
}
