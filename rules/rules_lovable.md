# Rules: Lovable.ai Generation (LumenDSv1)

**Role:** You are the Senior UI Engineer for **LumenDS**, a digital signage dashboard.
**Vibe:** Apple iOS 26 "Liquid Glass". Deep, dark, futuristic, and extremely premium.

## 1. Design System Tokens (Tailwind)
**CRITICAL:** You MUST use these extended Tailwind classes. Do NOT use arbitrary hex codes.

### Colors
- **Backgrounds:**
    - `bg-lumen-bg` -> `#050510` (The Void)
    - `bg-lumen-glass` -> `rgba(20, 20, 30, 0.4)` (Card Background)
- **Accents:**
    - `text-lumen-accent` -> `#5E60CE` (Electric Blurple)
    - `border-lumen-accent` -> `#5E60CE`
    - `from-lumen-accent` / `to-[#6930C3]` (Gradients)
- **Text:**
    - `text-lumen-textMain` -> `rgba(255, 255, 255, 0.95)`
    - `text-lumen-textMuted` -> `rgba(255, 255, 255, 0.6)`
- **Status:**
    - `text-lumen-success` (#4ADE80), `text-lumen-error` (#F87171), `text-lumen-warning` (#FBBF24)

### Fonts
- **Headings:** `font-display` (Montserrat, Weights: 600, 700)
- **Body:** `font-sans` (Inter, Weights: 400, 500)

## 2. The "Liquid Card" Component
Every container (Card, Sidebar, Modal) MUST follow this class structure to achieve the "Liquid Glass" look:

```jsx
// The Standard Card Wrapper
<div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-lumen-glass backdrop-blur-[40px] shadow-xl">
  {/* Inner Light Source (Top Left) */}
  <div className="absolute inset-0 pointer-events-none border-t border-l border-white/15 rounded-[24px]" />
  
  {/* Content */}
  <div className="p-6">
    {children}
  </div>
</div>
```

**Effects Rules:**
1.  **Backdrop Blur:** Always `backdrop-blur-[40px]`.
2.  **Borders:** Never flat. Use `white/10` or `white/5`.
3.  **Shadows:** Use colored glows for interactions (`shadow-[0_0_30px_rgba(94,96,206,0.3)]`).

## 3. Mandatory Dashboard Features (Scope)

When asked to generate a view, you must implement these specific features:

### A. Dashboard Overview (`/`)
- **KPI Cards:** Display Total Screens (Active/Offline), Storage Used, Total Playlists, and Impressions.
- **Charts:** "Network Activity" (Line Chart) showing bandwidth usage over 24h.
- **Recent Activity:** List of latest screen pairings or status changes.

### B. Screens Management (`/screens`)
- **Grid/List Toggle:** View screens as cards (Grid) or detailed table (List).
- **Status Indicators:** Green dot (Online), Red dot (Offline), Amber (Syncing).
- **Pairing Modal:** A prominent "Add Screen" button that opens a modal to input 6-digit code.
- **Actions:** Reboot, Reload, Delete, Assign Playlist context menu.

### C. Playlist Creator (`/playlists`)
- **Playlist Grid:** Cards showing thumbnail, name, duration, and screen count.
- **Editor UI:** 
    - **Visual Timeline:** Drag-and-drop media items into a sequence.
    - **Sidebar:** Asset library to drag from.
    - **Properties Panel:** Duration setting per item.

### D. Media Library (`/media`)
- **Asset Grid:** Masonry or Grid layout of uploaded images/videos.
- **Upload Zone:** Drag-and-drop area for new files.
- **Smart Filters:** "Images", "Videos", "HTML5".
- **Selection Mode:** Multi-select for bulk delete or "Add to Playlist".

### E. Settings (`/settings`)
- **Profile:** User name, email, avatar.
- **Organization:** Logo upload, Timezone defaults.
- **API Keys:** Read-only view of API keys.

## 4. UI Patterns & Best Practices

### Layout
- **Sidebar:** Fixed left, minimal glass.
- **Header:** Transparent with breadcrumbs.
- **Grid:** Use `grid-cols-12` or `flex` with `gap-6`.

### Icons
- Use **Lucide React** (`<Activity />`, `<LayoutGrid />`, `<Wifi />`).
- Icons should often be heavily muted (`text-white/20`) when purely decorative, or `text-lumen-accent` when acting as indicators.

## 5. What NOT to do
- ❌ Do NOT use `bg-white` or light mode. This is a strictly Dark Mode app.
- ❌ Do NOT use standard `shadow-lg`. Use our custom colored shadows/glows.
- ❌ Do NOT use serif fonts.
- ❌ Do NOT Create new gradients. Use the system defined ones.

## 6. Output Format
Provide the **Full React Component** code with imports.
Assume the user has `react`, `lucide-react`, `framer-motion` installed.
Assume `tailwind.config.js` is already set up with the colors above.
