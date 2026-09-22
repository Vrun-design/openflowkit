---
draft: false
title: Settings & Preferences
description: Configure OpenFlowKit to match your workflow — AI providers, canvas behavior, and keyboard shortcuts.
---

OpenFlowKit offers customizable settings across three areas: Canvas preferences, AI configuration, and Keyboard shortcuts.

## Accessing Settings

Click the **Settings** option from the home screen navigation, or press `Cmd+,` (Mac) / `Ctrl+,` (Windows) when inside an editor to open the Settings modal.

## Canvas Settings

The Canvas tab controls how the editor behaves:

- **Snap to Grid**: Toggle whether nodes snap to a grid when moved
- **Snap to Objects**: Toggle whether nodes snap to other nodes and edges
- **Auto-fit View**: Choose whether the canvas automatically fits content on load
- **Minimap**: Toggle the minimap visibility in the bottom corner
- **Connection Line**: Choose between smoothstep, straight, or bezier connection lines

These preferences persist across sessions and apply to all diagrams.

## AI Settings

The AI tab configures how Flowpilot generates diagrams.

### Supported Providers

Ten providers ship. Each shows a risk badge for browser calls, because some providers only accept server-to-server requests:

| Provider | Default model | Browser calls |
| --- | --- | --- |
| Gemini | `gemini-2.5-flash-lite` | Browser-ready |
| OpenAI | `gpt-5-mini` | Depends on endpoint |
| Claude | `claude-sonnet-4-6` | Depends on endpoint |
| Groq | `openai/gpt-oss-120b` | Proxy likely |
| NVIDIA | `meta/llama-4-maverick-17b-128e-instruct` | Proxy likely |
| Cerebras | `gpt-oss-120b` | Depends on endpoint |
| Mistral | `mistral-large-latest` | Depends on endpoint |
| OpenRouter | `google/gemini-2.5-pro` | Browser-ready |
| Ollama (local) | `llama3.2` | Browser-ready (local daemon) |
| Custom | your model id | Unknown — any OpenAI-compatible endpoint |

"Proxy likely" is honest, not a bug: those providers do not send CORS headers to browsers, so the request is stopped by the provider, not by OpenFlowKit. **Test key** names the exact cause and the fix instead of showing a network error.

### Configuration Options

1. **Provider**: choose one of the ten marks.
2. **API key**: paste it; the field shows the shape that provider's keys use.
3. **Test key**: sends one minimal completion and reports exactly what happened.
4. **Endpoint and model** (optional): override the base URL or model id. Required for **Custom**.
5. **Clear all keys**: removes every stored key from this browser.

Keys are stored in this browser only. Requests go directly from your browser to the provider — OpenFlowKit has no server, no proxy and no telemetry. A provider that refuses browser calls therefore cannot be used without your own proxy endpoint; the risk badge and **Test key** tell you before you commit.

### Troubleshooting

- **Rejected key**: the provider refused it. The dialog links to the provider's console.
- **Does not accept browser calls (CORS)**: use a browser-ready provider (Gemini, OpenRouter) or point **Custom** at your own endpoint.
- **Ollama refused the browser request**: restart it with the exact `OLLAMA_ORIGINS` command the dialog shows.
- **Rate limits and server errors**: retryable; the dialog says so.

## Keyboard Shortcuts

The Shortcuts tab displays all available keyboard shortcuts organized by category:

- **Essentials**: Undo, redo, select all, delete, clear selection
- **Manipulation**: Multi-select, selection box, duplicate, copy, paste
- **Nodes**: Mindmap navigation, rename, quick create
- **Navigation**: Select tool, hand tool, pan, zoom, fit view
- **Help**: Keyboard shortcuts modal, command bar, search

Shortcuts automatically adapt to Mac or Windows — `Cmd` becomes `Ctrl` on Windows, and `Opt` becomes `Alt`.

## Related Pages

- [Quick Start](/quick-start/)
- [Keyboard Shortcuts](/keyboard-shortcuts/)
- [AI Generation](/ai-generation/)
