## Overview

Add a new **"tile"** nav variant to the sections-menu prototype. On mobile, the open menu displays navigation links as a **2-column grid of large rectangular tiles** (inverted colors, text at bottom-left) instead of a vertical list. On desktop, links appear as **filled tile/card blocks** in a single horizontal row. Desktop search replaces the tile row with a full-width input.

**Figma source:** https://www.figma.com/design/k5v90SoJHM2H4XQGNv3rId/sidebar-nav?node-id=1-325

## Problem Statement / Motivation

The current 4 variants (simple, fullscreen, sidebar, top) cover list-based and inline-text navigation patterns. The tile variant introduces a **card/grid-based** navigation pattern common in visual storefronts where categories have imagery or need more visual weight than a text list. This fills a gap in the prototype's coverage of real-world Big Cartel storefront navigation styles.

## Design Specification (from Figma)

### Mobile Closed (375px)
Standard header bar — identical to simple/fullscreen/sidebar closed state:
- Logo left, search + cart + hamburger icons right
- Uses the shared closed-state grid layout (`grid-template-columns: auto 1fr auto auto`)

### Mobile Open (375px)
Full-screen overlay on dark background:
- **Logo + close (X) button** at top (same bar as closed, minus search/cart)
- **2-column grid of tiles** below the header area
- Each tile: white fill on dark background, link text at **bottom-left** with padding
- Grid uses `grid-template-columns: 1fr 1fr` with ~8px gap, ~16px outer padding
- Tiles with submenus show a **chevron icon** next to the text
- Scrollable if tiles overflow the viewport

### Mobile Dropdown Expanded
- Tapping a submenu tile **expands that tile vertically** to reveal sub-items as a stacked text list
- The **row grows** to accommodate the expanded tile, but the adjacent tile stays at its natural height (**`align-items: start`** on the grid, not stretch)
- Sub-items are listed below the parent label with consistent left padding

### Desktop (≥768px container width)
Single-row horizontal bar:
- Logo left in its own box
- **Filled tile/card blocks** in a row, each with dark fill + light text (inverted from bar background) — tiles fill available space equally between logo and action icons
- Search icon + cart icon on the right
- **No hamburger** — links always visible (like top variant)

### Desktop Search Open
- Tile row is **hidden** (not animated out — instant swap like fullscreen search)
- Full-width search input replaces the tile area
- Logo and cart icon remain visible
- Close (X) button on the search field

## Proposed Solution

Follow the established schema-first pattern: add `'tile'` to `VARIANTS`, write CSS rules scoped with `[data-variant="tile"]`, wire behavior in `nav.ts`, and add the variant thumbnail to `controls.ts`. No HTML changes needed — the existing `nav.partial.html` markup is reused.

### Key Layout Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Mobile tile grid | CSS Grid `1fr 1fr` with `align-items: start` | Allows rows to grow for expanded submenus without stretching siblings. Confirmed by Figma frame structure. |
| Tile colors | Fill = `var(--text-color)`, text = `var(--menu-color)` | Inverted from bar background, consistent with the Figma black/white scheme, composes correctly with all color combos |
| Desktop tile sizing | Equal-width flex/grid children filling space between logo and actions | Figma shows 6 equal-width tiles spanning the available area |
| Desktop submenu | Standard dropdown below the tile bar (reuse existing `.nav__submenu` positioning) | Matches simple/top desktop behavior; no new markup needed |
| Mobile overlay behavior | Full-screen overlay with inert push + scroll lock (like fullscreen) | The overlay covers the full viewport, so background must be non-interactive |
| Desktop search | Instant hide tiles / show search (like fullscreen search swap) | Figma shows the nav link frame `hidden="true"` when search is open |

## Technical Approach

### File-by-file changes

#### 1. `src/nav.schema.ts` (line 1)

Add `'tile'` to the `VARIANTS` array:

```ts
export const VARIANTS = ['simple', 'fullscreen', 'sidebar', 'top', 'tile'] as const;
```

No other schema changes — `Variant` type auto-derives, `ControlMap` is unchanged.

#### 2. `src/controls.ts`

**`HIDDEN_CONTROLS` (line 8):** Add tile entry. Tile has a hamburger on mobile but not on desktop. Keep `button-style` visible (it affects mobile, same as simple). Hide `inset` initially (can revisit).

```ts
const HIDDEN_CONTROLS: Partial<Record<Variant, string[]>> = {
  top: ['button-style'],
  sidebar: ['inset'],
  tile: ['inset'],
};
```

