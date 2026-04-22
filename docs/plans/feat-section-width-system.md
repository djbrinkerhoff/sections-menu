# feat: CSS Grid Section Width System

Two-axis width system for storefront sections: **background width** (how wide the visible background extends) and **content width** (how wide the content is within that background). Built as a CSS Grid primitive so any section using the same width values gets identical metrics.

## Enhancement Summary

**Deepened on:** 2026-04-17
**Research agents used:** architecture-strategist, pattern-recognition-specialist, code-simplicity-reviewer, performance-oracle, kieran-typescript-reviewer, julik-frontend-races-reviewer, building-components skill, web-design-guidelines skill, CSS Grid docs verifier, overlay-containment learner, FLIP-animation learner

### Key Improvements
1. Fixed critical CSS Grid bug: `grid-row: 1 / -1` does not work with implicit rows — must use `grid-row: 1`
2. Added two high-severity race condition guards: slideshow reinit on width changes, init-time constraint validation
3. Resolved all 5 open questions with research-backed answers
4. Simplified snap mode: `justify-self: center` alone is sufficient (no `width: fit-content` needed)
5. Added implementation guards from documented solutions (lightbox stacking, FLIP animation safety)

### Key Tension: Grid vs max-width

The simplicity reviewer argues the 7-column named-lines grid is over-engineered — `max-width` + `margin: auto` achieves the same visual in ~15 lines of CSS. The architecture strategist disagrees, arguing the grid is the right abstraction for a shared width primitive with consistent metrics across sections. **The user explicitly requested CSS Grid**, so this plan uses it, but notes that a simpler `max-width` fallback exists if the grid proves too complex during implementation.

---

## Overview

Sections currently fill `#preview-root` edge-to-edge with no width control. This feature introduces per-section width settings via two data attributes on the section root:

- `data-bg-width` — `full` | `contained`
- `data-content-width` — `full` | `wide` | `medium` | `narrow` | `snap`

Applied first to the Image Gallery section. Keep CSS in `gallery.css` for now (not a separate file) per YAGNI — extract to a shared `section-layout.css` only when a second section adopts it.

## Architecture

### CSS Grid Named Lines (the "Layout Breakouts" pattern)

