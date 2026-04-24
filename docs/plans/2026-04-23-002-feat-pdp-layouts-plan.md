---
title: "feat: Add column and split PDP layouts"
type: feat
status: active
date: 2026-04-23
---

# feat: Add column and split PDP layouts

## Overview

Add two new layout modes to the PDP Buy Box section — **column** and **split** — alongside the existing layout which becomes **carousel**. The default layout changes to column. All three layouts share the same mobile layout (single column with slideshow). Column and split share the same medium breakpoint (6/6 grid, sticky sidebar, stacked images). They diverge at the large breakpoint: column shows a hero + 2-column image grid with a sticky sidebar, while split uses a 3/6/3 three-zone layout with sticky side rails flanking a scrollable image column.

---

## Problem Frame

The current PDP has a single carousel layout. Real storefronts need layout variety — some products benefit from seeing all images at once (column), and some benefit from separating product info from the buy action (split). This adds those layout options while keeping carousel available.

---

## Requirements Trace

- R1. Three PDP layouts: carousel (current behavior), column (new default), split (new)
- R2. Layout switchable via a control, persisted in state
- R3. Mobile layout identical for all three (single column, slideshow)
- R4. Column and split medium: 6/6 grid, stacked images, sticky sidebar
- R5. Column large: 7/5 grid, hero image + 2-column sub-grid, sticky sidebar
- R6. Split large: 3/6/3 grid — info rail (sticky) | media (scrolls) | buy rail (sticky)
- R7. Sticky behavior: sidebar sticks while images scroll, then everything scrolls when images end
- R8. Rail content that exceeds viewport height scrolls at end of image list (split large)
- R9. Default layout is column

---

## Scope Boundaries

- Layout structure and grid behavior only — no changes to typography, colors, spacing, or component styling
- No new lightbox behavior (existing lightbox continues working in all layouts)
- No changes to the product data model or variant logic
- No autoplay or slideshow controls for column/split media grids

---

## Context & Research

### Relevant Code and Patterns

- `src/pdp-buy-box.partial.html` — current HTML with `__media` + `__details` as direct grid children of `__layout`
- `src/pdp-buy-box.css` — 6/12 grid with `@container` queries at 736px and 1100px; `__details` is `display: grid; gap: 16px; align-content: start`
- `src/pdp-buy-box.media.ts` — slideshow-only media rendering via `initSlideshow()`, builds `gallery__item > gallery__trigger > gallery__image` figures
- `src/pdp-buy-box.controls.ts` — controls panel using `createSegmentedGroup` pattern
- `src/gallery.controls.ts` — reference pattern for layout switching with `HIDDEN_CONTROLS` map, `syncControlVisibility()`, and `onLayoutChange()` lifecycle (cleanup → set attribute → init → sync)
- `src/gallery.css` — reference for grid vs slideshow CSS driven by `data-layout` attribute
- `src/gallery.slideshow.ts` — creates clone elements for loop, manages scroll-snap, adds prev/next + pagination behavior

### Institutional Learnings

- **Overlay containment** (`docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`): `position: fixed` is broken inside `#preview-root`. Use `position: sticky` only when the scroll container is an ancestor within preview-root — which it is here (the preview panel scrolls the section content). Do not use `position: fixed` for sidebar pinning.
- **FLIP animation origin** (`docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`): Layout changes (grid reflow from layout switching) can break lightbox FLIP animations. Close the lightbox before layout mutations, consistent with the gallery's `closeLightboxForMutation()` pattern.

---

## Key Technical Decisions

