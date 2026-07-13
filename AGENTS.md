# AGENTS.md -- Tab Out: Agent Guide

You're installing **Tab Out** for the user. Your job is not just to set it up — it's to get them excited about using it.

---

## Step 0 -- Introduce the product

Before doing anything technical, tell the user what they're about to get:

> **Tab Out** replaces your new tab page with a clean dashboard of everything you have open, grouped by domain.
>
> Here's what makes it great:
> - **See all your open tabs at a glance** grouped by domain on a grid
> - **Homepages group** pulls Gmail, X, LinkedIn, YouTube, GitHub homepages into one card for easy cleanup
> - **Close tabs with style** satisfying swoosh sound + confetti burst
> - **Duplicate detection** flags when you have the same page open twice
> - **Click any tab title to jump to it** even across different Chrome windows
> - **Save for later** bookmark individual tabs to a checklist before closing them
> - **100% local** no server, no accounts, no data sent anywhere
>
> It's just a Chrome extension. Setup takes about 1 minute.

---

## Step 1 -- Clone the repo

```bash
git clone https://github.com/soarpenguin/tab-out.git
cd tab-out
```

---

## Step 2 -- Install the Chrome extension

This is the one step that requires manual action from the user. Make it as easy as possible.

**First**, print the full path to the `extension/` folder:
```bash
echo "Extension folder: $(cd extension && pwd)"
```

**Then**, copy the `extension/` folder path to their clipboard:
- macOS: `cd extension && pwd | pbcopy && echo "Path copied to clipboard"`
- Linux: `cd extension && pwd | xclip -selection clipboard 2>/dev/null || echo "Path: $(pwd)"`
- Windows: `cd extension && echo %CD% | clip`

**Then**, open the extensions page:
```bash
open "chrome://extensions"
```

**Then**, walk the user through it step by step:

> I've copied the extension folder path to your clipboard. Now:
>
> 1. You should see Chrome's extensions page. In the **top-right corner**, toggle on **Developer mode** (it's a switch).
> 2. Once Developer mode is on, you'll see a button called **"Load unpacked"** appear in the top-left. Click it.
> 3. A file picker will open. **Press Cmd+Shift+G** (Mac) or **Ctrl+L** (Windows/Linux) to open the "Go to folder" bar, then **paste** the path I copied (Cmd+V / Ctrl+V) and press Enter.
> 4. Click **"Select"** or **"Open"** and the extension will install.
>
> You should see "Tab Out" appear in your extensions list.

**Also**, open the file browser directly to the extension folder as a fallback:
- macOS: `open extension/`
- Linux: `xdg-open extension/`
- Windows: `explorer extension\\`

---

## Step 3 -- Show them around

Once the extension is loaded:

> You're all set! Open a **new tab** and you'll see Tab Out.
>
> Here's how it works:
> 1. **Your open tabs are grouped by domain** in a grid layout.
> 2. **Homepages** (Gmail inbox, X home, YouTube, etc.) are in their own group at the top.
> 3. **Click any tab title** to jump directly to that tab.
> 4. **Click the X** next to any tab to close just that one (with swoosh + confetti).
> 5. **Click "Close all N tabs"** on a group to close the whole thing.
> 6. **Duplicate tabs** are flagged with an amber "(2x)" badge. Click "Close duplicates" to keep one copy.
> 7. **Save a tab for later** by clicking the bookmark icon before closing it. Saved tabs appear in the sidebar.
>
> That's it! No server to run, no config files. Everything works right away.

---

## Key Facts

- Tab Out is a pure Chrome extension. No server, no Node.js, no npm.
- Saved tabs are stored in `chrome.storage.local` (persists across sessions).
- 100% local. No data is sent to any external service.
- To update: `cd tab-out && git pull`, then reload the extension in `chrome://extensions`.

---

## Project Architecture

Tab Out is a Chrome Manifest V3 extension with a modular file structure:

```
tab-out/
├── extension/
│   ├── icons/           # Extension icons (16px, 48px, 128px, SVG)
│   ├── js/              # JavaScript modules
│   │   ├── core/        # Core utilities (Chrome API, storage)
│   │   ├── ui/          # UI utilities (helpers, icons, domain cleanup)
│   │   ├── renderer/    # Rendering logic (dashboard, cards, deferred list)
│   │   ├── features/    # Feature modules (search, workspaces, sessions, settings)
│   │   ├── events/      # Event handlers (main handlers, toolbar events)
│   │   └── init.js      # Application entry point
│   ├── css/             # CSS modules
│   │   ├── base/        # Variables and reset styles
│   │   ├── layout/      # Layout styles (header, footer, columns)
│   │   ├── components/  # Component styles (cards, chips, links, etc.)
│   │   ├── ui/          # UI element styles (modal, drawer, toast, etc.)
│   │   └── animations.css # Animation definitions
│   ├── background.js    # Service worker for toolbar badge updates
│   ├── index.html       # New tab page template
│   ├── manifest.json    # Extension configuration
│   └── config.local.js  # Optional personal overrides (gitignored)
├── .gitignore
├── AGENTS.md            # This file
├── CLAUDE.md            # Symlink to AGENTS.md
├── LICENSE
└── README.md
```

