# Prompt Collector

## Global Rules

- Prefer the simplest working solution.
- Keep code concise and easy to understand.
- If user intent is not fully clear, discuss and confirm details before writing code.
- Record version updates using semantic version style such as `V1.0.0`.
- Keep this document updated when major behavior changes.

## Current Version

- `V1.1.1`

## Product Goal

Prompt Collector is a Chrome extension for saving prompts, browsing saved versions, and comparing two prompt versions side by side.

The current main interaction is a left sidebar injected into the active webpage. The sidebar can be toggled from the extension icon and resized horizontally by dragging its right edge.

## Core Logic

1. User clicks the extension icon.
2. `background.js` sends a toggle message to the active tab.
3. `content.js` creates or toggles the sidebar inside the current page.
4. The sidebar reads and writes prompt data from `chrome.storage.local`.
5. Users can save prompts manually, delete prompts, copy prompts, select up to two prompts, and compare them.
6. Sidebar width is stored in `chrome.storage.local` and restored when reopened.

## Implemented Features

- Toggle sidebar from the extension icon
- Left sidebar injected into the current webpage
- Horizontal drag-to-resize sidebar
- Manual prompt input and save
- Prompt platform selection: `ChatGPT`, `Claude`, `Gemini`, `Other`
- Saved prompt list
- Copy single prompt
- Delete single prompt
- Select up to 2 prompts for comparison
- Auto-drop the oldest selected prompt when selecting a third one
- Compare view with `Version A` and `Version B`
- Saved sidebar width persistence

## Data Model

Each saved prompt record includes:

- `id`
- `content`
- `platform`
- `savedAt`

## Current File Responsibilities

- `manifest.json`: extension configuration, permissions, content script registration
- `background.js`: toolbar icon click handling
- `content.js`: sidebar UI, state, storage, compare logic, resize logic
- `styles.css`: sidebar styles

## Version History

### V1.0.0

- Initial MVP
- Popup-based prompt input
- Prompt list
- Delete support

### V1.0.1

- Improved input resizing behavior in popup textarea

### V1.1.0

- Switched from popup UI to injected left sidebar
- Added horizontal sidebar resize
- Preserved save, list, copy, delete, and compare flows inside sidebar

### V1.1.1

- Increased sidebar maximum width to `1400px`
- Kept the implementation simple by only expanding the resize upper bound

## Open Decisions

- Maximum sidebar width
- Whether the page should always shrink with the sidebar, or allow sidebar overlay mode in very wide layouts
- Whether sidebar open/closed state should persist across page refresh

## Change Principle

When changing the product:

1. Confirm unclear UX behavior before coding.
2. Prefer the smallest possible change.
3. Avoid adding new files or abstractions unless necessary.
4. Update this document with the new version and behavior changes.
