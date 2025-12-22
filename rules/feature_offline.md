# Offline Support Implementation Plan

## Goal
Ensure the Player continues to function when internet connection is lost.
This involves:
1.  **Application Shell**: The HTML/JS/CSS of the player must load offline.
2.  **Content Assets**: Images and Videos in the active playlist must be cached.

## Technologies
- **Vite PWA Plugin**: Automatically generates Service Workers.
- **Cache Storage API**: For manual Asset caching.

## Steps

### 1. PWA Setup (`apps/player`)
- Install `vite-plugin-pwa`.
- Configure `vite.config.js` to register the service worker.
- Use `GenerateSW` strategy for simple App Shell caching.

### 2. Asset Caching Strategy
The Service Worker caches the *Code*. But the *Content* comes from Supabase/Localhost URLs.
We need a custom mechanism to cache these "dynamic" assets.

**New Component: `PlaylistCacheManager.js`**
- Watches the current `playlist`.
- When playlist changes:
    1. Compares with cached items.
    2. Downloads new items (fetch -> cache.put).
    3. Deletes old items (cache.delete).
- Can use a dedicated Cache Name: `lumends-media-v1`

### 3. Player View Update
- `PlayerView` currently sets `src`.
- We need to intercept this.
- If we are offline (or always), we should check if `src` is in Cache.
- If in Cache, create a blob URL? Or just let the Service Worker intercept the fetch?
    - If SW intercepts `fetch`, we can just use the original URL in `<img src="...">`. The SW will serve from cache if available.
    - However, standard SW configuration (GenerateSW) typically only caches build assets.
    - We might need `Workbox RuntimeCaching` config to cache runtime media.

## Proposed Config (Vite)
```javascript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.match(/\.(mp4|webm|jpg|png)$/i),
        handler: 'CacheFirst',
        options: {
          cacheName: 'lumends-media-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
})
```
*Note:* The "Zero Cost Tunnel" (`localhost:11222`) poses a challenge if the Dashboard goes offline. But "Offline Support" usually implies "Internet is Down", not "Dashboard is Down". If Dashboard (Localhost) is down, it means the PC is off.
*Wait:* The user implies "Offline Support" for when the Player device loses internet.
If the Player is on a SmartTV accessing `app.lumends.com` (future), it needs to cache content from Supabase Storage.
If the Player is accessing `localhost:11222`, it is on the Same Machine (or LAN). LAN usually works without Internet.
But for robusteness, caching is good.

## Implementation Data
1. Install `vite-plugin-pwa`.
2. Configure `vite.config.js`.
3. Add `main.jsx` logic to show "Offline" badge if disconnected.