**`setControl()` (line 45):** Add tile to the `top`-like behavior — force `open` to `false` on switch (desktop has no toggle, avoids stale open state):

```ts
if (val === 'top' || val === 'tile') {
  setControl(navRoot, 'open', 'false');
}
```

**`createVariantGroup()` (line 264):** Add SVG thumbnail for tile — a simple icon showing a header bar with rectangular filled blocks:

```ts
tile: `<svg viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="7" height="3" rx="0.5" fill="currentColor"/>
  <rect x="1" y="6" width="12" height="5" rx="0.5" fill="currentColor"/>
  <rect x="15" y="6" width="12" height="5" rx="0.5" fill="currentColor"/>
  <rect x="1" y="13" width="12" height="5" rx="0.5" fill="currentColor"/>
  <rect x="15" y="13" width="12" height="5" rx="0.5" fill="currentColor"/>
</svg>`,
```

#### 3. `src/nav.css`

Add a new section after the sidebar rules (~line 780, before the shared alignment overrides). Approximately 150-200 lines of new CSS organized as:

**a) Tile — shared closed-state grid (join existing selectors)**

Add `[data-variant="tile"]` to the shared closed-state grid selectors at lines 451-489 alongside simple, fullscreen, sidebar. This gives tile the same mobile header bar layout.

**b) Tile — mobile open state** (`[data-variant="tile"][data-open="true"]` inside `@container (max-width: 767px)`)

```css
/* Overlay fills preview */
[data-variant="tile"][data-open="true"] {
  position: absolute;
  inset: 0;
  z-index: 40;
}

/* Nav list becomes a 2-column tile grid */
[data-variant="tile"][data-open="true"] .nav__list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;          /* key: rows grow but siblings don't stretch */
  gap: 8px;
  padding: 16px;
}

/* Each link becomes a tile */
[data-variant="tile"][data-open="true"] .nav__item {
  list-style: none;
}

[data-variant="tile"][data-open="true"] .nav__link {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;   /* text at bottom */
  align-items: flex-start;     /* text at left */
  min-height: 143px;
  padding: 16px;
  background: var(--text-color);
  color: var(--menu-color);
}

/* Submenu expansion inside the tile */
[data-variant="tile"][data-open="true"] .nav__submenu {
  /* sub-items listed below parent in the same tile cell */
  padding: 8px 16px 16px;
  background: var(--text-color);
  color: var(--menu-color);
}
```

**c) Tile — desktop state** (`@container (min-width: 768px)`)

```css
@container (min-width: 768px) {
  /* Hide menu toggle on desktop */
  .nav[data-variant="tile"] .nav__menu-toggle { display: none; }

  /* Horizontal bar: logo | tiles | actions */
  .nav[data-variant="tile"] .nav__inner {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: stretch;
  }

  /* Tiles in a single row filling available space */
  .nav[data-variant="tile"] .nav__list {
    display: flex;
    gap: 8px;
  }

  .nav[data-variant="tile"] .nav__item {
    flex: 1;
  }

  .nav[data-variant="tile"] .nav__link {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: var(--text-color);
    color: var(--menu-color);
    height: 100%;
  }
}
```

**d) Tile — desktop search open**

```css
@container (min-width: 768px) {
  .nav[data-variant="tile"][data-search-open="true"] .nav__list {
    display: none;
  }
  /* Search field expands to fill the tile area */
  .nav[data-variant="tile"][data-search-open="true"] .nav__search {
    flex: 1;
  }
}
```

**e) Shared alignment overrides:** Add `[data-variant="tile"]` to the existing shared alignment selectors at lines 782-841 (center, right).

**f) Inset:** If supporting inset, add `[data-variant="tile"]` to the `:is()` selector at line 15-18.

#### 4. `src/nav.ts`

**`openMenu()` (line 255):** Add tile to the inert + scroll-lock conditionals:

```ts
// tile behaves like fullscreen: full overlay, needs inert + scroll lock
if (variant === 'simple' || variant === 'fullscreen' || variant === 'sidebar' || variant === 'tile') {
  inertPush();
}
if (variant === 'simple' || variant === 'fullscreen' || variant === 'tile') {
  lockPreviewScroll();
}
```

**`closeMenu()` (line 290):** Mirror the above:

