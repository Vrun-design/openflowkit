---
draft: false
title: Mobile Experience
description: Using OpenFlowKit on tablets and phones — capabilities, limitations, and best practices.
---

OpenFlowKit is designed primarily for desktop browsers, but it provides a functional experience on tablets and phones.

## Supported Devices

OpenFlowKit works on:

- **Tablets** (iPad, Android tablets): Full functionality with touch interactions
- **Phones**: Basic viewing and editing with some limitations

## What Works on Mobile

### Viewing Diagrams

- Pan and zoom on the canvas
- Open saved diagrams from the home screen
- View exported diagrams

### Basic Editing

- Tap nodes to select them
- Drag nodes to reposition
- Add new nodes via touch gestures
- Access the context menu via long-press

### Export & Share

- Export diagrams to PNG, SVG, JSON
- Share via viewer links
- Open export menu from the toolbar

## Limitations on Mobile

### Not Supported

- **Precise alignment**: Touch precision is limited for fine-grained positioning
- **Multi-select box**: Drag-to-select is not available
- **Keyboard shortcuts**: External keyboards may work but are not optimized
- **Context menus**: Some right-click actions may be harder to access

### Reduced Functionality

- **Properties Panel**: Editing node properties works but is less convenient
- **Command Bar**: Search and command features work with on-screen keyboard
- **Asset Browser**: Cloud provider icons and asset libraries are harder to browse
- **AI Generation**: Flowpilot works but entering prompts is slower

### Performance

- Large diagrams may be slower to render
- Autosave still works but may have slightly higher latency

## Recommended Workflows for Mobile

1. **Review and present**: OpenFlowKit is great for viewing diagrams on mobile during meetings or code reviews
2. **Quick edits**: Simple changes like moving nodes or editing labels work well
3. **Export on-the-go**: Export diagrams to include in documents or presentations

## For Full Functionality

For the best experience, use a desktop browser:

- Chrome, Firefox, Safari, or Edge on macOS or Windows
- An external keyboard for shortcut access
- A mouse or trackpad for precise selection

## Tips

- Pinch-to-zoom works naturally on touch devices
- Double-tap to zoom in on a specific area
- Use the minimap to navigate large diagrams
- The toolbar is touch-friendly with larger tap targets

## Related Pages

- [Canvas Basics](/canvas-basics/)
- [Properties Panel](/properties-panel/)
- [Exporting](/exporting/)
