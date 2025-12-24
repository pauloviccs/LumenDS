# LumenDS Design System (v1.0)
> **Target Vibe:** Apple iOS 26 "Liquid Glass" Concept
> **Platform:** Windows (Desktop)
> **Core Philosophy:** Depth, Fluidity, and Refraction.

## 1. The "Liquid Glass" Philosophy
Unlike traditional glassmorphism (which is just frosted glass), **Liquid Glass** simulates a physical, wet material. It captures light on its edges and has a dense, high-quality blur.

* **Rule #1:** No flat colors. Everything interacts with the background.
* **Rule #2:** Edges glow. Use inner borders to simulate light hitting the cut glass.
* **Rule #3:** Depth is king. Layer glass on top of glass to create hierarchy.

---

## 2. Typography
We use a geometric/humanist pairing to balance the futuristic look with readability.

### Headers: **Montserrat**
Used for all titles, stats, and major navigation labels.
* **Weights:** SemiBold (600), Bold (700).
* **Tracking:** Slightly tighter (-0.02em) for a modern, compact feel.
* **Vibe:** Architectural and confident.

### Body: **Inter**
Used for functional text, settings, and paragraphs.
* **Weights:** Regular (400), Medium (500).
* **Color:** Never pure black/white. Use 90% opacity for integration with the glass.

---

## 3. Color Palette & Lighting
The "color" comes primarily from the background wallpapers (Mesh Gradients) bleeding through the glass. The UI itself is neutral.

* **Glass Surface (Light):** `rgba(255, 255, 255, 0.08)`
* **Glass Surface (Dark):** `rgba(20, 20, 30, 0.4)`
* **Specular Border (Light):** `linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%)`
* **Accent Color:** **Electric Blurple** (used in gradients/glows).
    * `#5E60CE` to `#6930C3` gradient.

---

## 4. Component Specs (The "Vibecoding" Logic)

### A. The Master Container (Window)
Since this is Windows, we ditch the standard Title Bar.
* **Effect:** Use Windows *Acrylic* or *Mica* as the base layer for performance.
* **Overlay:** A mesh gradient blob moving slowly in the background.

### B. Liquid Cards (The Core)
This is the building block of LumenDS.
* **Shape:** Large border-radius (`24px` to `32px`).
* **Backdrop Filter:** `blur(40px)` (Heavy blur is key for the "thick glass" look).
* **Saturate:** `saturate(180%)` (Boosts the colors behind the glass).
* **Border:** 1px solid, but with a gradient opacity (top-left bright, bottom-right invisible).