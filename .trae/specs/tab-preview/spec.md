# Tab Out - Tab Preview Feature

## Overview
- **Summary**: Add tab preview functionality that displays a page thumbnail when hovering over a tab, similar to Chrome's built-in tab hover preview but with a more polished and integrated design
- **Purpose**: Allow users to quickly identify tabs without switching to them, improving navigation efficiency and reducing context switching
- **Target Users**: All Tab Out users who have multiple tabs open and need to quickly identify content

## Goals
- Implement tab preview thumbnail display on hover
- Integrate seamlessly with the existing design system
- Add a settings toggle to enable/disable the feature
- Ensure preview images are cached for better performance

## Non-Goals (Out of Scope)
- Video/audio preview in thumbnails
- Full page rendering in preview
- Preview for closed/inactive tabs
- Sharing/saving preview images

## Background & Context
- Tab Out is a Chrome Manifest V3 extension
- Existing tab chips are rendered in `js/renderer/domain-cards.js`
- Settings are managed in `js/features/settings.js`
- Chrome provides `chrome.tabs.captureVisibleTab` API for capturing tab screenshots
- The feature should use Chrome's favicon service as fallback when capture fails

## Functional Requirements
- **FR-1**: When hovering over a page chip (tab), display a preview overlay showing the tab's content thumbnail
- **FR-2**: The preview should include the tab title and URL below the thumbnail
- **FR-3**: The preview should appear with a smooth animation and positioned relative to the hovered tab
- **FR-4**: Add a toggle in settings to enable/disable the tab preview feature
- **FR-5**: Preview images should be cached to avoid repeated captures and improve performance
- **FR-6**: Fall back to favicon display if tab capture fails (e.g., for chrome:// URLs)

## Non-Functional Requirements
- **NFR-1**: Preview overlay should be responsive and not overflow viewport boundaries
- **NFR-2**: Tab capture should happen asynchronously to avoid blocking the UI
- **NFR-3**: Preview should disappear immediately when user hovers away
- **NFR-4**: Memory usage should be minimized through proper cleanup of preview elements

## Constraints
- **Technical**: Chrome Manifest V3, no external API calls, `chrome.tabs.captureVisibleTab` requires `activeTab` permission (already in manifest)
- **Business**: No server-side processing, all rendering client-side
- **Dependencies**: Chrome Tabs API (`chrome.tabs.captureVisibleTab`)

## Assumptions
- Users have Chrome 88+ (supports Manifest V3)
- Tab capture API works for most HTTP/HTTPS URLs
- Users understand that preview shows current visible state of the tab

## Acceptance Criteria

### AC-1: Preview appears on hover
- **Given**: Tab preview feature is enabled in settings
- **When**: User hovers over a page chip in the dashboard
- **Then**: A preview overlay appears showing the tab's thumbnail image, title, and URL
- **Verification**: `human-judgment`

### AC-2: Preview disappears on mouse leave
- **Given**: Tab preview is visible
- **When**: User moves mouse away from the page chip
- **Then**: Preview overlay animates out and is removed from DOM
- **Verification**: `human-judgment`

### AC-3: Settings toggle works
- **Given**: User has opened settings drawer
- **When**: User toggles "Show tab preview" setting
- **Then**: Setting is saved and tab preview behavior updates immediately
- **Verification**: `programmatic`

### AC-4: Preview positions correctly
- **Given**: Tab preview is enabled
- **When**: User hovers over tabs at various positions (top, bottom, left, right edges)
- **Then**: Preview overlay stays within viewport bounds and doesn't overflow
- **Verification**: `human-judgment`

### AC-5: Preview caching improves performance
- **Given**: User hovers over a tab, then hovers away, then hovers again
- **When**: Second hover occurs within cache duration
- **Then**: Preview appears instantly without re-capturing
- **Verification**: `human-judgment`

### AC-6: Fallback for unsupported URLs
- **Given**: User hovers over a chrome:// or extension URL
- **When**: Tab capture fails
- **Then**: Preview shows favicon instead of thumbnail
- **Verification**: `human-judgment`

## Open Questions
- [ ] What should be the default state of the toggle (on/off)?
- [ ] What cache duration should be used for preview images?
