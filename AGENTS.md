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

Tab Out is a Chrome Manifest V3 extension with a simple, flat file structure:

```
tab-out/
├── extension/
│   ├── icons/           # Extension icons (16px, 48px, 128px, SVG)
│   ├── app.js           # Main dashboard logic (the "brain")
│   ├── background.js    # Service worker for toolbar badge updates
│   ├── index.html       # New tab page template
│   ├── style.css        # All styling (no CSS frameworks)
│   ├── manifest.json    # Extension configuration
│   └── config.local.js  # Optional personal overrides (gitignored)
├── .gitignore
├── AGENTS.md            # This file
├── LICENSE
└── README.md
```

### Key Files and Roles

| File | Purpose |
|------|---------|
| `app.js` | Core dashboard logic: tab fetching, domain grouping, rendering, event handling, saved tabs |
| `background.js` | Service worker that updates the toolbar badge with tab count (green/amber/red based on count) |
| `index.html` | New tab page DOM structure — header, banner, two-column layout (open tabs + saved for later), footer |
| `style.css` | All visual styling — responsive grid, colors, animations, confetti |
| `manifest.json` | Chrome extension manifest (V3) — permissions, URL override, background service worker |
| `config.local.js` | Optional personal configuration (gitignored) for custom landing page patterns and domain groups |

---

## Code Structure in app.js

`app.js` is organized into clearly marked sections:

1. **CHROME TABS API** — Direct access to `chrome.tabs`:
   - `fetchOpenTabs()` — Reads all open tabs
   - `closeTabsByUrls()` — Closes tabs by hostname
   - `closeTabsExact()` — Closes tabs by exact URL (for landing pages)
   - `focusTab()` — Switches to a specific tab
   - `closeDuplicateTabs()` — Handles duplicate tab cleanup

2. **SAVED FOR LATER** — `chrome.storage.local` operations:
   - `saveTabForLater()` — Saves a tab to the deferred list
   - `getSavedTabs()` — Retrieves active and archived saved tabs
   - `checkOffSavedTab()` — Marks a saved tab as completed (moves to archive)
   - `dismissSavedTab()` — Removes a saved tab entirely

3. **UI HELPERS** — Visual effects:
   - `playCloseSound()` — Web Audio API synthesized swoosh
   - `shootConfetti()` — CSS + JS confetti particles
   - `animateCardOut()` — Card close animation
   - `showToast()` — Pop-up notifications
   - `checkAndShowEmptyState()` — "Inbox zero" message

4. **DOMAIN & TITLE CLEANUP** — Friendly names and title parsing:
   - `FRIENDLY_DOMAINS` — Map of hostname → display name (GitHub, YouTube, etc.)
   - `friendlyDomain()` — Converts hostname to readable name
   - `smartTitle()` — Extracts meaningful titles from URLs (GitHub repos, X posts, etc.)
   - `cleanTitle()` — Removes domain suffixes from page titles

5. **DOMAIN CARD RENDERER** — Builds HTML for domain groups:
   - `renderDomainCard()` — Generates the card for one domain group
   - Handles duplicates, overflow chips (`+N more`), and action buttons

6. **MAIN DASHBOARD RENDERER** — Assembles everything:
   - `renderStaticDashboard()` — Main entry point: greeting, tab fetching, grouping, rendering
   - Landing pages detection and priority sorting
   - Custom group rules from `config.local.js`

7. **EVENT HANDLERS** — Event delegation for all clicks:
   - Focus tab, close tab, save for later, close duplicates, close all, etc.

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

Edit the `FRIENDLY_DOMAINS` map in `app.js`:

```javascript
const FRIENDLY_DOMAINS = {
  // ... existing entries
  'yourdomain.com': 'Your Domain Name',
};
```

### Adding a Landing Page Pattern

Edit the `LANDING_PAGE_PATTERNS` array in `app.js`, or add to `config.local.js`:

```javascript
// In app.js
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

Colors are defined in CSS variables at the top of `style.css`:

```css
:root {
  --bg: #f8f7f4;
  --card-bg: #ffffff;
  --text: #2a2724;
  --muted: #8a847d;
  --accent-amber: #c8713a;
  --accent-sage: #5a7a62;
  --accent-slate: #5a6b7a;
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