# Resolve Critical Supabase Egress

The system is suffering from excessive Egress due to three compounded issues:
1.  **Strict No-Cache Headers**: `apps/player/index.html` forces browsers to re-download all media (GBs of data) on every reload or loop, disregarding browser cache.
2.  **High-Frequency Polling**: The Player polls `ping_screen` every 5 seconds, triggering DB writes.
3.  **Realtime Amplification**: The Dashboard listens to *all* `screens` updates. Every 5s ping triggers a Realtime event to every Dashboard. Each Dashboard then immediately executes a `SELECT *` on the `screens` table, multiplying the egress.

## User Review Required

> [!IMPORTANT]
> **Cache Behavior Change**: We are removing `no-store` and `no-cache` from the Player. This means if you replace a video file in Supabase *without changing its name*, the Player might still show the old one until the cache expires. To force updates, we recommend changing the filename or using versioned folders.

> [!WARNING]
> **Latency Increase**: Player "Online" status update interval will be increased from 5s to 30s to save database costs. This means a screen might appear "Offline" for up to 30s after turning on.

## Proposed Changes

### Apps/Player

#### [MODIFY] [index.html](file:///g:/GitHub/Vibecoding/LumenDS/apps/player/index.html)
- Remove `<meta http-equiv="Cache-Control" content="no-cache...` to allow browser caching of large video assets.

#### [MODIFY] [boot.jsx](file:///g:/GitHub/Vibecoding/LumenDS/apps/player/src/boot.jsx)
- Increase `setInterval` from `5000` to `30000` (30 seconds).

### Apps/Dashboard

#### [MODIFY] [ScreensView.jsx](file:///g:/GitHub/Vibecoding/LumenDS/apps/dashboard/src/views/ScreensView.jsx)
- Implement **debouncing** for the `fetchScreens` call triggered by Realtime.
- Limit max fetches to 1 per 2 seconds, regardless of how many Realtime events arrive (e.g., if 50 screens ping at once).

## Verification Plan

### Automated Tests
- None available for this specific behavior.

### Manual Verification
1.  **Cache Verification**:
    -   Open `apps/player` in a browser.
    -   Open Network Tab.
    -   Reload page.
    -   Verify that video assets show `(disk cache)` or `304 Not Modified` instead of `200 OK` + full size download.
2.  **Polling/Realtime Verification**:
    -   Run Player and Dashboard.
    -   Watch Supabase Dashboard (or Network Tab in Dashboard).
    -   Verify `ping_screen` RPC calls occur only every 30s (Player).
    -   Verify `fetchScreens` (Select query) in Dashboard occurs less frequently.
