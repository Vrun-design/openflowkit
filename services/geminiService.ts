import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedFlowData } from '../types';

export const generateDiagramFromPrompt = async (
  prompt: string,
  currentNodesJSON: string,
  focusedContextJSON?: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
# FlowMind DSL Conversion Prompt

You are an assistant that converts plain human language into **FlowMind DSL**.

Your job:
- Read any messy, casual, incomplete, or informal description of a flow.
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

  const fullPrompt = `
    User Request: ${prompt}
    ${currentNodesJSON ? `Current Diagram State (JSON): ${currentNodesJSON}` : ''}
    ${focusedContextJSON ? `Focused Context (Selected Nodes): ${focusedContextJSON}` : ''}
    
    Generate the FlowMind DSL for this flow.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: fullPrompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "text/plain",
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return response.text;
};