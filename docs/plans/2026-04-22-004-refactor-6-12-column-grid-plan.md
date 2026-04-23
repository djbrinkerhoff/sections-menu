---
title: "refactor: Replace named-lines grid with 6/12-column grid"
type: refactor
status: completed
date: 2026-04-22
origin: docs/plans/feat-section-width-system.md
---

# refactor: Replace named-lines grid with 6/12-column grid

## Overview

Replace the 7-column CSS Grid named-lines pattern in `section-width.css` with a 6/12-column equal-width grid (6 columns at mobile, 12 at wider viewports). Content-width tiers become column spans instead of fixed pixel values. The TypeScript schema (`section-width.ts`) and control UI stay unchanged -- only the CSS implementation changes.

---

## Problem Frame

The current section-width system uses a "Layout Breakouts" pattern with 7 named-line tracks at fixed pixel values (narrow=480px, medium=768px, wide=1200px). This works but produces fixed-width content tiers that don't scale proportionally with the viewport. The Figma design specifies a column-count grid where tiers span proportional fractions of the grid (e.g., 8 of 12 columns for "medium"), matching the 6/12 pattern already used internally by the PDP buy-box section.

---

## Requirements Trace

- R1. Section root uses a 6-column grid at mobile, 12-column at 768px+
- R2. Content-width tiers map to column spans: narrow (6 at tablet, 4 at desktop), medium (8), wide (all 12 -- constrained to the grid), full (extends past the grid to the viewport edge)
- R3. "Hug content" background mode uses root padding to create the visual inset
- R4. "Full" background extends to section edges (bg uses negative margin to bleed past root padding)
- R5. Gallery slideshow reinit and lightbox closure on width changes still work
- R6. All existing sections (gallery, single-image) work with the new grid
- R7. Shared schema (`section-width.ts`) and control UI are unchanged
- R8. 16px column gutters, 16px default padding

---

## Scope Boundaries