- **HTML grouping with `__buy` / `__info-group` wrappers**: Inside `__details`, wrap buy controls (header → shipping-note) in `.pdp-buy-box__buy` and info sections (description + shipping `<details>`) in `.pdp-buy-box__info-group`. This keeps a single `__details` element for non-split layouts while enabling split-large to reposition the two groups independently
- **`display: contents` for split large**: At the large breakpoint, `[data-pdp-layout="split"] .pdp-buy-box__details` gets `display: contents` so `__buy` and `__info-group` participate directly in the parent 12-column grid. This avoids DOM restructuring — the two groups live inside `__details` for all layouts but are "promoted" to grid-level for split-large only
- **CSS-driven media mode**: The slideshow is always initialized (preserving mobile slideshow for all layouts). For column/split at ≥736px, CSS overrides the slideshow flex layout to a static grid, hides nav/pagination buttons, and hides clone elements. The slideshow JS becomes inert but harmless. This avoids needing JS container-width detection or ResizeObserver-based mode switching
- **Sticky via `position: sticky`**: Works inside `#preview-root` because the scroll container (preview panel) is a direct ancestor within preview-root. The `top` value matches the layout's `padding-top` per breakpoint to maintain alignment
- **Layout attribute on section root**: `data-pdp-layout` on `.pdp-buy-box` — consistent with how gallery uses `data-layout` on its root for CSS targeting

---

## Open Questions

### Resolved During Planning

- **Can `position: sticky` work inside `#preview-root`?**: Yes — institutional learnings confirm it works when the scroll container is a direct ancestor within preview-root. Only `position: fixed` (viewport-relative) is broken by the containment architecture.
- **How to reposition info sections for split without DOM moves?**: `display: contents` on `__details` at split-large lets children participate in the parent grid without restructuring the DOM.
- **How to handle mobile vs medium media modes?**: CSS-only — slideshow is always initialized, CSS overrides to grid at medium+ for column/split. No JS mode switching needed.

### Deferred to Implementation

- **Exact sticky `top` value**: Needs to match the layout's `padding-top` per breakpoint (16px mobile, 48px medium+). May use a CSS custom property or hard-code per container query. Verify visually.
- **Slideshow sync on layout change**: When switching TO carousel from column/split, call `syncLayout()` to reset the slideshow scroll position (the grid had been overriding the flex layout). Verify this is sufficient or if `goToIndex(0)` is needed.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

### HTML structure (after restructure)

```
.pdp-buy-box[data-pdp-layout="column|carousel|split"]
  └── .pdp-buy-box__layout              (CSS grid: 6→12 cols)
        ├── .pdp-buy-box__media          (slideshow always init'd; CSS overrides for column/split)
        │     ├── .gallery__viewport
        │     │     ├── .gallery__grid   (flex→grid override at medium+ for column/split)
        │     │     ├── .gallery__prev   (hidden for column/split at medium+)
        │     │     └── .gallery__next   (hidden for column/split at medium+)
        │     └── .gallery__pagination   (hidden for column/split at medium+)
        └── .pdp-buy-box__details        (display:contents for split-large only)
              ├── .pdp-buy-box__buy            (header, price, bnpl, variants, purchase, note)
              └── .pdp-buy-box__info-group     (description + shipping <details>)
```

### Layout behavior by breakpoint

| Breakpoint | Carousel | Column | Split |
|---|---|---|---|
| **Mobile** (<736px) | Single col, slideshow | Single col, slideshow | Single col, slideshow |
| **Medium** (≥736px) | 6/6, slideshow | 6/6, stacked images, sticky sidebar | 6/6, stacked images, sticky sidebar |
| **Large** (≥1100px) | 7/5, slideshow | 7/5, hero+2col grid, sticky sidebar | 3/6/3, stacked images, 2 sticky rails |

### Split large grid (3/6/3)

```
┌──────────┬────────────────────────────┬──────────┐
│info-group│        media (scrolls)     │   buy    │
│ (sticky) │  [img] [img] [img] ...     │ (sticky) │
│          │                            │          │
│ desc...  │                            │ title    │
│ shipping │                            │ price    │
│          │                            │ variants │
│          │                            │ cart btn │
└──────────┴────────────────────────────┴──────────┘
 cols 1-3          cols 4-9              cols 10-12
```

---

## Implementation Units

- [x] U1. **Schema, HTML restructure, and baseline CSS**

**Goal:** Add the `data-pdp-layout` attribute with a `column` default, introduce `__buy` and `__info-group` wrappers inside `__details`, and adjust CSS so the current visual appearance is preserved exactly.

