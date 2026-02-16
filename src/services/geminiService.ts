import { GoogleGenAI, Type } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: any }[];
}

const getSystemInstruction = () => `
# FlowMind DSL Conversion Prompt

You are an assistant that converts plain human language into **FlowMind DSL**.

Your job:
- Read any messy, casual, incomplete, or informal description of a flow.
- If a history of conversation is provided, use it to understand the context and potential refinements requested by the user.
- If an image is provided, analyze the flowchart, diagram, or sketch in the image and convert it into FlowMind DSL.
- Infer missing steps when they are obvious.
- Convert everything into valid **FlowMind DSL syntax**.
- Keep node labels short, clear, and human-readable.
- Use correct node types wherever possible.
- If unsure about a node type, default to \`[process]\`.
- Always output **only FlowMind DSL**, nothing else.

## Rules You Must Follow

1. Always start with a document header:
   - Include \`flow\`
   - Include \`direction\` (default to \`TB\` unless user implies horizontal)

2. Supported node types:
   - \`[start]\`
   - \`[end]\`
   - \`[process]\`
   - \`[decision]\`
   - \`[system]\`
   - \`[note]\`
   - \`[section]\`
   - \`[browser]\` (for web pages)
   - \`[mobile]\` (for mobile apps)
   - \`[button]\` (for UI buttons)
   - \`[input]\` (for text fields)
   - \`[icon]\` (Lucide icon name)
   - \`[image]\` (image placeholder)

3. Connections:
   - Use \`->\` for connections
   - Use \`->|label|\` for decision paths

4. If a node is referenced but not defined, treat it as \`[process]\`.

5. Use comments \`#\` only when they add clarity.

6. Do NOT explain the output. Do NOT add prose. Only output DSL.
`;

const processImage = (imageBase64?: string) => {
  const regex = /^data:image\/(\w+);base64,/;
  const match = imageBase64?.match(regex);
  const mimeType = match ? `image/${match[1]}` : 'image/png';
  const cleanBase64 = imageBase64?.replace(regex, '') || '';
  return { mimeType, cleanBase64 };
};

export const generateDiagramFromChat = async (
  history: ChatMessage[],
  newMessage: string,
  currentDSL?: string,
  imageBase64?: string,
  userApiKey?: string // [NEW] Optional user key
): Promise<string> => {
  const apiKey = userApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please add it in Settings > Brand > AI or set API_KEY env var.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct the new message part
  const newMessageContent: { role: 'user' | 'model'; parts: { text?: string; inlineData?: any }[] } = {
    role: 'user',
    parts: [
      {
        text: `
        User Request: ${newMessage}
        ${currentDSL ? `\nCURRENT CONTENT (The user wants to update this):\n${currentDSL}` : ''}
        
        Generate or update the FlowMind DSL based on this request.
        `
      }
    ]
  };

  if (imageBase64) {
    const { mimeType, cleanBase64 } = processImage(imageBase64);
    newMessageContent.parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType
      }
    });
  }

  // Combine history with the new message
  // Map internal ChatMessage to the SDK's expected format if needed
  const contents = [
    ...history.map(h => ({
      role: h.role,
      parts: h.parts
    })),
    newMessageContent
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: contents,
    config: {
      systemInstruction: getSystemInstruction(),
      responseMimeType: "text/plain",
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return response.text;
};

export const generateDiagramFromPrompt = async (
  prompt: string,
  currentNodesJSON: string,
  focusedContextJSON?: string,
  imageBase64?: string,
  userApiKey?: string
): Promise<string> => {
  // Wrapper using the chat function for a single turn

  // Construct the "Current State" context string similar to the old prompt
  let contextString = "";
  if (currentNodesJSON) contextString += `Current Diagram State (JSON): ${currentNodesJSON}\n`;
  if (focusedContextJSON) contextString += `Focused Context (Selected Nodes): ${focusedContextJSON}`;

  return generateDiagramFromChat([], prompt, contextString, imageBase64, userApiKey);
};