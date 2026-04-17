# feat: Tile variant auto-collapse when links overflow

## Problem

The tile variant on desktop shows links as individual colored tiles in a flex row. When there are many links (or the viewport is narrow enough), `flex-wrap: wrap` causes tiles to wrap onto multiple rows, which looks broken. Unlike the top variant, tile has no mechanism to detect overflow and collapse into the hamburger/mobile layout.

## Precedent: `syncTopInlineState`

The top variant already solves this exact problem (`src/nav.ts:88-140`):

1. JS measures whether links fit in the available space (logo + links + search + cart + social + gaps)
2. Sets `data-top-inline="true"` or `"false"` on the nav root
3. CSS uses that attribute to show links inline or collapse into hamburger
4. Uses hysteresis: requires 16px extra clearance to promote to inline, but collapses immediately when they stop fitting
5. Runs on ResizeObserver and on variant/control changes

## Proposed Solution

Mirror the `syncTopInlineState` pattern for tile:

### JS: `syncTileInlineState` (`src/nav.ts`)

- Measure available width in the tile grid (total inner width minus logo, search, cart, social, gaps, padding)
- Measure required width for all link tiles using `getInlineNavWidth` (already exists at `src/nav.ts:82-86`)
- Set `data-tile-inline="true"` when links fit in one row, `"false"` when they don't
- Apply same hysteresis pattern (16px extra clearance to promote, immediate collapse)
- Call from the same ResizeObserver and control-change hooks that call `syncTopInlineState`

### CSS: conditional desktop styles (`src/nav.css`)

Currently, tile desktop styles live inside `@container (min-width: 768px)` and apply unconditionally. The change:

- **When `data-tile-inline="true"`** (fits): current desktop tile behavior — links visible as tiles, no hamburger
- **When `data-tile-inline="false"`** (overflow): fall back to mobile layout — show hamburger, hide primary nav, logo + actions as header bar. This is the same as the existing `@container (max-width: 767px)` styles

The simplest CSS approach: tile desktop styles that show the tile grid get scoped behind `[data-tile-inline="true"]`. The hamburger toggle (currently `display: none` on desktop tile) gets shown when `data-tile-inline="false"`.

Key selectors to gate:

- `src/nav.css:1326` — `.nav[data-variant="tile"] .nav__menu-toggle { display: none }` → only when inline
- `src/nav.css:1353` — `.nav[data-variant="tile"] .nav__primary { display: block }` → only when inline
- `src/nav.css:1363` — `.nav[data-variant="tile"] .nav__list { display: flex }` → only when inline
- `src/nav.css:1371` — `.nav[data-variant="tile"] .nav__item { flex: 1 1 0% }` → only when inline

When `data-tile-inline="false"` on desktop, the mobile styles from `@container (max-width: 767px)` need to apply. Two options:

**Option A**: Duplicate mobile styles behind `[data-tile-inline="false"]` in the desktop block
**Option B**: Move the mobile styles out of the container query and use `[data-tile-inline="false"]` or `@container (max-width: 767px)` as alternatives. This avoids duplication but is trickier.
**Option C** (recommended): Keep desktop styles gated behind `[data-tile-inline="true"]` inside the `@container (min-width: 768px)` block. For the collapsed state, add a minimal set of overrides in the desktop block for `[data-tile-inline="false"]` that force the mobile layout (hide primary, show hamburger, header bar layout). The open/overlay state is already viewport-agnostic (`@container (max-width: 767px)`), so we just need the closed-state collapse.

## Tasks

- [x] Add `syncTileInlineState` function to `src/nav.ts` (mirror `syncTopInlineState` logic)
- [x] Call `syncTileInlineState` from ResizeObserver callback alongside `syncTopInlineState`
- [x] Call `syncTileInlineState` from control-change handlers (variant switch, nav item count, social toggle)
- [x] Gate tile desktop link-grid styles behind `[data-tile-inline="true"]` in `src/nav.css`
- [x] Add tile desktop `[data-tile-inline="false"]` collapsed overrides: hide primary, show hamburger, header bar grid
- [x] Ensure tile open/overlay state works on desktop when collapsed (hamburger opens the 2-col tile grid overlay)
- [x] Test with 3 links (should stay inline), 5 links (inline on wide, collapse on narrow), 15 links (always collapsed on reasonable viewports)
- [x] Run all 30 e2e tests

## References

- `syncTopInlineState`: `src/nav.ts:88-140`
- `getInlineNavWidth`: `src/nav.ts:82-86`
- Tile desktop CSS: `src/nav.css:1326-1560`
- Tile mobile closed CSS: `src/nav.css:1028-1165`
- Tile open overlay CSS: `src/nav.css:1171-1325`
- ResizeObserver hookup: `src/nav.ts:~365-375`