```ts
if (variant === 'simple' || variant === 'fullscreen' || variant === 'sidebar' || variant === 'tile') {
  inertPop();
}
if (variant === 'simple' || variant === 'fullscreen' || variant === 'tile') {
  unlockPreviewScroll();
}
```

**Escape handler (line 430):** Tile follows the default behavior — Escape closes menu if open, no special treatment needed. Just ensure `variant !== 'top'` check doesn't accidentally exclude tile (it won't, since the check is for `top` specifically).

**Search toggle (line 356):** No override needed — tile search follows standard toggle behavior.

**Shop submenu (line 396):** No override needed — tile uses standard user-toggled submenu.

#### 5. `tests/nav-accessibility.spec.ts`

Add tests following established patterns:

- **Tile mobile overlay layout:** Switch to tile variant at 375px, open menu, verify `.nav__list` has `grid-template-columns` containing `1fr 1fr`, verify tiles have inverted colors
- **Tile desktop inline bar:** Switch to 768px+ viewport, verify menu toggle is hidden, verify `.nav__link` elements have filled background
- **Tile desktop search:** Open search on desktop, verify `.nav__list` is hidden, verify search input is visible and expanded
- **Tile escape key:** Open tile menu on mobile, press Escape, verify menu closes and focus returns
- **Tile submenu expand:** Open tile menu, click Shop dropdown, verify submenu items appear within the tile cell

## Acceptance Criteria

- [x] `'tile'` appears in VARIANTS array in `nav.schema.ts`
- [x] Tile variant is selectable in the controls panel with an SVG thumbnail
- [x] Mobile closed state: standard header bar with hamburger, search, cart
- [x] Mobile open state: full-screen overlay with 2-column tile grid
- [x] Mobile tiles show inverted colors (text-color fill, menu-color text)
- [x] Mobile submenu tiles expand vertically without stretching adjacent tile
- [x] Desktop: horizontal bar with filled tile cards, no hamburger
- [x] Desktop search: tiles hidden, full-width search input shown
- [x] Escape key closes tile menu on mobile, returns focus
- [x] Inert + scroll-lock applied when tile overlay opens
- [x] Alignment control (left/center/right) works correctly with tile
- [x] Button-style control affects mobile hamburger glyph
- [x] Capitalization control affects tile text
- [x] Cart drawer works from tile variant (mobile closed + desktop)
- [x] Playwright tests pass for tile layout, search, escape, and submenu

## Open Questions

| # | Question | Default Assumption |
|---|---|---|
| Q1 | Should the desktop tile variant support horizontal scrolling for many nav items (like top), or clip/wrap? | Tiles flex equally, overflow hidden with no scroll — matches Figma showing exactly 6 tiles fitting | i think wrap...
| Q2 | Should tile support the inset control? | No (hidden like sidebar) |
| Q3 | Exact tile corner radius? | 0px (sharp rectangles matching Figma) |
| Q4 | Should mobile tile overlay have an opening animation or instant appear? | Instant appear (matching simple variant) |
| Q5 | Is search available in the mobile tile overlay? | No — search only from closed header bar (matching simple variant behavior) |

## Dependencies & Risks

- **No new HTML markup needed** — the existing `nav.partial.html` structure supports tile layout via CSS alone
- **No new JS dependencies** — all behavior patterns already exist in `nav.ts`
- **Risk: color edge cases** — inverted tile colors (text-color as fill) may produce low-contrast combinations with certain color pairings (e.g., yellow menu + pink text). Mitigation: test all 30 color combinations in the prototype.
- **Risk: odd item counts** — with 3 or 5 items, the last row has a single tile at half width. This is acceptable and natural for a grid layout.

## References & Research

### Internal References
- Schema definition: `src/nav.schema.ts:1` (VARIANTS array)
- Shared closed-state grid: `src/nav.css:448-489`
- Variant behavior branching: `src/nav.ts:255-288` (openMenu), `src/nav.ts:290-320` (closeMenu)
- Controls variant picker: `src/controls.ts:264-269` (SVG thumbnails)
- Hidden controls map: `src/controls.ts:8-11`
- Test patterns: `tests/nav-accessibility.spec.ts`

### External References
- Figma design: https://www.figma.com/design/k5v90SoJHM2H4XQGNv3rId/sidebar-nav?node-id=1-325
- CSS Grid `align-items: start`: prevents row stretch for independent tile heights
- Container query self-styling limitation: container (`.nav`) cannot be styled inside `@container` blocks
