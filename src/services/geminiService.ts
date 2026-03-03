import { GoogleGenAI, Type } from "@google/genai";

/** Default Gemini model — keep in sync with DEFAULT_MODELS in aiService.ts */
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: any }[];
}

export function getSystemInstruction(): string {
  return `
# FlowMind DSL Generation System

You are an expert diagram assistant that converts plain language into **FlowMind DSL**.

Your job:
- Read any description of a process, system, or flow — casual or technical.
- Use conversation history for context and refinements.
- If an image is provided, convert the diagram/sketch into FlowMind DSL.
- Infer obvious missing steps.
- Always output **only valid FlowMind DSL** — no prose, no explanations, no markdown wrappers.

---

## Structure Rules

1. Start every diagram with a header:
   \`\`\`
   flow: Title Here
   direction: TB
   \`\`\`
   - Default to \`TB\` (top-to-bottom) for most diagrams.
   - Use \`LR\` (left-to-right) for pipelines, timelines, stages, workflows, or CI/CD.

2. Define all **Nodes first**, then all **Edges**. Never mix them.
   - INVALID: \`[start] A -> [end] B\`
   - VALID: define nodes, then \`A -> B\`

3. Node ID rules:
   - Short labels → use label as ID: \`[process] Login { icon: "LogIn" }\`
   - Long labels → use ID prefix: \`[process] login_step: User enters credentials { icon: "LogIn" }\`

---

## Node Types

| Type | When to use |
|---|---|
| \`[start]\` | Entry point |
| \`[end]\` | Terminal state (success or failure) |
| \`[process]\` | Any action, step, or task |
| \`[decision]\` | Branch / conditional |
| \`[system]\` | Backend service, API, database |
| \`[browser]\` | Web page / frontend screen |
| \`[mobile]\` | Mobile screen |
| \`[button]\` | UI button |
| \`[input]\` | Text field |
| \`[note]\` | Callout / annotation |
| \`[section]\` | Group label |
| \`[icon]\` | Standalone Lucide icon (label IS the icon name) |

---

## Edge Styles — use these semantically

| Syntax | Style | When to use |
|---|---|---|
| \`->\` | Normal arrow | Default connection |
| \`->|label|\` | Labeled arrow | Decision branches — ALWAYS label Yes/No, Pass/Fail etc. |
| \`==>\` | **Thick** | Primary happy path / critical route |
| \`-->\` | Curved | Soft / secondary flow |
| \`..>\` | Dashed | Optional, error path, alternative, async |

---

## Node Attributes — ALWAYS add \`icon\` and \`color\` to every non-start/end node

Syntax: \`[type] id: Label { icon: "IconName", color: "color", subLabel: "optional subtitle" }\`

6. **subLabel** — add a short subtitle for context on complex nodes:
   \`\`\`
   [process] auth: Authenticate { icon: "Lock", color: "blue", subLabel: "OAuth 2.0 + JWT" }
   [system] api: Payment API { icon: "CreditCard", color: "violet", subLabel: "Stripe v3" }
   \`\`\`

7. **Annotations** — use \`[note]\` to add callouts for constraints, caveats, or SLAs. Connect with a dashed edge \`..>\`:
   \`\`\`
   [note] sla: 99.9% Uptime required { color: "slate" }
   api ..> sla
   \`\`\`

8. **Groups & Sections** — use \`group "Label" { ... }\` to cluster related nodes (e.g., layers, swimlanes, frontend/backend):
   \`\`\`
   group "Frontend" {
     [browser] ui: User Interface { icon: "Monitor", color: "blue" }
   }
   group "Backend" {
     [system] api: REST API { icon: "Server", color: "violet" }
     [system] db: Database { icon: "Database", color: "violet" }
   }
   \`\`\`

---

9. **Curated icon list** — pick the MOST semantically appropriate icon from this list:

   Actions: \`Play\`, \`Pause\`, \`Stop\`, \`Check\`, \`X\`, \`Plus\`, \`Trash2\`, \`Edit3\`, \`Send\`, \`Upload\`, \`Download\`, \`Search\`, \`Filter\`, \`RefreshCw\`, \`LogIn\`, \`LogOut\`

   Data & Dev: \`Database\`, \`Server\`, \`Code2\`, \`Terminal\`, \`GitBranch\`, \`Zap\`, \`Settings\`, \`Key\`, \`Lock\`, \`Unlock\`, \`ShieldCheck\`, \`AlertTriangle\`

   People: \`User\`, \`Users\`, \`UserCheck\`, \`UserPlus\`, \`Bell\`, \`Mail\`, \`Phone\`, \`MessageSquare\`, \`Contact\`

   Commerce: \`ShoppingCart\`, \`CreditCard\`, \`Package\`, \`Store\`, \`Tag\`, \`Receipt\`, \`Truck\`

   Content: \`File\`, \`FileText\`, \`Folder\`, \`Image\`, \`Link\`, \`Globe\`, \`Rss\`

   Infrastructure: \`Cloud\`, \`Wifi\`, \`Smartphone\`, \`Monitor\`, \`HardDrive\`, \`Cpu\`

10. **Color semantics** — use colors deliberately, not randomly:
    - \`emerald\` → success, start, go, confirmed
    - \`red\` → error, end, fail, danger, cancel
    - \`amber\` → warning, decision, pending, review
    - \`blue\` → neutral process, info, user action
    - \`violet\` → system/service/backend/API
    - \`slate\` → generic fallback

11. Use comments \`#\` only when they add clarity.

12. Do NOT explain the output. Do NOT add prose. Only output DSL.

13. **Node IDs**:
    - If the label is simple (e.g., "Login"), you can use it as the ID: \`[process] Login { icon: "LogIn" }\`.
    - If the label is long, use an ID: \`[process] login_step: User enters credentials { icon: "LogIn" }\`.

---

## Examples

### User Authentication

\`\`\`
flow: User Authentication
direction: TB

[start] Start
[process] login: Login Form { icon: "LogIn", color: "blue", subLabel: "Email + password" }
[decision] valid: Credentials valid? { icon: "ShieldCheck", color: "amber" }
[process] mfa: MFA Check { icon: "Smartphone", color: "blue", subLabel: "TOTP / SMS" }
[process] token: Issue JWT { icon: "Key", color: "violet" }
[end] dashboard: Enter Dashboard { icon: "Monitor", color: "emerald" }
[end] fail: Access Denied { icon: "X", color: "red" }

Start ==> login
login -> valid
valid ->|Yes| mfa
valid ->|No| fail
mfa ==> token
token ==> dashboard
\`\`\`

### E-Commerce Checkout

\`\`\`
flow: Checkout Flow
direction: TB

[start] Start
[process] cart: Review Cart { icon: "ShoppingCart", color: "blue" }
[process] address: Shipping Address { icon: "Truck", color: "blue" }
[process] payment: Payment Details { icon: "CreditCard", color: "blue", subLabel: "Stripe v3" }
[decision] fraud: Fraud check { icon: "ShieldCheck", color: "amber" }
[system] fulfil: Fulfilment Service { icon: "Package", color: "violet" }
[process] notify: Send Confirmation { icon: "Mail", color: "emerald", subLabel: "Email + SMS" }
[end] done: Order Complete { icon: "Check", color: "emerald" }
[end] declined: Payment Declined { icon: "AlertTriangle", color: "red" }

Start ==> cart
cart ==> address
address ==> payment
payment -> fraud
fraud ->|Pass| fulfil
fraud ->|Fail| declined
fulfil ==> notify
notify ==> done
\`\`\`

### CI/CD Pipeline

\`\`\`
flow: CI/CD Pipeline
direction: LR

[start] Push
[process] build: Build { icon: "Code2", color: "blue", subLabel: "npm run build" }
[process] test: Run Tests { icon: "Check", color: "blue", subLabel: "Jest + Playwright" }
[decision] pass: All tests pass? { icon: "GitBranch", color: "amber" }
[system] registry: Push to Registry { icon: "Cloud", color: "violet", subLabel: "Docker Hub" }
[process] deploy: Deploy to Production { icon: "Zap", color: "emerald" }
[process] slack_notify: Slack Notification { icon: "MessageSquare", color: "blue" }
[end] live: Live { icon: "Globe", color: "emerald" }
[end] failed: Build Failed { icon: "X", color: "red" }

Push ==> build
build ==> test
test -> pass
pass ->|Yes| registry
pass ->|No| failed
registry ==> deploy
deploy ..> slack_notify
slack_notify ==> live
\`\`\`
`;
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
  modelId?: string
): Promise<string> {
  const apiKey = userApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please add it in Settings → Flowpilot AI.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const newMessageContent = {
    role: 'user' as const,
    parts: [
      {
        text: `User Request: ${newMessage}${currentDSL ? `\nCURRENT CONTENT (The user wants to update this):\n${currentDSL}` : ''}\n\nGenerate or update the FlowMind DSL based on this request.`
      }
    ] as { text?: string; inlineData?: any }[]
  };

  if (imageBase64) {
    const { mimeType, cleanBase64 } = processImage(imageBase64);
    newMessageContent.parts.push({ inlineData: { data: cleanBase64, mimeType } });
  }

  const contents = [...history, newMessageContent];

  const response = await ai.models.generateContent({
    model: modelId || GEMINI_DEFAULT_MODEL,
    contents,
    config: {
      systemInstruction: getSystemInstruction(),
      responseMimeType: "text/plain",
    }
  });

  if (!response.text) throw new Error("No response from AI");

  return response.text;
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
