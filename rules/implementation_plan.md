# Implementation Plan - Debug Overlay Removal

Remove the custom HTML-based debug overlay and its toggle button from the Player application. The overlay is proving problematic on Tizen OS (persisting despite logic) and the user has requested its removal.

## User Review Required

> [!WARNING]
> This will remove the on-screen debug console. Debugging on TV will require network proxies or 'console.log' blind faith.

## Proposed Changes

### Player App

#### [MODIFY] [main.jsx](file:///g:/GitHub/Vibecoding/LumenDS/apps/player/src/main.jsx)
- Remove `initDebugger` function entirely.
- Restore standard `console.log` behavior (remove hijacking).
- Remove `toggleBtn` creation and DOM injection.
- Keep `visibilitychange` auto-reload logic (it's useful).

## Verification Plan

### Automated Tests
- Build verification: `npm run build` in player app.

### Manual Verification
- Deploy and verify clean "black screen" or content on generic browser.
- Verify NO "Initial System Loading" or green text overlay appears.