The section root gets a 7-column CSS Grid with named lines defining concentric width tiers. Based on [Ryan Mulligan's Layout Breakouts pattern](https://ryanmulligan.dev/blog/layout-breakouts/).

```
[full-start] gutter [wide-start] breakout [medium-start] breakout [narrow-start] center [narrow-end] breakout [medium-end] breakout [wide-end] gutter [full-end]
```

Children place themselves via `grid-column: narrow` (or `wide`, `medium`, `full`). The `-start`/`-end` naming convention creates implicit named areas, so `grid-column: narrow` is shorthand for `grid-column: narrow-start / narrow-end`. **Confirmed**: this works without needing `grid-template-areas`.

### Width Tier Values

| Tier | Max-Width | Rationale |
|------|-----------|-----------|
| `narrow` | 640px | Optimal reading width (~65-75 chars). WordPress Gutenberg's `contentSize`. |
| `medium` | 960px | Two-column content. Classic grid width. |
| `wide` | 1200px | Standard page width. Bootstrap/Shopify range. |
| `full` | 100% | Edge-to-edge within `#preview-root`. |

The gutter tracks use `minmax(var(--sw-gap), 1fr)` where `--sw-gap: clamp(1rem, 4cqi, 2rem)`. The `4cqi` is resolved from `.gallery`'s own `container-type: inline-size` — the container's inline size is already known at custom property resolution time. The intermediate breakout tracks use `minmax(0, calc(...))` so they collapse gracefully. **Confirmed**: tracks with `minmax(0, 160px)` correctly shrink to 0 when the container is narrower than the tier.

### Grid Template

```css
/* In gallery.css (not a separate file — extract when a second section needs it) */

.gallery {
  /* ... existing container-type: inline-size stays ... */
  display: grid;
  grid-template-columns:
    [full-start] minmax(clamp(1rem, 4cqi, 2rem), 1fr)
    [wide-start] minmax(0, calc((1200px - 960px) / 2))
    [medium-start] minmax(0, calc((960px - 640px) / 2))
    [narrow-start] min(640px, 100% - clamp(1rem, 4cqi, 2rem) * 2) [narrow-end]
    minmax(0, calc((960px - 640px) / 2)) [medium-end]
    minmax(0, calc((1200px - 960px) / 2)) [wide-end]
    minmax(clamp(1rem, 4cqi, 2rem), 1fr) [full-end];
}
```

> **Research insight**: CSS custom properties work reliably inside `grid-template-columns` (all evergreen browsers). The custom property approach from the original plan is valid, but inlining the values directly is cleaner for a single-section implementation.

This composes cleanly with `container-type: inline-size` — both coexist on the same element. The grid resolves tracks from the extrinsic width provided by `#preview-root`. No circular dependency. Single layout pass.

### DOM Structure Change

Add `.gallery__bg` and `.gallery__body` inside `.gallery`:

```html
<!-- gallery.partial.html -->
<div class="gallery"
     data-bg-width="full" data-content-width="full"
     data-layout="grid" ...existing attrs...
     style="--gallery-color: #ffffff; --gallery-accent: #000000; ...">
  <div class="gallery__bg"></div>
  <div class="gallery__body">
    <h2 class="gallery__heading">Gallery</h2>
    <div class="gallery__viewport">
      <div class="gallery__grid">...items...</div>
      <button class="gallery__prev">...</button>
      <button class="gallery__next">...</button>
    </div>
    <div class="gallery__pagination" role="tablist">...</div>
    <div class="gallery__counter">1 of 12</div>
  </div>
</div>
```

**Why two inner elements?**

The two-axis system needs background and content at different widths simultaneously. Example: `bg-width="full"` + `content-width="narrow"` = full-width background with narrow centered content.

- `.gallery__bg` — empty div, placed on the grid at the **background** tier, carries `background-color` and optional `border-radius`. Sits behind content via `z-index`.
- `.gallery__body` — wraps all content, placed on the grid at the **content** tier.

Both sit in `grid-row: 1`. **Critical**: use `grid-row: 1`, NOT `grid-row: 1 / -1`. Negative line numbers only reference explicit grid rows — since no `grid-template-rows` is defined, all rows are implicit and `-1` would not work. With `grid-row: 1`, both items share the same implicit row and the taller element determines height.

> **Research insight**: `justify-self: center` on a grid item already causes it to shrink-wrap to content width (no longer fills grid area). Adding `width: fit-content` is redundant. Use `justify-self: center` alone for snap mode.

### Selector Safety (verified)

The DOM restructure is safe:
- **CSS**: All existing gallery CSS uses descendant selectors (e.g., `[data-columns="3"] .gallery__grid`). Zero direct-child (`>`) or sibling (`+`, `~`) selectors. Adding `.gallery__body` between `.gallery` and its children does not break any selector.
- **JS**: All `querySelector`/`querySelectorAll` calls from `galleryRoot` traverse the full subtree. Verified in `gallery.controls.ts`, `gallery.slideshow.ts`, `image.lightbox.ts`.

### Lightbox Stacking Guard

The lightbox dialog is appended as a **direct child of `.gallery`** (via `host.appendChild(dialog)` where host is `galleryRoot`). It sits as a grid sibling of `.gallery__bg` and `.gallery__body` with `z-index: 30`, safely above both `z-index: 0` and `z-index: 1`.

**Implementation guard**: The lightbox dialog must NEVER be moved inside `.gallery__body`. If it were, the `z-index: 1` stacking context on `.gallery__body` would cap the lightbox's effective z-index.

### Background Width Axis

```css
/* bg always in row 1, behind content */
.gallery__bg {
  grid-row: 1;
  z-index: 0;
  background-color: var(--gallery-color);
}

.gallery__body {
  grid-row: 1;
  z-index: 1;
  padding: 16px;
}

/* Full: bg edge-to-edge */
[data-bg-width="full"] > .gallery__bg {
  grid-column: full;
}

/* Contained: bg constrained to wide tier + rounded corners */
[data-bg-width="contained"] > .gallery__bg {
  grid-column: wide;
  border-radius: var(--section-radius, 12px);
  overflow: clip; /* not overflow: hidden — avoids creating scroll context */
}
```

For `contained`, the background is at the `wide` tier (1200px max), centered, with rounded corners. The space between viewport edge and the contained background shows the parent's background (`#preview-root` white).

> **Research insight**: Use `overflow: clip` (not `overflow: hidden`) on contained backgrounds. `overflow: hidden` creates a new scroll container that could interfere with slideshow scroll-snap. `overflow: clip` clips visually without affecting scrolling behavior.

### Content Width Axis

```css
/* Content placement via data-content-width */
[data-content-width="full"] > .gallery__body    { grid-column: full; }
[data-content-width="wide"] > .gallery__body    { grid-column: wide; }
[data-content-width="medium"] > .gallery__body  { grid-column: medium; }
[data-content-width="narrow"] > .gallery__body  { grid-column: narrow; }
```

### Snap Behavior

`snap` is the special case: the background collapses to hug the content's intrinsic width, like a card.

```css
[data-content-width="snap"] > .gallery__bg {
  display: none; /* hide the separate bg layer */
}

[data-content-width="snap"] > .gallery__body {
  grid-column: full;          /* occupy full grid so it has room to center */
  justify-self: center;       /* shrink-wrap to content AND center */
  max-width: 960px;           /* cap at medium tier to prevent huge cards */
  min-inline-size: 280px;     /* prevent collapse below usable width */
  background-color: var(--gallery-color);
  border-radius: var(--section-radius, 12px);
  padding: 16px;
}
```

When `snap` is active, `.gallery__body` carries its own background (combining bg + content roles). `justify-self: center` makes it shrink-wrap to content and center. No `width: fit-content` needed — `justify-self: center` already prevents the item from stretching to fill its grid area.

> **Snap + slideshow caution**: In snap mode, `.gallery__body` shrink-wraps. Slideshow items use `flex: 0 0 100%` referencing the body width, but the body's intrinsic width depends on the items — potential circular sizing. Add an explicit override: `[data-content-width="snap"][data-layout="slideshow"] > .gallery__body { justify-self: stretch; }` to disable snap for slideshow layout.

### Constraint: Content Cannot Exceed Background

When `bg-width="contained"`, content should not extend beyond the background. Enforce in JavaScript:

| bg-width | Available content-width options |
|----------|-------------------------------|
| `full` | `full`, `wide`, `medium`, `narrow`, `snap` |
| `contained` | `wide`, `medium`, `narrow`, `snap` |

Express constraints declaratively:

```ts
type BgWidth = (typeof BG_WIDTHS)[number];
type ContentWidth = (typeof CONTENT_WIDTHS)[number];
type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

const VALID_CONTENT_WIDTHS: Record<BgWidth, NonEmptyReadonlyArray<ContentWidth>> = {
  full: CONTENT_WIDTHS,
  contained: ['wide', 'medium', 'narrow', 'snap'],
};

function resolveContentWidth(bgWidth: BgWidth, current: string): ContentWidth {
  const allowed = VALID_CONTENT_WIDTHS[bgWidth];
  return allowed.includes(current as ContentWidth)
    ? (current as ContentWidth)
    : allowed[0]; // NonEmptyReadonlyArray makes [0] non-nullable
}
```

**Critical: Validate constraints on mount, not just in setControl.** URL hydration can produce invalid combinations (e.g., `bgWidth=contained&contentWidth=full`). Run `resolveContentWidth()` at the end of `initGalleryControls` after controls are built, before the first `onStateChange()`.

When auto-downgrading, batch both dataset writes and call `onStateChange()` once:
```ts
galleryRoot.dataset.bgWidth = 'contained';
if (galleryRoot.dataset.contentWidth === 'full') {
  galleryRoot.dataset.contentWidth = 'wide';
  // flip the content-width radio checked state
}
onStateChange(); // once, not twice
```

### Slideshow Reinit on Width Changes (HIGH priority)

When content-width changes while slideshow is active, `.gallery__viewport` width changes, causing IntersectionObserver, scroll-snap, and autoplay to race. The observer fires for intermediate positions, scroll-snap re-settles to a wrong offset, and autoplay computes stale `offsetLeft`.

**Fix**: Reinit the slideshow on bgWidth/contentWidth changes, same pattern as autoplay/timing:

```ts
if (key === 'bgWidth' || key === 'contentWidth') {
  if (slideshowHandle) {
    slideshowHandle.cleanup();
    slideshowHandle = initSlideshow(galleryRoot, signal);
  }
}
```

Also gate width changes behind `closeLightboxForMutation()` to prevent FLIP animation measurement bugs (per documented solution in `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`).

### FLIP Animation Safety

**Never animate `.gallery__body` grid-column transitions.** CSS transitions on grid-column would shift content during lightbox FLIP measurements, reintroducing the documented bug where `getBoundingClientRect()` returns mid-transition coordinates. Width changes must be instantaneous.

### Interaction with Gallery Layouts

**Grid layout**: Works naturally. `.gallery__grid` inside `.gallery__body` fills the body width.

**Slideshow layout**: `.gallery__viewport` fills `.gallery__body`. Slides are `flex: 0 0 100%` of the viewport. Content-width controls how wide the slideshow container is. Reinit slideshow on width changes (see above).

**Masonry layout**: Uses `column-count` inside `.gallery__grid`. Works within `.gallery__body`.

No layout-specific width hiding needed. Both controls stay visible for all layouts.

### Interaction with Existing Gallery Padding

Currently `.gallery` has `padding: 16px`. Remove it — the grid gutters (`clamp(1rem, 4cqi, 2rem)`) replace outer spacing. Add `padding: 16px` to `.gallery__body` in all modes. For `snap` mode, `.gallery__body` already gets padding (shown above).

### Container Query Breakpoint Re-evaluation

The existing `@container (min-width: 736px)` breakpoint was derived from `.gallery` having 16px padding (768 - 32 = 736). After removing padding from `.gallery` and using grid gutters, the gutter at 768px viewport is `clamp(1rem, 4cqi, 2rem)` = `clamp(16px, 30.72px, 32px)` = ~31px per side. But the container query fires against `.gallery`'s full width (768px), not the body's content width. So **the breakpoint value itself doesn't need to change** — what changes is when the breakpoint fires relative to actual content width. Verify visually that column counts look correct at the 768px viewport for each content-width tier.

### Narrow Viewport Behavior

At 375px, all tiers exceed the viewport. The breakout tracks collapse to 0 via `minmax(0, ...)`. All content-width options render at effectively the same width. This is acceptable — the controls still work, and their effect becomes visible at wider viewports.

> **UX guideline**: Do NOT disable controls when they have no visible effect. Instead, add description text to the Content Width control: `"Visible at wider viewports."` This follows the precedent of the Columns control description.

## File Changes

### Modified: `src/gallery.css`

- Remove `padding: 16px` and `background-color` from `.gallery`
- Add `display: grid` with named-lines template to `.gallery`
- Add `.gallery__bg` and `.gallery__body` rules with grid placement
- Add `[data-bg-width]` and `[data-content-width]` selectors
- Add snap behavior rules
- Add snap+slideshow override
- Keep `container-type: inline-size` and `min-height: 100%` on `.gallery`
- Use `overflow: clip` on contained bg element

### Modified: `src/gallery.partial.html`

- Add `data-bg-width="full" data-content-width="full"` to `.gallery` root
- Add empty `.gallery__bg` as first child
- Wrap existing content in `.gallery__body`

### Modified: `src/gallery.controls.ts`

- Add schema arrays:
  ```ts
  const BG_WIDTHS = ['full', 'contained'] as const;
  const CONTENT_WIDTHS = ['full', 'wide', 'medium', 'narrow', 'snap'] as const;
  ```
- Add `'bgWidth' | 'contentWidth'` to `GalleryControlKey` union
- Add `VALID_CONTENT_WIDTHS` constraint record with `NonEmptyReadonlyArray` type
- Add `resolveContentWidth()` pure function
- Add two `createSegmentedGroup()` controls under a "Width" section heading
- Add description text to Content Width control: `"Snap collapses background to content. Visible at wider viewports."`
- Add constraint logic in `setControl()`: batch writes, single `onStateChange()`
- Add init-time constraint validation after controls are built
- Reinit slideshow on bgWidth/contentWidth changes
- Gate width changes behind `closeLightboxForMutation()`
- Capture content-width fieldset reference for radio enable/disable sync

### Modified: `src/gallery.section.ts`

No changes needed — `saveState()` already iterates all `dataset` entries, so `bgWidth` and `contentWidth` are automatically persisted and restored.

### Modified: `src/main.css`

No changes needed — no new CSS file (keeping width rules in `gallery.css`).

### Modified: `tests/shell-switching.spec.ts`

Add tests for:
- Width controls change data attributes
- State round-trips (switch away and back, values persist)
- URL serialization of width settings
- Constraint enforcement on mount (invalid URL combos corrected)
- Slideshow reinit on width change (no stale scroll position)

## Acceptance Criteria

- [ ] Gallery renders with `data-bg-width="full"` and `data-content-width="full"` by default (matches current visual)
- [ ] Changing bg-width to `contained` constrains visible background to ~1200px centered with 12px rounded corners
- [ ] Changing content-width to `narrow` constrains gallery content to ~640px centered
- [ ] `snap` content-width collapses background to hug content, capped at 960px, min 280px
- [ ] Content-width cannot visually exceed bg-width (JS enforcement on mount and in setControl)
- [ ] Width settings persist across section switches
- [ ] Width settings serialize to URL query params
- [ ] Invalid URL combos (contained + full) are corrected on mount
- [ ] All three gallery layouts (grid, slideshow, masonry) work with all width combinations
- [ ] Slideshow reinits on width changes (no stale IntersectionObserver/scroll-snap state)
- [ ] Width changes gated behind `closeLightboxForMutation()` (FLIP animation safety)
- [ ] Lightbox dialog remains direct child of `.gallery` (not inside `.gallery__body`)
- [ ] All existing gallery controls still work correctly
- [ ] Responsive: at 375px viewport, all tiers collapse gracefully (no overflow)
- [ ] Controls use `createSegmentedGroup()` with human-readable labels and description text
- [ ] Existing e2e tests pass
- [ ] New e2e tests cover width state round-trips and constraint enforcement

## Resolved Open Questions

1. **Contained background outer spacing** — Use the grid gutters (`clamp(1rem, 4cqi, 2rem)`). They are responsive and already define the edge padding. No fixed value needed.

2. **Contained border-radius** — 12px via a new `--section-radius` custom property (separate from `--image-radius`). Section radius and image radius are semantically different concerns.

3. **Snap max-width cap** — Yes, cap at `960px` (medium tier). Also set `min-inline-size: 280px` to prevent collapse below usable width. Disable snap for slideshow layout (circular sizing).

4. **Shared class naming** — Not needed yet. Use gallery-specific names (`.gallery__bg`, `.gallery__body`) in `gallery.css`. Extract to shared names only when a second section adopts the system. This follows YAGNI and avoids the dual-BEM-block anti-pattern.

5. **Transitions** — No. CSS Grid column transitions would reintroduce the documented FLIP animation measurement bug. Width changes must be instantaneous. If transitions are ever added, they must be gated behind `closeLightboxForMutation()` and `prefers-reduced-motion: no-preference`, and never use `transition: all`.

## References

- [Ryan Mulligan — Layout Breakouts with CSS Grid](https://ryanmulligan.dev/blog/layout-breakouts/)
- [Josh Comeau — Full-Bleed Layout Using CSS Grid](https://www.joshwcomeau.com/css/full-bleed/)
- [Hubert Sablonniere — Grid Stacking](https://www.hsablonniere.com/prevent-layout-shifts-with-css-grid-stacks--qcj5jo/)
- [MDN — Named Grid Lines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Named_grid_lines) (implicit named areas from -start/-end convention)
- [MDN — Box Alignment in Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Box_alignment) (justify-self: center shrink-wraps without width: fit-content)
- [web.dev — CSS Grid](https://web.dev/learn/css/grid) (negative line numbers only for explicit grid)
- Existing solutions: `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`, `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`
- Existing gallery: `src/gallery.css:1-10`, `src/gallery.partial.html:1`, `src/gallery.controls.ts:10-26`
