---
title: AI generation
description: Bring your own key — talk through a diagram, let the assistant draft changes, review them, apply as one undo step.
---

OpenFlowKit's assistant turns a prompt into a diagram without a hosted service in between: your
browser calls the provider you configured, directly, with your key. The provider's answer is
compiled by the same DSL compiler as everything else, then shown for review.

## Set up a provider

Press `⌘J` for the assistant panel and open its provider dialog. Pick a provider and paste a
key. The model field suggests that provider's current models and accepts any id; the base URL
sits under **Endpoint**. **Test key** asks the provider for one short response.

Each provider keeps its own key, marked with a dot on its tile, so switching providers never
sends one vendor's key to another; **Clear all keys** removes every one. Keys are stored in this
browser's `localStorage` and sent only to the provider they were entered for. There is no OpenFlowKit account and no relay: if the request fails, the error names the
cause and the next step. See [Troubleshooting](#troubleshooting).

## Talk, review, or change

The assistant is a conversation. Ask a question, ask for a critique, or describe a change — it
answers in text when that is what you asked for, and only drafts diagram changes when you want
them. Each message carries what is in scope:

- **This page** — every diagram on the current page;
- **Selection** — only the diagrams holding your selection (picked automatically when you have
  one; the chip under the prompt switches back).

The assistant can look things up before it acts: read a diagram in full, check a family's
syntax, and search the icon packs for real icon ids. Each lookup shows as a step above the
reply. Drafts are compiled as they are written; a draft that does not compile goes back to the
model to fix before you ever see it. Providers or local models without tool support get the
same assistant without the lookups.

Attach images with the photo button, by pasting, or by dropping them on the prompt — a
whiteboard photo, a screenshot, a sketch to redraw. Up to four per message; they are
downscaled before they are sent. The model you pick must accept images.

**Think** asks the model to reason first (Claude, Gemini, and OpenAI-wire models that share
their reasoning); the reasoning shows as a collapsible "Thought for …" line.

## Review, then apply

Changes arrive as a **proposal** under the reply: one row per diagram, each accepted or
rejected on its own, with **Apply** landing everything accepted as a single undo step. Hover a
row to find its diagram on the canvas. A proposal built against a document that changed while
you were reviewing is marked stale — retry the message for a fresh one.

## Chats

Chats are kept in this browser, per document. **New chat** starts fresh and keeps the old one
under **Chat history**, where you can reopen or delete it. Edit a sent message (or press ↑ in an
empty prompt) to ask again; **Retry**, **Copy**, and **Report on GitHub** sit under each reply.
The report opens a prefilled issue with the prompt, reply and model — never your key.

## What it cannot do

- **No provider list here on purpose.** The catalogue lives in the panel; the providers,
  endpoints and wire formats change independently of this page.
- **No server-side AI.** No OpenFlowKit proxy, key escrow or usage metering.
- **No direct edits.** Every change goes through the proposal; nothing lands until you apply it.
- **No sync.** Chats stay in this browser; images in older chats may be dropped to fit its
  storage.

## Troubleshooting

The error under a failed message names one cause. What to do for each:

| Message starts with | Do this |
| --- | --- |
| The provider rejected the key | Paste a fresh key from the provider's console; check it has credit. |
| The provider did not find the model | Fix the model id, or clear it to use the default. For Ollama, `ollama pull <model>` first. |
| Rate limiting | Wait a minute, or switch key or provider. |
| Nothing answered at … | The service is not running or the base URL is wrong. Start it, check the address. |
| … does not accept browser calls (CORS) | That provider blocks browsers. Use Gemini or OpenRouter, or your own endpoint as **Custom**. |
| Our page's security policy blocked … | Endpoints must be `https://` or `localhost`. |

### Ollama

Ollama runs on your machine, so the browser needs two things: Ollama running, and Ollama
allowing this page's origin.

1. Install it from [ollama.com/download](https://ollama.com/download) and pull a model:
   `ollama pull gemma4`.
2. **Quit the Ollama menu-bar or tray app.** It owns port 11434 and ignores the variable below,
   so a second `ollama serve` fails silently and the old, locked-down one keeps answering.
3. Start it with the origin allowed — the exact origin is in the error message:

   ```sh
   OLLAMA_ORIGINS='https://your-openflowkit-origin' ollama serve
   ```

   `OLLAMA_ORIGINS='*'` works too, and lets any site you visit use your local models.
   To keep the menu-bar app instead on macOS, run
   `launchctl setenv OLLAMA_ORIGINS '*'`, then quit and reopen the app.
4. If Chrome asks to let the page access devices on your local network, allow it. Brave's
   shields and Safari may block `localhost` from an `https://` page — use Chrome, or run
   OpenFlowKit locally.
5. Press **Test key** in the provider dialog.

Check Ollama itself with `curl http://localhost:11434/api/version`; no answer means step 2 or 3
did not take.

## Where to go next

- [MCP Server](/mcp-server/) — the other agent path, driven by your own MCP client.
- [OpenFlow DSL](/openflow-dsl/) — what the model is asked to write.