**Requirements:** R1, R9

**Dependencies:** None

**Files:**
- Modify: `src/pdp-buy-box.partial.html`
- Modify: `src/pdp-buy-box.css`

**Approach:**
- Add `data-pdp-layout="column"` to the `.pdp-buy-box` root element in the partial
- Wrap `<header>` through `<p class="pdp-buy-box__shipping-note">` in a `<div class="pdp-buy-box__buy">`
- Wrap the two `<details class="pdp-buy-box__info">` elements in a `<div class="pdp-buy-box__info-group">`
- Add `display: grid; gap: 16px; align-content: start` to both `__buy` and `__info-group` so their children maintain the same spacing that `__details`' grid currently provides
- The `margin-top: 16px` on the first `.pdp-buy-box__info` element (the separator spacing from buy section) needs to move to `__info-group` or be handled by the `__details` grid gap between `__buy` and `__info-group`
- Verify all `data-pdp-slot` queries from `pdp-buy-box.ts` still resolve (they query from root, so added wrappers are transparent to `querySelector`)

**Patterns to follow:**
- Gallery's `data-layout` attribute on its root element
- BEM naming: `__buy`, `__info-group` as children of `pdp-buy-box`

**Test scenarios:**
- Happy path: PDP renders identically with new wrappers — layout, spacing, and all interactive behaviors unchanged
- Edge case: all `data-pdp-slot` queries resolve correctly through the added wrapper divs
- Integration: lightbox still opens from gallery triggers through the new DOM structure

**Verification:**
- Visual diff: PDP looks exactly the same as before this unit
- All existing PDP e2e tests pass without modification

---

- [x] U2. **Layout control and switching logic**

**Goal:** Add a layout segmented control and wire layout switching to close the lightbox, sync media, and update control visibility.

**Requirements:** R1, R2

**Dependencies:** U1

**Files:**
- Modify: `src/pdp-buy-box.controls.ts`
- Modify: `src/pdp-buy-box.ts`

