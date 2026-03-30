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

The AI tab configures how Flowpilot generates diagrams:

### Supported Providers

- **OpenAI** (GPT-4o, GPT-4o mini)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Google** (Gemini 1.5 Pro, Gemini 1.5 Flash)

### Configuration Options

1. **Select Provider**: Choose your preferred AI provider from the dropdown
2. **Enter API Key**: Paste your API key for the selected provider
3. **Key Persistence**: Choose whether the key persists across browser sessions or is cleared when the tab closes

If you don't have an API key, visit the provider's website to create one. OpenFlowKit does not require any server-side configuration — all AI requests go directly from your browser to the provider.

### Troubleshooting

- **Key not working**: Verify the key is valid and has API access
- **Rate limits**: Check the provider's dashboard for usage limits
- **Model availability**: Some models may not be available in all regions

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
- [Ask Flowpilot](/ask-flowpilot/)
