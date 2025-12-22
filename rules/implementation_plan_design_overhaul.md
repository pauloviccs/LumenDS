# Implementation Plan - LumenDS Design Overhaul ("Liquid Glass")

## Goal
Transform the current muted/dark dashboard into a vibrant, depth-filled "Liquid Glass" interface based on iOS 26 concepts and the `LumenDS_Design_System.md`.

## 1. Foundation & Assets

### Fonts
- **Montserrat**: Headers (Weights: 600, 700).
- **Inter**: Body (Weights: 400, 500).
- Action: Add Google Fonts import to `index.css`.

### Tailwind Configuration (`tailwind.config.js`)
- Add custom colors: `glass-surface`, `electric-blurple`.
- Add custom border radius: `liquid` (28px).
- Add specific box-shadows matching the design token.
- Add animation keyframes for the "Mesh Gradient".

### Global CSS (`index.css`)
- Define the `.liquid-card` utility class based on the provided CSS logic (backdrop-filter, saturation, inner borders).
- Create the animated background class.

## 2. Layout Refactor (`MainLayout.jsx`)
- Remove solid dark backgrounds.
- Implement the "Master Container" with the animated mesh gradient.
- Ensure the sidebar and main content area float above this background using the new glass styling.

## 3. Component Styling Updates

### Sidebar
- Convert to a vertical "Liquid Glass" pill.
- Update active states to use the "Electric Blurple" glow.

### Media Library (`MediaView.jsx`)
- Update `AssetCard`:
    - Use broader border-radius (`rounded-[20px]`).
    - Apply liquid glass effect on hover/selection.
    - Remove hard borders, use light/inner borders.
- Update Grid: Increase gap to breathe (Liquid UI needs space).

### Playlist Editor (`PlaylistEditor.jsx` & `PlaylistsView.jsx`)
- The Modal should be a massive "Liquid Glass" pane.
- Drag & Drop items should feel fluid.

## 4. Verification
- Verify visibility of text on the dynamic background.
- Check performance of `backdrop-filter: blur(40px)` (can be heavy).