### Key Files and Roles

| File | Purpose |
|------|---------|
| `js/core/chrome-api.js` | Chrome Tabs API wrappers: fetchOpenTabs, closeTabs, focusTab |
| `js/core/storage.js` | chrome.storage.local operations for saved tabs, quick links, todos |
| `js/ui/helpers.js` | UI utilities: playCloseSound, shootConfetti, showToast, modals |
| `js/ui/icons.js` | SVG icon definitions |
| `js/ui/domain-cleanup.js` | Friendly domain names, title parsing |
| `js/ui/tab-age.js` | Tab age calculation and formatting |
| `js/renderer/domain-cards.js` | Domain card rendering logic |
| `js/renderer/deferred-list.js` | Saved tabs and quick links rendering |
| `js/renderer/dashboard.js` | Main dashboard assembly and rendering |
| `js/features/search.js` | Global search functionality |
| `js/features/workspaces.js` | Workspace management and filtering |
| `js/features/sessions.js` | Session save/restore functionality |
| `js/features/settings.js` | Settings panel and configuration |
| `js/events/handlers.js` | Main event handlers for all clicks |
| `js/events/toolbar-events.js` | Bottom toolbar event handlers |
| `js/init.js` | Application initialization |
| `css/base/variables.css` | CSS variables (colors, theme) |
| `css/base/reset.css` | Global reset styles and container layout |
| `css/layout/*.css` | Layout styles (header, footer, columns) |
| `css/components/*.css` | Component-specific styles |
| `css/ui/*.css` | UI element styles |
| `background.js` | Service worker that updates the toolbar badge |
| `index.html` | New tab page DOM structure |
| `manifest.json` | Chrome extension manifest (V3) |
| `config.local.js` | Optional personal configuration (gitignored) |

---

## Development Workflow

### Reloading the Extension After Code Changes

Chrome doesn't automatically pick up changes to unpacked extensions. To see your changes:

1. Go to `chrome://extensions`
2. Find "Tab Out" in the list
3. Click the **refresh icon** (circular arrow) in the bottom-right corner of the extension card
4. Open a new tab to see the changes

### Debugging

- **Console**: Right-click on the Tab Out page → Inspect → Console tab
- **Service Worker**: In `chrome://extensions`, click "Service Worker" under "Inspect views" to debug `background.js`
- **Storage**: In Chrome DevTools → Application tab → Local Storage → `chrome-extension://<extension-id>`

### Testing Changes

1. Make changes to the source files
2. Reload the extension in `chrome://extensions`
3. Open a new tab to see the changes
4. Open DevTools console for any errors

---

## Common Development Tasks

### Adding a Friendly Domain Name

Edit the `FRIENDLY_DOMAINS` map in `js/ui/domain-cleanup.js`:

```javascript
const FRIENDLY_DOMAINS = {
  // ... existing entries
  'yourdomain.com': 'Your Domain Name',
};
```

### Adding a Landing Page Pattern

Edit the `LANDING_PAGE_PATTERNS` array in `js/renderer/dashboard.js`, or add to `config.local.js`:

```javascript
// In js/renderer/dashboard.js
const LANDING_PAGE_PATTERNS = [
  // ... existing patterns
  { hostname: 'example.com', pathExact: ['/'] },
];

// Or in config.local.js (gitignored, personal)
const LOCAL_LANDING_PAGE_PATTERNS = [
  { hostname: 'mycompany.com', pathExact: ['/dashboard'] },
];
```

### Creating Custom Domain Groups

Use `config.local.js` to merge subdomains or split by path:

```javascript
const LOCAL_CUSTOM_GROUPS = [
  {
    hostname: 'docs.google.com',
    groupKey: 'google-docs',
    groupLabel: 'Google Docs',
  },
  {
    hostname: 'drive.google.com',
    groupKey: 'google-docs',
    groupLabel: 'Google Docs',
  },
];
```

### Modifying Colors/Theme

Colors are defined in CSS variables in `css/base/variables.css`:

```css
:root {
  --ink: #1a1613;
  --paper: #f8f5f0;
  --warm-gray: #e8e2da;
  --muted: #9a918a;
  --accent-amber: #c8713a;
  --accent-sage: #5a7a62;
  --accent-slate: #5a6b7a;
  --accent-rose: #b35a5a;
}
```

---

## Important Constraints

- **No build system**: All files are served directly by Chrome — no bundling, no transpilation
- **No npm dependencies**: Pure vanilla JavaScript, CSS, and HTML
- **Manifest V3**: Must follow Chrome's Manifest V3 requirements (service workers instead of background pages)
- **No external API calls**: The only external request is Google's favicon service (`www.google.com/s2/favicons`)
- **All data local**: `chrome.storage.local` for saved tabs, no server required
- **No persistent background page**: `background.js` is a service worker that wakes up on events
- **Document synchronization**: When code structure changes (new files, renamed modules, moved functions), update `AGENTS.md` and `CLAUDE.md` to reflect the new structure so the AI agent has accurate context