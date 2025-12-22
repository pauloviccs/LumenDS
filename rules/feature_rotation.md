# Implement Screen Rotation

## Database
- Add `orientation` column to `screens` table.
    - Type: `integer` (0, 90, 180, 270)
    - Default: `0`

## Dashboard (`ScreensView.jsx`)
- In local state/fetching, include `orientation`.
- In the Screen List item, add a **Rotate** button (cyclic: 0->90->180->270->0).
- Or a dropdown. A Cyclic button is faster/better UX.

## Player (`App.jsx` or `PlayerView.jsx`)
- Read `orientation` from the paired screen data.
- Apply a CSS wrapper:
    - `0`: `transform: none`
    - `90`: `transform: rotate(90deg); width: 100vh; height: 100vw; overflow: hidden; position: absolute; top: 50%; left: 50%; translate: -50% -50%;`
    - Note: Rotating the *entire* container requires careful handling of width/height swapping to fit the viewport correctly.

## SQL Migration
```sql
ALTER TABLE public.screens ADD COLUMN orientation INTEGER DEFAULT 0;
```
