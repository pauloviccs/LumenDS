# LumenDS Frontend Specifications (v1.0)

## Reference: Liquid Glass Dashboard Prototype

### Design Philosophy: Apple iOS "Liquid Glass" aesthetics, Dark Mode, Depth, Refraction.

1. Tailwind Configuration Strategy

The application MUST use the following extended theme configuration to support the design system.

#### Colors & Gradients

Extend tailwind.config.js with these specific values:

colors: {
  lumen: {
    bg: '#050510', // Deepest background
    glass: 'rgba(20, 20, 30, 0.4)', // Base glass layer
    border: 'rgba(255, 255, 255, 0.1)', // Subtle border
    accent: '#5E60CE', // Electric Blurple (Primary)
    accentHover: '#6930C3', // Darker Blurple
    textMain: 'rgba(255, 255, 255, 0.95)', // High contrast text
    textMuted: 'rgba(255, 255, 255, 0.6)', // Secondary text
    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24'
  }
},
backgroundImage: {
  'mesh-gradient': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
  'glass-sheen': 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%)'
}


#### Fonts

Headings: Montserrat (Weights: 600, 700)

Body: Inter (Weights: 300, 400, 500)

2. Global CSS & Utility Classes

These custom classes are MANDATORY for component construction. Do not rely on standard Tailwind utilities for the glass effect; use the .liquid-card class.

/* The Core Glass Effect */
.liquid-card {
  background: rgba(20, 20, 30, 0.4);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.15); /* Top light source */
  border-left: 1px solid rgba(255, 255, 255, 0.15); /* Left light source */
  box-shadow: 
      0 8px 32px 0 rgba(0, 0, 0, 0.3),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.liquid-card:hover {
  box-shadow: 
      0 12px 40px 0 rgba(94, 96, 206, 0.2), /* Electric Blurple Glow */
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
  border-color: rgba(94, 96, 206, 0.3);
}

/* Scrollbar Styling */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }


3. Structural Components Patterns

#### A. Main Layout (Shell)

Body Background: Use bg-lumen-bg combined with bg-mesh-gradient.

Sidebar: Fixed width (w-64), applies .liquid-card, margins (m-4), full height minus padding.

Content Area: Flex column, overflow-hidden, relative.

#### B. KPI Cards (Metrics)

Wrapper: .liquid-card, relative, overflow-hidden.

Icon: Top-right absolute position, massive size, low opacity (10-20%) for water-mark effect.

Value: font-display, font-bold, text-white.

Trend: text-lumen-success or text-lumen-error with small arrow icon.

Progress Bar: bg-white/10 container with shadow-[0_0_10px_COLOR] on the bar itself for neon glow.

#### C. Lists & Tables

Row Item: flex, items-center, justify-between, p-3, rounded-xl.

Row Hover: hover:bg-white/5, border border-transparent hover:border-white/5.

Status Indicators: w-2 h-2 rounded-full with matching shadow shadow-[0_0_8px_COLOR].

#### 4. Implementation Rules

# Important! Do NOT Break Logic: When refactoring existing components, preserve all useState, useEffect, useQuery, and event handlers. Only replace the returned JSX structure and CSS classes.

No SVG Graphics: Use CSS shapes or font icons (Material Icons or Lucide React) instead of inline SVGs where possible to keep the DOM clean.

Chart.js: Ensure charts use maintainAspectRatio: false and are wrapped in a container with a defined height. Use gradients for line/bar fills.