**Approach:**
- Add a segmented control (carousel / column / split) at the top of the controls panel, before the product picker. Use `createSegmentedGroup` with initial value from `root.dataset.pdpLayout ?? 'column'`
- On layout change: set `root.dataset.pdpLayout`, call `preview.syncLayout()`, and call `onStateChange()`
- In `pdp-buy-box.ts`, `syncLayout()` should close the lightbox before the layout attribute change takes effect (consistent with gallery's `closeLightboxForMutation()` pattern), then call `media.refresh()` to reset slideshow state
- The `saveState()` in `pdp-buy-box.section.ts` already captures all `root.dataset` entries, so `pdpLayout` is automatically persisted

**Patterns to follow:**
- Gallery's `onLayoutChange()` pattern: close lightbox → set attribute → sync media → update controls
- Existing segmented control usage in `pdp-buy-box.controls.ts`

**Test scenarios:**
- Happy path: layout control renders with three options (Carousel, Column, Split)
- Happy path: clicking an option updates `data-pdp-layout` on root
- Happy path: layout state persists through section switch round-trip
- Happy path: default layout is column when no saved state exists
- Edge case: rapid layout switching causes no JS errors
- Integration: switching layout closes any open lightbox

**Verification:**
- Control changes the `data-pdp-layout` attribute
- Layout survives save → switch away → switch back → restore cycle
- No console errors during or after layout changes

---

- [x] U3. **Column layout CSS**

**Goal:** Implement column layout's image grid, sticky sidebar, and responsive behavior at medium and large breakpoints.

**Requirements:** R3, R4, R5, R7

**Dependencies:** U1, U2

**Files:**
- Modify: `src/pdp-buy-box.css`

**Approach:**
- **Mobile** (<736px): No layout-specific overrides. The slideshow remains active for all layouts per R3. Single column, images on top, details below — current behavior.
- **Medium** (≥736px) for column (and split, shared):
  - Grid stays 6/6 (same column assignment as carousel)
  - `__details` gets `position: sticky; top: 48px; align-self: start` — sticks at the scroll container top, aligned with the content area below the layout padding
  - Override `.gallery__grid` from slideshow flex to `display: grid; grid-template-columns: 1fr; gap: 16px` — images stack vertically
  - Override `.gallery__item` to remove `flex: 0 0 100%; scroll-snap-align/stop` properties
  - Hide `.gallery__prev`, `.gallery__next`, `.gallery__pagination` with `display: none`
  - Hide `[data-gallery-clone]` elements with `display: none`
  - Override `.gallery__viewport` to remove `overflow: hidden` so the static grid is fully visible
- **Large** (≥1100px) for column:
  - Grid stays 7/5 (same as carousel at this breakpoint)
  - Sticky sidebar continues from medium
  - `.gallery__grid` becomes `grid-template-columns: 1fr 1fr` — two equal columns
  - `.gallery__item:first-child` gets `grid-column: 1 / -1` — hero image spans full width
  - Remaining images fill the 2-column grid naturally
- All layout-specific selectors scoped by `[data-pdp-layout="column"]` (and `[data-pdp-layout="split"]` for medium shared rules)

**Patterns to follow:**
- Existing `@container (min-width: 736px)` and `@container (min-width: 1100px)` breakpoints
- Gallery's `[data-layout="grid"]` vs `[data-layout="slideshow"]` CSS selector pattern

**Test scenarios:**
- Happy path: column medium shows 6/6 grid with all images stacked vertically in left column
- Happy path: column large shows hero image spanning full media width, remaining images in 2-column sub-grid
- Happy path: details sidebar remains visible (sticky) while scrolling through images
- Edge case: 1 image — hero takes full width, no sub-grid row rendered
- Edge case: 2 images — hero takes full width, second image takes one cell in sub-grid
- Edge case: details column taller than media column — sticky behavior is natural (no odd snapping), both columns scroll normally

**Verification:**
- Column medium matches Figma column-medium reference (6/6, stacked images, details right)
- Column large matches Figma column-large reference (hero + 2-col grid, details right)
- Sticky details stays pinned while scrolling through a product with many images

---

- [x] U4. **Split layout CSS**

**Goal:** Implement the split layout's three-zone grid at large breakpoint with `display: contents` and sticky side rails.

**Requirements:** R4, R6, R7, R8

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `src/pdp-buy-box.css`

**Approach:**
- **Medium** (≥736px): Split shares column-medium's CSS (U3 already includes `[data-pdp-layout="split"]` in the shared selectors). No additional rules needed.
- **Large** (≥1100px) for split:
  - `[data-pdp-layout="split"] .pdp-buy-box__details` gets `display: contents`
  - `[data-pdp-layout="split"] .pdp-buy-box__info-group`: `grid-column: 1 / span 3; grid-row: 1; position: sticky; top: 48px; align-self: start`
  - `[data-pdp-layout="split"] .pdp-buy-box__media`: `grid-column: 4 / span 6; grid-row: 1` (override from the carousel/column 7-span)
  - `[data-pdp-layout="split"] .pdp-buy-box__buy`: `grid-column: 10 / -1; grid-row: 1; position: sticky; top: 48px; align-self: start`
  - Images in the center 6 columns stack vertically (single column, same as medium) — no hero + 2-col sub-grid for split
- The `display: contents` on `__details` is only at ≥1100px for split. At medium, `__details` remains a normal grid child with its buy/info children stacked inside

**Patterns to follow:**
- The `display: contents` technique: applied to a non-semantic wrapper `<div>` only, scoped to a single breakpoint/layout combination
- Existing `@container (min-width: 1100px)` breakpoint

**Test scenarios:**
- Happy path: split medium renders identically to column medium (shared 6/6 layout)
- Happy path: split large shows 3-zone layout — info left, images center, buy right
- Happy path: both side rails stick while scrolling through center images
- Edge case: rail content taller than viewport — rail sticks, then scrolls when image column ends
- Edge case: resize from large → medium collapses the 3-zone layout into the shared 2-column layout
- Edge case: very few images (1-2) — side rails stay positioned correctly, no layout collapse

**Verification:**
- Split medium matches Figma split-medium reference (identical to column-medium)
- Split large matches Figma split-large reference (3/6/3 with info | media | buy)
- Sticky side rails remain pinned while center images scroll

---

- [x] U5. **Tests**

**Goal:** Add e2e coverage for layout switching, state persistence, and layout-specific rendering.

**Requirements:** R1–R9

**Dependencies:** U1–U4

**Files:**
- Modify: `tests/pdp-buy-box.spec.ts`

**Approach:**
- Add a new `test.describe` group for PDP layouts
- Test layout control presence, switching, and attribute updates
- Test state round-trip across section switches
- Test that column/split hide slideshow navigation at wider viewports (may require viewport/preview-panel sizing in Playwright)
- Test default layout value

**Patterns to follow:**
- Existing `tests/pdp-buy-box.spec.ts` test structure and `describe` grouping
- `tests/helpers.ts` shared helpers (`checkRadio`)

**Test scenarios:**
- Happy path: layout control has three options (Carousel, Column, Split)
- Happy path: selecting each layout updates `data-pdp-layout` attribute on section root
- Happy path: layout state round-trips through section switch (navigate away, navigate back, layout preserved)
- Happy path: default layout is `column` on fresh mount
- Edge case: switching layout then switching product preserves layout attribute
- Integration: switching layout then opening lightbox works correctly

**Verification:**
- All new tests pass
- All existing PDP e2e tests continue to pass

---

## System-Wide Impact

- **Interaction graph:** Layout changes trigger lightbox close → attribute set → media refresh → control visibility sync. The shell's `saveState()` / `applyStateToRoot()` cycle handles the new `data-pdp-layout` attribute transparently since it iterates all `root.dataset` entries
- **State lifecycle risks:** The slideshow is always initialized, so layout switching doesn't require slideshow teardown/rebuild. CSS overrides make the slideshow inert for column/split at medium+. When switching TO carousel, `media.refresh()` resyncs the slideshow scroll position
- **Unchanged invariants:** All product data rendering (variants, pricing, stock), lightbox open/close/navigation, quantity stepper, and the controls panel structure remain unchanged. The layout attribute is additive — no existing data attributes or CSS custom properties are modified

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `position: sticky` doesn't behave as expected in `#preview-root` | Institutional learnings confirm it works when the scroll container is within preview-root. Verify visually in U3. Fallback: JS scroll-based positioning |
| `display: contents` on `__details` breaks JS element queries at split-large | Queries use `data-pdp-slot` selectors from the section root — `querySelector` traverses into `display: contents` children normally. Verify in U4 |
| Slideshow scroll position is wrong after switching from column/split to carousel | `media.refresh()` calls `syncLayout()` which resets slideshow geometry. If insufficient, call `goToIndex(0, { immediate: true })` on layout change |
| CSS specificity conflicts between layout-scoped and existing selectors | Layout selectors use `[data-pdp-layout="..."]` prefix which adds specificity naturally. Place layout rules after base rules in the file |
| Lightbox FLIP animation breaks after layout grid changes | Close lightbox before layout mutations, matching existing gallery pattern |
| Column large hero + 2-col grid with few images | CSS grid handles 1 image (spans full width, no second row) and 2 images (hero full width, one cell below) gracefully |

---

## Sources & References

- Figma column medium: https://www.figma.com/design/R0XZIBHkSCQkbUcirqg8vo/Kiln?node-id=5796-5653
- Figma column large: https://www.figma.com/design/R0XZIBHkSCQkbUcirqg8vo/Kiln?node-id=5796-5527
- Figma split medium: https://www.figma.com/design/R0XZIBHkSCQkbUcirqg8vo/Kiln?node-id=5796-5715
- Figma split large: https://www.figma.com/design/R0XZIBHkSCQkbUcirqg8vo/Kiln?node-id=5708-1773
- Overlay containment: `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`
- FLIP animation: `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`
