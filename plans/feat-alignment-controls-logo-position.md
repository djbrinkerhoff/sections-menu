# feat: Repurpose alignment control for logo positioning

## Overview

Repurpose the existing `data-alignment` control to position the **logo** (left, center, right) rather than aligning nav links. When the logo moves, action icons (search, cart, menu toggle) reposition accordingly. The implementation uses CSS grid across all variants, following the Shopify Dawn pattern of `1fr auto 1fr` for true centering.

## Problem Statement

The current "Alignment" control only adjusts `.nav__list` text alignment — a subtle effect that doesn't meaningfully change the nav layout. Designers need to control **logo position**, which is the dominant visual anchor of the nav bar. This is a standard e-commerce pattern (Shopify Dawn, Squarespace, etc.) and the most impactful layout toggle for the prototype.

## Proposed Solution

Switch all four variants' closed-state (and the top variant's always-visible masthead) to CSS grid with `grid-template-columns` that change based on `data-alignment`. Use `display: contents` on `.nav__actions` only when icons need to split (center alignment). Keep `.nav__actions` as a grouped flex container for left and right alignments.

### Layout Definitions

**Left (default):**
```
[LOGO]                    [search] [cart] [hamburger]
 col 1 (auto)              col 2 (1fr, justify-end)
```

**Center:**
```
[hamburger]     [LOGO]     [search] [cart]
 col 1 (1fr)    col 2      col 3 (1fr)
```
- `display: contents` on `.nav__actions` to split search/cart from toggle
- hamburger goes left (order -1), search+cart go right

**Right:**
```
[hamburger] [search] [cart]                    [LOGO]
 col 1 (1fr, justify-start)              col 2 (auto)
```

### Top Variant Layouts

The top variant has no hamburger and a two-row layout. The `display: contents` approach already dissolves `.nav__actions`.

**Top + Left:**
```
[LOGO]           [search] [cart]
[--- links row (full width) ---]
```
`grid-template-columns: auto 1fr auto auto` — logo col 1, search col 3, cart col 4

**Top + Center (current):**
```
[search]    [LOGO]    [cart]
[--- links row (full width) ---]
```
`grid-template-columns: minmax(48px, 1fr) auto minmax(48px, 1fr)` — no change needed

**Top + Right:**
```
[search] [cart]           [LOGO]
[--- links row (full width) ---]
```
`grid-template-columns: auto auto 1fr auto` — search col 1, cart col 2, logo col 4

## Technical Approach

### Phase 1: Migrate shared closed-state to CSS grid

Replace the flexbox-based shared closed-state layout for simple/fullscreen/sidebar with a CSS grid that matches the top variant pattern.

**Files:** `src/nav.css` (lines 286-315)

**Current flexbox approach:**
```css
[data-variant="simple"] .nav__inner { justify-content: flex-start; }
[data-variant="simple"] .nav__logo { order: -1; }
[data-variant="simple"] .nav__actions { margin-left: auto; }
[data-variant="simple"] .nav__menu-toggle { order: 1; }
```

**New grid approach (left alignment, default):**
```css
[data-variant="simple"] .nav__inner,
[data-variant="fullscreen"] .nav__inner,
[data-variant="sidebar"] .nav__inner {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 16px;
}

/* Logo in col 1, actions+toggle grouped in col 2 */
[data-variant="simple"] .nav__logo,
[data-variant="fullscreen"] .nav__logo,
[data-variant="sidebar"] .nav__logo {
  grid-column: 1;
}

[data-variant="simple"] .nav__actions,
[data-variant="fullscreen"] .nav__actions,
[data-variant="sidebar"] .nav__actions {
  grid-column: 2;
  justify-self: end;
}

[data-variant="simple"] .nav__menu-toggle,
[data-variant="fullscreen"] .nav__menu-toggle,
[data-variant="sidebar"] .nav__menu-toggle {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}
```

**Verification:** Visual regression at 375px — closed state should look identical to current.

### Phase 2: Add alignment-based grid variations

Add CSS rules for center and right logo positions.

**Files:** `src/nav.css` (replace lines 455-465 alignment rules)

**Center alignment (simple/fullscreen/sidebar):**
```css
[data-alignment="center"][data-variant="simple"] .nav__inner,
[data-alignment="center"][data-variant="fullscreen"] .nav__inner,
[data-alignment="center"][data-variant="sidebar"] .nav__inner {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

/* Dissolve actions for icon splitting */
[data-alignment="center"] .nav__actions {
  display: contents;
}

/* Hamburger goes left */
[data-alignment="center"] .nav__menu-toggle {
  grid-column: 1;
  justify-self: start;
}

/* Logo centered */
[data-alignment="center"] .nav__logo {
  grid-column: 2;
  justify-self: center;
}

/* Search + cart go right */
[data-alignment="center"] .nav__search {
  grid-column: 3;
  justify-self: end;
}
[data-alignment="center"] .nav__cart {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}
```

Note: Two items in column 3 will need an inner wrapper or explicit ordering. Alternative: keep `.nav__actions` as flex but place it in col 3.