- The `section-width.ts` schema and `control-builders.ts` are NOT modified
- Gallery/single-image HTML structure (sw-bg/sw-body classes) is NOT modified
- PDP buy-box and nav sections are not affected (they don't use the section-width system)
- Internal section layouts (gallery image grid, slideshow) are not changed -- they respond to body width via their own container queries

---

## Context & Research

### Relevant Code and Patterns

- `src/section-width.css` -- current 7-column named-lines grid (primary target)
- `src/section-width.ts` -- shared schema (`BG_WIDTHS`, `CONTENT_WIDTHS`) -- unchanged
- `src/gallery.css` -- gallery-specific overrides (background-color, nested `container-type: inline-size` on body)
- `src/single-image.css` -- single-image overrides (gradient background, 28px body padding)
- `src/pdp-buy-box.css:22-27` -- existing 6/12 pattern to follow: `repeat(6, minmax(0, 1fr))` at base, `repeat(12, minmax(0, 1fr))` at `@container (min-width: 736px)`
- `src/gallery.controls.ts:261-266` -- slideshow reinit on bgWidth/contentWidth changes
- `index.html:30` -- `#preview-root` sizing (`w-[375px]`, `overflow-y-auto`, `relative`)

### Institutional Learnings

- **Overlay containment** (`docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`): Never use `position: fixed` inside `#preview-root`. The lightbox dialog is a direct child of the section root (a grid item). Verify it still escapes normal flow via `position: absolute` after the grid change.
- **FLIP animation safety** (`docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`): `getBoundingClientRect()` measurements must happen before any layout mutation. The grid-template change at breakpoints is a layout mutation -- verify lightbox FLIP origin isn't measured during a reflow.

### Figma Reference

Three frames from the Kiln design file show the grid at 400px (6-col), 760px (12-col), and 1280px (12-col). Key measurements:

| Tier | 400px (6-col) | 768px+ (12-col) | 1280px+ (12-col) |
|------|---------------|------------------|-------------------|
| **Narrow** | all 6 cols | 6 of 12, centered | 4 of 12, centered |
| **Medium** | all 6 cols | 8 of 12, centered | 8 of 12, centered |
| **Wide** | all 6 cols | all 12 cols (constrained to grid) | all 12 cols (constrained to grid) |
| **Full** | all 6 cols | extends to viewport edge | extends to viewport edge |

Constants across all frames: 16px column gutters, 16px root padding. "Wide" content stays within the grid (padding + columns). "Full" content breaks out past the grid to the viewport edge.

---

## Key Technical Decisions

- **Named container query on `#preview-root`**: Add `container-type: inline-size; container-name: preview` to `#preview-root`. All section-width responsive rules use `@container preview (min-width: ...)` so they always resolve against the preview viewport width, not the section root's content-box (which shrinks in hug mode due to padding). This avoids breakpoint mismatches between bg modes. Existing unnamed `@container` queries in gallery/PDP CSS are unaffected -- they still match their nearest ancestor container (`.gallery__body`, `.pdp-buy-box`, etc.).

- **Root always has 16px padding -- this defines the grid**: The section root carries `padding: 16px` in all modes. The 6/12-column grid lives inside this padding. "Wide" content spans all 12 columns and stays within the grid. "Full" content breaks out past the grid to the viewport edge via negative margin on the body (`margin-inline: -16px`).

- **"Wide" = constrained to the grid, "Full" = extends to viewport edge**: Both span all 12 columns (`grid-column: 1 / -1`). "Wide" body stays within the root's padding -- content is bounded by the grid. "Full" body uses `margin-inline: -16px` to escape the padding, reaching the section root edges. This is the key distinction.

- **Background bleed for full-bg mode**: The `.sw-bg` element uses `margin-inline: -16px` to extend past root padding, filling edge-to-edge regardless of content-width. In hug mode, bg is hidden and the body carries its own background (existing behavior). Root padding creates the visible inset between the body and the section edges in hug mode.

- **6->12 breakpoint at 768px**: Matches the shell's viewport buttons (375/768/1280). The Figma labels the tablet frame "760" but 768px aligns with the existing system and PDP's breakpoint range.

- **Column widths are proportional, not fixed**: Unlike the named-lines system (narrow=480px fixed), the column system makes medium = 8/12 = ~67% of viewport at any size. This is the intended behavior change.

---

## Open Questions

### Resolved During Planning

- **Does `container-type: inline-size` on `#preview-root` break existing queries?**: No. Gallery uses named `@container gallery-section(...)` and unnamed `@container` that match `.gallery__body`. PDP uses unnamed queries matching `.pdp-buy-box`. None match `#preview-root`. Adding container-type to `#preview-root` is safe.

- **Can the section root style itself via @container?**: No -- `@container` styles descendants, not the container element itself. The section root's `grid-template-columns` change is styled via `@container preview` which matches the parent container (`#preview-root`).

- **Do column widths shift when toggling bg mode?**: No -- root always has `padding: 16px` regardless of bg mode. The grid columns stay the same width. Background bleed uses negative margin on `.sw-bg`, not padding removal on the root.

### Deferred to Implementation

- **Exact column gap behavior with negative margins**: Whether `margin-inline: -16px` on `.sw-bg` cleanly extends past root padding in all browsers needs implementation-time verification. The grid auto-placement handles edge cases differently in Safari vs Chrome for negative-margin grid items.

---

## Implementation Units

- [ ] U1. **Rewrite section-width grid**

**Goal:** Replace the 7-column named-lines grid with a 6/12-column grid, add container setup to `#preview-root`, and update all placement rules.

**Requirements:** R1, R2, R3, R4, R8

**Dependencies:** None

**Files:**
- Modify: `src/section-width.css`
- Modify: `index.html` (add container-type/name to `#preview-root`)

**Approach:**
- Add `container-type: inline-size; container-name: preview` to `#preview-root` (inline style or Tailwind class)
- Replace the `[data-bg-width][data-content-width]` grid template: `repeat(6, minmax(0, 1fr))` base, `repeat(12, ...)` at `@container preview (min-width: 768px)`
- Root always has `column-gap: 16px; padding: 16px` -- this defines the grid in all modes
- `.sw-bg`: `grid-row: 1; grid-column: 1 / -1; z-index: 0; margin-inline: -16px` (bleeds past root padding for edge-to-edge background)
- `.sw-body`: `grid-row: 1; z-index: 1; grid-column: 1 / -1` (base -- all 6 cols at mobile)
- At `@container preview (min-width: 768px)`: medium body → `grid-column: 3 / span 8`, narrow → `4 / span 6`
- At `@container preview (min-width: 1280px)`: narrow → `grid-column: 5 / span 4`
- Wide content-width: body stays `1 / -1` -- content constrained to the grid (within root padding)
- Full content-width: body at `1 / -1` with `margin-inline: -16px` -- content extends past the grid to the viewport edge
- Hug mode rules stay the same: `[data-bg-width="hug"] > .sw-bg { display: none }`, body gets border-radius + overflow:clip. Root padding creates the visible gap between body and section edges

**Patterns to follow:**
- PDP's `pdp-buy-box.css:22-27` -- `repeat(6, minmax(0, 1fr))` pattern
- Named container queries avoid interference with section-internal `@container` rules

**Test scenarios:**
- Happy path: gallery at 768px preview with content-width "medium" -- body visually occupies ~67% width, centered
- Happy path: gallery at 1280px with content-width "narrow" -- body occupies ~33% width (4 of 12 cols)
- Happy path: single-image at 375px -- all tiers collapse to same full width (6 cols)
- Edge case: toggle bg-width between full and hug -- bg layer hides/shows, body border-radius toggles
- Edge case: full bg + narrow content -- bg extends edge-to-edge, body is narrow centered
- Edge case: hug bg + wide content -- body spans full width within root padding, background has rounded corners and visible 16px margin from section edges

**Verification:**
- Gallery, single-image, and PDP sections all render without visual regressions at 375px, 768px, and 1280px viewports
- Width controls in both gallery and single-image update data attributes (existing test behavior)
- All bg-width / content-width combinations produce correct visual results
- Lightbox opens and closes without position bugs (overlay containment preserved)

---

- [ ] U2. **Verify consumers and update tests**

**Goal:** Confirm gallery and single-image sections work with the new grid, and update e2e tests for any changed behavior.

**Requirements:** R5, R6, R7

**Dependencies:** U1

**Files:**
- Modify: `src/gallery.css` (if body or bg overrides need adjustment)
- Modify: `src/single-image.css` (if body padding or hug override needs adjustment)
- Modify: `tests/shell-switching.spec.ts` (width test assertions)

**Approach:**
- Gallery: verify `.gallery__body` nested `container-type: inline-size` still fires column-count breakpoints correctly (the body's width now depends on column placement, which changes the inner container's inline-size)
- Gallery: verify slideshow reinit on width changes still works (the reinit path in `gallery.controls.ts` is JS-level and grid-independent, but slideshow snap-point positions change with column widths)
- Gallery: verify lightbox FLIP measurements are stable at all tiers
- Single-image: verify the 28px body padding override still applies over the shared 16px default
- Single-image: verify hug mode with gradient background renders the gradient on the body
- Update test for `gallery__bg` / `gallery__body` DOM structure assertion if any selectors changed
- Width controls test, state round-trip test, and URL serialization test should pass without changes (schema is unchanged)

**Patterns to follow:**
- Existing test patterns in `tests/shell-switching.spec.ts:1089-1142`

**Test scenarios:**
- Happy path: gallery grid layout at 768px with content-width "medium" shows correct column count via nested container query
- Happy path: gallery slideshow layout -- changing content-width mid-slideshow reinits correctly (no stale scroll position)
- Happy path: width state round-trips across section switches (unchanged behavior)
- Happy path: URL serialization of width settings (unchanged behavior)
- Integration: open lightbox in gallery at 768px with narrow content, verify FLIP animation origin is correct
- Integration: switch bg-width while lightbox is open -- lightbox closes before mutation (existing `closeLightboxForMutation` path)

**Verification:**
- All existing e2e tests pass (except pre-existing failures unrelated to this change)
- Gallery slideshow works correctly after width change at all three viewport sizes
- Lightbox opens/closes cleanly at all content-width tiers

---

## System-Wide Impact

- **Container query inheritance**: Adding `container-name: preview` to `#preview-root` creates a new named container in the ancestor chain. All `@container preview(...)` queries in any descendant will match it. Unnamed queries are unaffected. Gallery's `@container gallery-section(...)` and unnamed `@container(...)` queries continue to match `.gallery` and `.gallery__body` respectively.
- **Lightbox dialog**: The lightbox is a direct child of the section root (a grid item in the new 6/12 grid). It uses `position: absolute` with `inset: 0` and `z-index: 30`. The grid change does not introduce a new positioned ancestor between the dialog and `#preview-root`, so containment is preserved.
- **FLIP animation rects**: The grid-template-columns change at the 768px breakpoint is a layout mutation. FLIP measurements (`getBoundingClientRect()`) in `image.lightbox.ts` run before the dialog is shown, at a stable layout point. No FLIP-during-reflow risk from the grid itself. Width-control changes are gated behind `closeLightboxForMutation()`.
- **Unchanged invariants**: `section-width.ts` schema, `control-builders.ts` API, `gallery.controls.ts` width-change handling, `shell.ts` viewport mechanism, URL state serialization format -- all unchanged.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Negative-margin bg bleed interacts poorly with `overflow: clip` or grid auto-placement in Safari | Test in Safari during implementation. Fallback: bg uses `position: absolute; inset: 0` instead of negative margin |
| Gallery nested container breakpoint fires at wrong width after column-placement change | Body width is now proportional, not fixed. Verify gallery column-count breakpoint (736px) still triggers correctly when body spans 8 of 12 cols at 768px viewport (~512px body width → below 736px → 2 columns. This is correct) |
| Slideshow scroll-snap points shift on width change | Already mitigated by existing `reinitSlideshow()` call on bgWidth/contentWidth changes |

---

## Sources & References

- **Prior plan:** `docs/plans/feat-section-width-system.md`
- **Figma:** Kiln file, nodes 5518:13794 (400px), 5581:14092 (760px), 5581:14184 (1280px)
- **PDP pattern:** `src/pdp-buy-box.css:22-27` (6/12-column grid reference)
- **Lightbox containment:** `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`
- **FLIP safety:** `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`
