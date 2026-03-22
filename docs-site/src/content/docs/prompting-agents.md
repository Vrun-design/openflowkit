---
draft: false
title: Prompting AI Agents
description: Write better prompts for coding assistants and AI systems when you want diagram output for OpenFlowKit.
---

If you use Cursor, Copilot, ChatGPT, Claude, or any other coding agent to help author diagrams, the prompt quality matters more than the model brand.

## What to ask for

Ask the agent for one of these outputs explicitly:

- OpenFlow DSL
- Mermaid
- a diagram plan before code

Do not ask for "a diagram" and hope it guesses the right syntax.

## Good prompt structure

Include all of the following:

- diagram purpose
- intended audience
- required systems or actors
- important branches or failure paths
- preferred direction (`TB` or `LR`)
- preferred syntax (`OpenFlow DSL` or `Mermaid`)

## Example prompt for OpenFlow DSL

```text
Generate OpenFlow DSL for OpenFlowKit.
Make a left-to-right payment recovery workflow.
Include invoice due, charge attempt, success decision,
retry sequence, manual review, customer notification,
and terminal success/failure nodes.
Use explicit node ids and label every branch edge.
```

## Example prompt for Mermaid

```text
Generate Mermaid flowchart code for a SaaS onboarding diagram.
Use LR layout.
Include signup, email verification, workspace provisioning,
billing activation, support fallback, and success.
Keep labels concise and production-ready.
```

## What to avoid

Avoid prompts that:

- mix multiple diagram families at once
- ask for visual styling and architecture semantics in the same sentence
- omit failure cases
- omit the target syntax

## Best workflow with agents

1. generate first draft in text
2. paste into Studio
3. apply to canvas
4. fix structure and styling visually
5. export in the format your team needs

The secret to perfect AI generation is our `llms.txt` file. We host a machine-readable set of rules that teaches any AI exactly how to write OpenFlow DSL V2 code.

When prompting an AI agent, just include a reference to this file.

### Example Prompt for Cursor IDE
Open your Composer or Chat window and type:

> `"Read https://openflowkit.com/llms.txt and then generate an architecture diagram showing our Next.js frontend connecting to a Supabase backend."`

### Example Prompt for ChatGPT
If you are using ChatGPT with web-browsing enabled:

> `"Go to https://openflowkit.com/llms.txt to learn the OpenFlowKit syntax. Then, write a flowchart detailing an OAuth2 login sequence. Output the result using the \`\`\`openflow code block."`

## Best Practices for Prompting

Even with the rules, LLMs can sometimes get confused. Here are three tips for perfect diagrams every time:

1. **Be specific about shapes**: Instead of just saying "add a database", say "add a Node with the `[process]` type labeled 'Database'". 
2. **Name your connections**: The diagram is much more useful if edges have labels. Example: "Connect the frontend to the backend with the label '|REST API|'".
3. **Use Groups for clarity**: If you have multiple microservices, tell the AI to wrap them in a group: "Put the 'Auth Service' and 'User DB' inside a group called 'Backend Infrastructure'."

[Return to Editor](/#/canvas)
