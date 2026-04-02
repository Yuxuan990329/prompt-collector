# Prompt Collector

## Global Rules

- Prefer the simplest working solution.
- Keep code concise and easy to understand.
- If user intent is not fully clear, discuss and confirm details before writing code.
- Record version updates using semantic version style such as `V1.0.0`.
- Keep this document updated when major behavior changes.

## Current Version

- `V1.4.3`

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
- Open Workspace entry from the sidebar
- Dedicated workspace page for prompt search and comparison

## Data Model

Each saved prompt record includes:

- `id`
- `name`
- `category`
- `content`
- `platform`
- `savedAt`

## Current File Responsibilities

- `manifest.json`: extension configuration, permissions, content script registration
- `background.js`: toolbar icon click handling
- `content.js`: sidebar UI, state, storage, compare logic, resize logic
- `workspace.html`: dedicated prompt management page
- `workspace.js`: workspace search, filter, list, and compare logic
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

### V1.2.0

- Added `Prompt Name` as a required field when saving prompts
- Added `Category` with preset options and custom input support
- Display prompt name in the list view as the card title
- Display prompt name and category in compare view

### V1.2.1

- Added custom input support for `Platform` when `Other` is selected

### V1.3.0

- Added `Open Workspace` entry in the sidebar
- Added a dedicated workspace page opened in a new browser tab
- Added search and category filter in the workspace
- Added left prompt list plus right dual-version compare layout
- Compare panels show metadata and full prompt content

### V1.3.1

- Added a top `← Back` button in the workspace header
- Kept the workspace layout unchanged

### V1.3.2

- Fixed `← Back` so it returns to the source page instead of only closing the workspace tab

### V1.4.0

- Added a collapse/expand handle for the main sidebar
- Added `A-` and `A+` font-size controls in the workspace compare panels

### V1.4.1

- Changed the main sidebar handle behavior to a direct close action
- Made the handle more visually prominent outside the sidebar edge

### V1.4.2

- Aligned the main sidebar flush with page content
- Kept the close handle visually protruding without adding extra blank space

### V1.4.3

- Refined the close handle position so it visually attaches to the sidebar edge

## Current Input Fields

The save form now contains:

- `Platform`
- `Prompt Name`
- `Category`
- `Prompt`

## Category Options

Default category options:

- `Writing`
- `Analysis`
- `Coding`
- `Research`
- `Prompt Engineering`
- `Other`

If `Other` is selected, the user can type a custom category value. Chinese input is supported.

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