**Right alignment (simple/fullscreen/sidebar):**
```css
[data-alignment="right"] .nav__inner {
  grid-template-columns: 1fr auto;
}

[data-alignment="right"] .nav__logo {
  grid-column: 2;
  justify-self: end;
}

[data-alignment="right"] .nav__actions {
  grid-column: 1;
  justify-self: start;
}

[data-alignment="right"] .nav__menu-toggle {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}
```

**Top variant adjustments:**
```css
/* Top + Left */
[data-variant="top"][data-alignment="left"] .nav__inner {
  grid-template-columns: auto 1fr auto;
}
[data-variant="top"][data-alignment="left"] .nav__logo {
  grid-column: 1;
  justify-self: start;
}
[data-variant="top"][data-alignment="left"] .nav__search {
  grid-column: 2;
  justify-self: end;
}
[data-variant="top"][data-alignment="left"] .nav__cart {
  grid-column: 3;
  justify-self: end;
}

/* Top + Right */
[data-variant="top"][data-alignment="right"] .nav__inner {
  grid-template-columns: auto 1fr auto;
}
[data-variant="top"][data-alignment="right"] .nav__search {
  grid-column: 1;
  justify-self: start;
}
[data-variant="top"][data-alignment="right"] .nav__cart {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}
[data-variant="top"][data-alignment="right"] .nav__logo {
  grid-column: 3;
  justify-self: end;
}
```

### Phase 3: Fix search input expansion direction

The search input must expand in the correct direction based on where the search icon sits.

**Files:** `src/nav.css`

```css
/* Default: search on right, input expands left (current behavior) */
/* When search is on the left (center or top-center), expand right */
[data-alignment="center"] .nav__search-input,
[data-alignment="right"] .nav__search-input {
  right: auto;
  left: 2rem;
}
```

Top variant already has its own `right: auto; left: calc(100% + 8px)` rule — verify it still applies correctly.

### Phase 4: Update controls panel

**Files:** `src/controls.ts`

- Rename control label from "ALIGNMENT" to "LOGO POSITION" (or keep "ALIGNMENT" if the coupling with link alignment is intentional)
- Optionally update SVG icons to show layout positioning instead of text alignment

### Phase 5: Handle open-state interactions

**Files:** `src/nav.css`

- **Simple open:** Currently uses `flex-wrap` on `.nav__inner`. If the base is now grid, the open state needs to explicitly switch back to flex or define a grid template with a full-width second row. The existing `flex-wrap` + `order: 2` + `w-full` pattern should be preserved by re-applying `display: flex` in the open state.
- **Fullscreen open:** Already uses its own column layout (`flex-col h-full`). The open state overrides should continue to work since they explicitly set display/layout properties.
- **Sidebar open:** The sidebar panel is absolutely positioned. The closed-state bar above it uses the grid layout. No changes needed for the panel itself.

```css
/* Simple open: override grid back to flex for wrapping */
[data-variant="simple"][data-open="true"] .nav__inner {
  display: flex;
  flex-wrap: wrap;
}
```

### Phase 6: Fullscreen close button position tracking

When alignment is "right" (hamburger on left), the fullscreen overlay close button should appear top-left.

```css
[data-alignment="right"][data-variant="fullscreen"][data-open="true"] .nav__menu-toggle {
  @apply self-start;
}
```

## Decisions to Make Before Implementation

| # | Question | Default Assumption |
|---|---|---|
| 1 | Center alignment icon split: `hamburger \| LOGO \| search+cart` or `search \| LOGO \| cart+hamburger`? | `hamburger \| LOGO \| search+cart` |
| 2 | Does `data-alignment` continue to control link text alignment (coupled), or is that dropped? | Coupled — same attribute drives both |
| 3 | Should sidebar slide direction flip for right alignment? | No — always slides from left |
| 4 | Rename control label to "Logo Position"? | Keep "Alignment" for now |

## Acceptance Criteria

- [x] Left alignment: logo left, icons right (matches current default for all variants)
- [x] Center alignment: logo truly centered, icons split (hamburger left, search+cart right)
- [x] Right alignment: logo right, icons left
- [x] Top variant: all three alignments work with the two-row grid layout
- [x] Search input expands in correct direction based on icon position
- [x] Simple open state: links row wraps below correctly in all alignments
- [x] Fullscreen open state: overlay layout unaffected by alignment (logo hidden, column layout)
- [x] Sidebar open state: sidebar panel unaffected, closed-state bar reflects alignment
- [x] Fullscreen close button tracks hamburger position per alignment
- [x] No tab-order regressions (DOM order unchanged)
- [x] Container query logo-hide on search open still works

## References

- Shopify Dawn `header.liquid` — uses `grid-template-areas` + `1fr auto 1fr` for logo centering
- CSS-Tricks: [Preventing a Grid Blowout](https://css-tricks.com/preventing-a-grid-blowout/) — use `minmax(0, 1fr)` not bare `1fr`
- Current nav.css grid (top variant): `src/nav.css:197-284`
- Current alignment rules: `src/nav.css:455-465`
- Current shared closed-state: `src/nav.css:286-315`
- Schema: `src/nav.schema.ts` — `ALIGNMENTS` already has left/center/right
- Controls: `src/controls.ts:70-75` — alignment segmented control
