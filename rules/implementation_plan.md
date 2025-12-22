# Implementation Plan - LumenDS

# Goal Description
Build a "Zero Cost" Distributed Digital Signage system. The logic is: **Local Dashboard as Server** + **Cloud Database as Coordinator** + **TV as Passive Player**.
The user manages content locally (avoiding cloud storage costs), and the Dashboard serves files via a Tunnel (Cloudflare/Ngrok logic) to remote players.

## User Review Required
> [!IMPORTANT]
> **The "Tunnel" Architecture**: The dashboard acts as the file server. This means **the Dashboard PC must be ON** for players to *download* new content. Once downloaded (cached), the PC can turn off.
> **PDF Strategy**: We will implement a local PDF-to-Image converter in the Dashboard. The TV never sees a PDF, only optimized JPGs.
> **Storage Pruning**: The Player must aggressively manage its own storage (IndexedDB) to avoid filling the TV's limited memory.

## Proposed Architecture

### Core Logic (The "Tunnel" Flow)
1.  **User** adds files/playlists on Local Dashboard.
2.  **Dashboard** starts a local static file server.
3.  **Dashboard** opens a Public Tunnel (e.g., via a library or external tool interface) to expose the file server.
4.  **User** clicks "Publicar".
5.  **Dashboard** uploads the *Manifest* (JSON with asset URLs pointing to the Tunnel) to Supabase.
6.  **player** (polling every 30s) sees new Manifest.
7.  **Player** downloads assets from the Tunnel URL and saves to IndexedDB.
8.  **Player** switches to new playlist only when all assets are downloaded.

### Tech Stack
-   **Dashboard (Host/Controller)**: Electron + React + Vite (Need Node.js access for local server/tunneling/file conversion).
-   **Player (Client)**: React + Vite (PWA for Offline capabilities).
-   **Backend (Coordinator)**: Supabase (Free Tier) - Only stores text/JSON (Playlists, Device Status).
-   **Tunneling**: Cloudflare Tunnel (cloudflared) or similar zero-config solution handled by the Electron app (or manually by user initially).

### Component Structure

#### [NEW] /apps/dashboard (Electron)
-   **Main Process**:
    -   Local Express/Fastify Server (Static Assets).
    -   Tunnel Manager (Start/Stop/Check Connectivity).
    -   PDF Processor (PDF.js-dist or sharp).
-   **UI Renderer**:
    -   **Style**: "Apple Industrial" (Inter font, clean grays, subtle borders).
    -   **Views**:
        -   *Home*: System Status (Tunnel Online? Screens Synced?).
        -   *Playlist*: Drag-n-Drop Builder.
        -   *Asset Library*: Local file picker + Auto-converters.
        -   *Screens*: List of paired screens with status.
    -   **Primary Action**: "PUBLICAR" (Publish) - Triggers sync.

#### [NEW] /apps/player (Web)
-   **Engine**:
    -   **Smart Polling**: Check Supabase every 30s.
    -   **OfflineFirst**: All assets stored in IndexedDB (Dexie.js or idb).
    -   **Garbage Collector**: Remove assets not referenced in current manifest.
    -   **Pairing View**: Show 6-digit code when not auth'd.

## Verification Plan
### Automated Tests
-   Unit tests for the Manifest Generator logic.
-   End-to-end test of the "PDF -> Image" conversion pipeline.

### Manual Verification
-   **"The Tunnel Test"**: Can a player on 4G (outside local network) download a video from the Dashboard PC?
-   **"The Unplug Test"**: Disconnect WiFi on Player -> Content must loop forever.
-   **"The Grandma Test"**: Pair a screen using only the 6-digit code.
