# Walkthrough: Fixing Samsung TV Persistent Cache

## The Problem
Samsung Smart TVs (Tizen OS) have an extremely aggressive caching mechanism for Single Page Applications (SPAs).
- **Issue:** The TV continued to load an old version of `index.html` even after deployments, clearing browser cookies, and using query parameters (`?v=2`).
- **Symptom:** A debug overlay (green text) persisted on screen despite being removed from the codebase.

## The Solution: "The Nuclear Option"

We implemented a multi-layered strategy to force the TV to abandon its cache.

### 1. Service Worker Killer
We injected code into the application boot process to detect and unregister any existing Service Workers, which are often responsible for serving stale content.

```javascript
// boot.jsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister(); // Force Unregister
    }
    caches.keys().then(names => {
      for (let name of names) caches.delete(name); // Delete Cache Storage
    });
  });
}
```

### 2. File Renaming (Cache Busting)
We renamed the entry point from `main.jsx` to `boot.jsx`.
- If the TV loads the old cached `index.html`, it tries to fetch `main.jsx`.
- Since `main.jsx` no longer exists on the server, this forces a failure or revalidation, eventually leading the TV to fetch the new `index.html` which points to `boot.jsx`.

### 3. The Reset Page (MPA Mode)
We created a dedicated `reset.html` entry point.
- **Why:** The TV refused to update the root `/` URL.
- **How:** We configured Vite to build `reset.html` as a second entry point (Multi-Page App).
- **Usage:** Navigating to `/reset.html` loads a fresh page that triggers the "Killer" logic, wiping the cache clean.

### 4. Server-Side Headers
We updated `vercel.json` to send aggressive `Clear-Site-Data` headers.

```json
{
  "key": "Clear-Site-Data",
  "value": "\"cache\""
}
```

## Result
The Player now successfully loads version `v1.2.0 - BOOT` without artifacts.
