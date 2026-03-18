---
draft: false
title: AI Generation
---

OpenFlowKit ships with AI-assisted diagram generation through the Studio rail. Internally this flow composes a graph, lays it out, applies it to the current canvas, and keeps the exchange history in the local session.

## Where AI lives in the product

AI is available in the Studio panel under the **AI** tab and through the **Open FlowPilot** command in the Command Center.

The current hook path:

1. captures your prompt and optional image
2. sends it using your configured provider settings
3. receives DSL-like graph output
4. composes nodes and edges
5. applies layout
6. replaces the current working graph

## Provider model

The app supports multiple BYOK providers, including:

- Gemini
- OpenAI
- Claude
- Groq
- NVIDIA
- Cerebras
- Mistral
- OpenRouter
- Custom OpenAI-compatible endpoint

Default models are defined in the app config, but you can choose from provider-specific lists in Settings.

## Important operational detail

Your API configuration is stored locally in browser state. OpenFlowKit does not require an application account to use the editor.

Some providers are more browser-friendly than others. In the codebase, provider risk is explicitly categorized, so for certain providers a proxy setup may still be the more reliable production choice.

## Prompting patterns that work well

Use prompts that specify:

- the diagram goal
- actors or systems
- decision points
- important branches
- desired layout direction if it matters
- the diagram family if it matters

Example:

```text
Create a left-to-right architecture diagram for a SaaS product with:
Cloudflare edge, API gateway, auth service, product service, Postgres,
Redis, background worker, S3-compatible object storage, and observability.
Show user traffic, internal service calls, and async jobs.
```

## Iteration workflow

The fastest loop is usually:

1. generate a first draft with AI
2. clean structure with auto layout
3. refine labels and edge semantics in Properties
4. switch to OpenFlow DSL or Mermaid for exact textual edits

## What AI changes and what it does not

AI is good at:

- initial graph creation
- rough decomposition
- generating branch logic
- filling in missing surrounding steps

AI is weaker at:

- strict provider-specific architecture semantics
- exact naming conventions
- pixel-level visual composition
- preserving a very specific existing diagram unless you guide it tightly

## Best practices

- keep prompts concrete
- ask for one diagram family at a time
- include failure paths explicitly
- avoid mixing product requirements and visual polish in the same prompt
- use a follow-up pass for naming, grouping, and export cleanup

## Related reading

- [Prompting AI Agents](/prompting-agents/)
- [OpenFlow DSL](/openflow-dsl/)
- [Mermaid Integration](/mermaid-integration/)
2.  **Structural Generation**: It constructs a valid FlowMind DSL JSON object representing the nodes and connections.
3.  **Layout Optimization**: The engine applies smart layout algorithms to ensure the generated graph is readable.

## Best Practices for Prompts

To get the best results, be specific about the **steps** and the **outcome**.

### ❌ Too Vague
> "Make a system diagram."

### ✅ Good
> "Create a high-level system architecture for an e-commerce platform. Include a Web App, API Gateway, User Service, Product Service, and a shared PostgreSQL database."

### ✅ Better (Process Flow)
> "Draw a flowchart for a user password reset process. Start with 'User clicks forgot password', check if email exists. If yes, send distinct token. If no, show error. End with 'User enters new password'."

## Editing AI Results

AI generation is a starting point, not the end. You can always:
*   Add missing steps manaully.
*   Renaming nodes for clarity.
*   Regenerating specific sections (Coming Soon).

## 🔑 Bring Your Own Key (BYOK)

By default, FlowMind uses a shared API key with limited quotas. For heavy usage, privacy, or to use your own billing, you can bring your own **Gemini API Key**.

1.  Go to **Google AI Studio** and [Get an API Key](https://aistudio.google.com/app/apikey).
2.  In FlowMind, open **Settings** (Gear Icon) or click on any **Brand Kit**.
3.  Navigate to the **AI** tab.
4.  Paste your key into the secure input field.

> [!NOTE]
> Your key is stored locally in your browser's `localStorage` and is never sent to our servers. It is strictly used for client-side API calls to Google.
