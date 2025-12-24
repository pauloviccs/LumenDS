# Workflow: Figma to Code (The UEoE Pipeline)

This workflow defines the standard operating procedure for translating Figma prototypes into `LumenDS` production code.

## 1. The Reality Check (Pre-Code)
Figma designs are "Static Hallucinations". They never account for:
- Loading States
- API Errors
- Dynamic Content Lengths
- 4k vs Mobile Screens

**Rule:** We treat Figma as a *guide*, not a bible.

## 2. The Extraction Process (User Action)
To integrate your Figma prototype, you must provide three things:

1.  **The "Vibe" Snapshot:** A screenshot or detailed description of the component (e.g., "Glass cards with neon borders, 40px blur").
2.  **The "Golden Source" Tokens:** Export the colors/fonts via Dev Mode or list them.
    *   *Example:* "Primary color is `#5E60CE`, Font is `Inter`."
3.  **The Structure Dump:** Copy the 'JSX' or 'HTML' from Figma's Dev Mode (or inspection panel) for the specific component.
    *   *Why?* Even if the code is messy, it gives me the exact spacing (`gap-4`), padding (`p-6`), and hierarchy.

## 3. The Refinement (Agent Action)
I will take your "dumb" Figma code and "Smart-ify" it:
1.  **Atomization:** Break the giant HTML block into Reusable React Components (`<Card>`, `<Badge>`, `<StatChart>`).
2.  **Liquid Integration:** Inject the `LumenDS` Tailwind classes (`lumen-glass`, `backdrop-blur`) to match the existing system.
3.  **Logic Injection:** Connect the `MainLayout` or API data to the component.

## 4. Execution Step
**Trigger:**
> "UEoE 1, here is the Figma code for the [KPI Card]. Please integrate it."
> *[Paste Code Block]*

**Response:**
I will generate the implementation plan and the actual `.jsx` file.
