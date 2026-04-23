---
title: "feat: Add shape mask system to single-image section"
type: feat
status: active
date: 2026-04-23
origin: docs/brainstorms/2026-04-23-single-image-mask-shapes-requirements.md
deepened: 2026-04-23
---

# feat: Add shape mask system to single-image section

## Overview

Replace the single-image section's border-radius control with a shape mask system. Users pick from 6 mask shapes (circle, arch, blob, diamond, star, heart) via a visual swatch picker. Each mask is an SVG file applied via CSS `mask-image`, forcing a specific aspect ratio on the image. The system is extensible: adding a shape = drop an SVG file + add one schema entry.

---

## Problem Frame

The single-image section offers only border-radius as a shape control. Decorative mask shapes (circles, arches, organic blobs) create more expressive layouts. The mask system needs to ship with 6 shapes and be trivially extensible. (see origin: `docs/brainstorms/2026-04-23-single-image-mask-shapes-requirements.md`)

---

## Requirements Trace

- R1. Schema array with identifier, label, SVG path, and forced aspect ratio per shape
- R2. Two-step extensibility: add SVG file + add schema entry
- R3. SVG assets: black-on-transparent, standalone files, geometric and organic both supported
- R4. Mask forces aspect ratio on the image container
- R5. Mask replaces border-radius entirely — "None" = sharp corners, no radius slider
- R6. Lightbox shows full unmasked image regardless of active mask
- R7. Picker is a grid of shape swatches with solid-color-filled silhouettes
- R8. Selected shape has a visible selection ring, single selection
- R9. "None" = outlined empty rectangle, visually distinct
- R10. Active mask persisted as `data-*` attribute, survives section switching

**Origin acceptance examples:** AE1 (covers R4, R5), AE2 (covers R5), AE3 (covers R6), AE4 (covers R2, R3)

---

## Scope Boundaries

- 6 mask shapes: circle, arch, blob, diamond, star, heart. "None" is a 7th option, not a shape
- Single-image section only — gallery and PDP continue using `image-radius.ts` unchanged
- No animated transitions between shapes
- No user-uploadable custom masks
- No soft-edge or feathered masks (binary visible/hidden)

---

## Context & Research

### Relevant Code and Patterns

- **`variant-thumb` picker pattern** — already used in gallery (`src/gallery.controls.ts:292-334`), PDP (`src/pdp-buy-box.controls.ts:26-73`), and nav for visual radio-button pickers with SVG thumbnails. CSS in `src/controls.css:88-136`. Each option is a `<label class="variant-thumb">` with hidden radio input, `.variant-thumb__preview` span (contains inline SVG), and `.variant-thumb__label` text. Selected state: yellow `#F4D923` border + darker background. Previews use `viewBox="0 0 56 36"`
- **`control-group--style` hero control** — gives the first control full-width background, no top border, bottom separator. Used for layout pickers in gallery/PDP. Grid defaults to 2 columns, `--layout` modifier → 3 columns
- **`mask-image` in nav** — logos use `mask-image: url('/logos/bc-small.svg')` on a solid-color element, always dual-declared with `-webkit-mask-image`. Social icons use the same pattern
- **`image-radius.ts`** — shared module with `IMAGE_RADIUS_STOPS`, `applyImageRadius()`, `getImageRadiusIndex()`. Used by gallery, single-image, PDP. Single-image will stop using this; gallery/PDP continue unchanged
- **State serialization** — `data-*` attributes saved as camelCase keys by `saveState()`. Shell's `applyStateToRoot()` restores them before `init()`. CSS custom properties saved as `css:--prop-name`
- **Section-width hug mode** — `src/section-width.css:66-69` applies `border-radius: var(--image-radius, 8px)` to `.sw-body::before` pseudo. When single-image stops setting `--image-radius`, the fallback `8px` would still apply. Must explicitly reset this

### Institutional Learnings

- **Overlay containment** (`docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`): `mask-image` alone does not create a new containing block. Do not add `will-change: mask-image` — that would break containment
- **FLIP animation origin** (`docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`): `getBoundingClientRect()` returns the full element box regardless of masking. FLIP animations originate from the rectangular bounds, not the mask shape. This is acceptable behavior — test lightbox with each mask shape

---

## Key Technical Decisions

- **CSS `mask-image` over `clip-path`**: `mask-image` is already established in the codebase (nav logos). No `clip-path` usage exists anywhere. `mask-image` also supports future soft-edge masks if needed. Always dual-declare with `-webkit-mask-image`
- **SVG files in `public/masks/`**: Follows the `public/logos/` and `public/icons/` convention. Standalone assets editable in any SVG tool. Referenced via `url('/masks/{name}.svg')`
- **`variant-thumb` picker, not a new control type**: The existing visual radio-button pattern in gallery/PDP is exactly what the shape picker needs. Avoids inventing a new control component. New grid column modifier for 4 columns to fit 7 swatches (4+3 rows)
- **Shape picker as first/hero control**: The mask shape is the most impactful visual control. Use `control-group--style` to give it the hero position, matching gallery/PDP where layout is the hero. Width controls follow below
- **Aspect ratio via CSS custom property**: Set `--mask-aspect-ratio` on the section root from JS when a shape is selected. CSS applies `aspect-ratio: var(--mask-aspect-ratio)` on the image container. When "None", the property is removed and the image uses its natural dimensions
- **Derive CSS props from `data-mask`, don't persist them**: Only `data-mask` is serialized in state (automatically via `saveState()` dataset iteration). The controls `init()` looks up the mask ID in the schema and sets `--mask-src` and `--mask-aspect-ratio` from the schema entry. This avoids persisting fragile `url()` values in URL query strings and matches how `applyImageRadius()` derives CSS props from `data-radius`
- **Single-image stops using `--image-radius`**: Set `--image-radius: 0px` on the root to ensure section-width hug mode gets sharp corners. Remove the `data-radius` attribute and border-radius control entirely. Gallery/PDP unaffected. Lightbox image inherits `0px` border-radius — this is the intended behavior since masks replace radius entirely
- **Box-shadow conditional**: Keep `box-shadow` on `.single-image__trigger` when `data-mask="none"` (preserves current visual depth for the default state). Remove it when a mask is active via `[data-mask]:not([data-mask="none"])` selector

---

## Open Questions

### Resolved During Planning

- **CSS mechanism**: `mask-image` with `-webkit-` prefix. Already established in nav, supports both geometric and organic shapes
- **Picker swatch rendering**: Inline SVGs inside `.variant-thumb__preview` spans, matching the existing layout picker pattern. Each shape drawn as a filled `currentColor` silhouette in a `viewBox="0 0 56 36"` SVG
- **Aspect ratio + section-width interaction**: `aspect-ratio` on `.single-image__figure` constrains the image container. Section-width grid columns still control the outer container width. At narrow viewports, the image container takes full width and the aspect ratio maintains the shape's proportions. No conflict with container queries
- **Initial shapes**: Circle (1:1), Arch (3:4), Blob (4:5), Diamond (1:1), Star (1:1), Heart (1:1)
- **Hug mode radius**: When single-image uses masks, set `--image-radius: 0px` explicitly so the hug mode `::before` pseudo gets sharp corners
- **State persistence strategy**: Only persist `data-mask` (captured automatically by `saveState()` dataset iteration). CSS custom properties `--mask-src` and `--mask-aspect-ratio` are derived from the schema at init time, avoiding fragile `url()` values in URL query strings
- **Box-shadow on trigger**: Keep when `data-mask="none"` (current visual depth), remove when a mask is active (shadow on rectangular container behind masked shape looks wrong)
- **Lightbox border-radius**: With `--image-radius: 0px`, the lightbox image gets sharp corners for single-image. This is correct — masks replace radius entirely, so "sharp corners everywhere" is the consistent story

### Deferred to Implementation

- **Exact SVG paths for organic shapes (blob)**: The blob's freeform path is best authored in an SVG editor and tuned visually, not planned in advance
- **Swatch grid responsiveness**: Whether 4 columns needs a narrower breakpoint adjustment if the controls panel shrinks — test during implementation

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Schema (src/single-image.controls.ts, top of file):

  MASK_SHAPES = [
    { id: "none",    label: "None",    src: null,                  aspectRatio: null      },
    { id: "circle",  label: "Circle",  src: "/masks/circle.svg",   aspectRatio: "1 / 1"   },
    { id: "arch",    label: "Arch",    src: "/masks/arch.svg",     aspectRatio: "3 / 4"   },
    { id: "blob",    label: "Blob",    src: "/masks/blob.svg",     aspectRatio: "4 / 5"   },
    { id: "diamond", label: "Diamond", src: "/masks/diamond.svg",  aspectRatio: "1 / 1"   },
    { id: "star",    label: "Star",    src: "/masks/star.svg",     aspectRatio: "1 / 1"   },
    { id: "heart",   label: "Heart",   src: "/masks/heart.svg",    aspectRatio: "1 / 1"   },
  ]

Data flow:

  User clicks swatch
    → radio change handler reads shape.id
    → sets root.dataset.mask = shape.id
    → calls applyMask(root, shape.id) which:
      - looks up shape in MASK_SHAPES by id
      - if shape.src: sets --mask-src, --mask-aspect-ratio as inline CSS custom props
      - if "none": removes --mask-src and --mask-aspect-ratio
    → CSS selectors [data-mask]:not([data-mask="none"]) apply mask-image + aspect-ratio
    → onStateChange() triggers shell state serialization (only data-mask is persisted)

  On restore (init):
    → shell restores data-mask to DOM before init()
    → controls init reads root.dataset.mask
    → calls applyMask(root, maskId) to derive CSS props from schema
    → sets checked radio in picker

CSS application (src/single-image.css):

  .single-image__trigger when masked:
    - mask-image: var(--mask-src)
    - mask-size: contain
    - mask-repeat: no-repeat
    - mask-position: center
    - aspect-ratio: var(--mask-aspect-ratio)

  .single-image__image when masked:
    - object-fit: cover (fills the masked shape)
```

---

## Implementation Units

- [ ] U1. **SVG mask assets**

**Goal:** Create the 6 SVG mask files as standalone black-on-transparent shapes.

**Requirements:** R2, R3

**Dependencies:** None

**Files:**
- Create: `public/masks/circle.svg`
- Create: `public/masks/arch.svg`
- Create: `public/masks/blob.svg`
- Create: `public/masks/diamond.svg`
- Create: `public/masks/star.svg`
- Create: `public/masks/heart.svg`

**Approach:**
- Each SVG has a `viewBox` matching its natural aspect ratio (e.g., `0 0 100 100` for 1:1 shapes, `0 0 300 400` for 3:4 arch)
- Single `<path>` or `<shape>` element filled `#000` on transparent background
- No stroke, no opacity, no embedded styles — pure shape silhouette
- Circle: `<circle>`. Diamond: rotated `<rect>` or `<polygon>`. Arch: `<path>` with straight sides and semicircular top. Star: 5-point `<polygon>`. Heart: `<path>`. Blob: freeform `<path>` — design in SVG editor

**Patterns to follow:**
- `public/logos/bc-small.svg`, `public/logos/bc-stacked.svg` — standalone SVG assets in `public/`

**Test expectation:** none — static assets, validated visually in U3 and U5

**Verification:**
- Each SVG renders as a clean black shape when opened in a browser
- Shapes display correctly at various container sizes (no distortion, no clipping artifacts)

---

- [ ] U2. **CSS mask application + aspect ratio**

**Goal:** Add CSS rules that apply the mask and enforce aspect ratio when `data-mask` is set to a shape value.

**Requirements:** R4, R5

**Dependencies:** U1

**Files:**
- Modify: `src/single-image.css`
- Modify: `src/single-image.partial.html`

**Approach:**
- Update `.single-image` root in partial HTML: replace `data-radius="8"` with `data-mask="none"`, remove `style="--image-radius: 8px; --image-button-radius: 8px;"`, add `style="--image-radius: 0px"` (for section-width hug mode compatibility)
- Add CSS rules for `.single-image__trigger` and `.single-image__image` when `data-mask` is not `none`:
  - Apply `mask-image` and `-webkit-mask-image` via `var(--mask-src)` custom property
  - Apply `mask-size: contain`, `mask-repeat: no-repeat`, `mask-position: center` (and `-webkit-` equivalents)
  - Apply `aspect-ratio: var(--mask-aspect-ratio)` on `.single-image__figure`
  - Image uses `object-fit: cover` to fill the masked container
- When `data-mask="none"`: no mask properties, no aspect ratio constraint — image shows at natural dimensions with sharp corners
- Remove `border-radius: var(--image-radius, 8px)` from `.single-image__trigger` and `.single-image__image` — masks make border-radius irrelevant, and "None" means sharp corners
- Keep `box-shadow` on `.single-image__trigger` when `data-mask="none"` (preserves current visual depth). Remove it when a mask is active via `[data-mask]:not([data-mask="none"]) .single-image__trigger { box-shadow: none; }` — shadow on a rectangular container behind a circular mask looks wrong

**Patterns to follow:**
- `src/nav.css:88-89` — `mask-image` + `-webkit-mask-image` dual declaration on logo elements
- Data-attribute selectors like `[data-layout="grid"]` used throughout all section CSS files

**Test scenarios:**
- Happy path: Setting `data-mask="circle"` on the root and `--mask-src` / `--mask-aspect-ratio` custom properties causes the image to display as a circle with 1:1 aspect ratio
- Happy path: Setting `data-mask="none"` shows the full rectangular image with no mask and no border-radius
- Edge case: Image with extreme aspect ratio (very tall or very wide source) still fills the mask shape cleanly via `object-fit: cover`
- Edge case: At narrow container widths (< 500px), the masked image scales down proportionally without breaking the mask shape

**Verification:**
- Each mask shape displays correctly with the test image at default viewport
- "None" shows a clean rectangular image with sharp corners
- No visual artifacts at the mask edges

---

- [ ] U3. **Shape picker control**

**Goal:** Build the shape swatch picker UI, replacing the border-radius range control.

**Requirements:** R1, R5, R7, R8, R9, R10

**Dependencies:** U1, U2

**Files:**
- Modify: `src/single-image.controls.ts`

**Approach:**
- Define `MASK_SHAPES` schema array at the top of the file (following gallery's pattern of inlining schemas). Each entry: `{ id, label, src, aspectRatio, thumbnail }` where `thumbnail` is an inline SVG string for the swatch preview
- Remove the `image-radius.ts` import and the border-radius range control
- Build the shape picker using the `variant-thumb` pattern: fieldset with `control-group control-group--style`, legend "Shape", options div with classes `control-group__options control-group__options--shapes`, radio inputs per shape
- "None" swatch: its thumbnail SVG is an outlined rectangle (stroke only, no fill) — visually distinct from the filled shape silhouettes
- Other swatches: thumbnail SVGs use a filled `currentColor` shape silhouette in `viewBox="0 0 56 36"`, matching the existing layout picker thumbnail format
- On radio change: set `root.dataset.mask = shape.id`. If shape has `src`, set `--mask-src: url('{src}')` and `--mask-aspect-ratio: {ratio}` as inline styles. If "none", remove those custom properties. Call `onStateChange()`
- On init: read `root.dataset.mask` to determine the initially checked radio and set corresponding CSS custom properties
- Place the shape picker first in the controls (hero position), followed by background width and content width. The border-radius control is removed entirely

**Patterns to follow:**
- `src/gallery.controls.ts:292-334` — `createLayoutGroup()` with variant-thumb radio buttons and inline SVG previews
- `src/pdp-buy-box.controls.ts:26-73` — same pattern in PDP
- `src/controls.css:88-136` — variant-thumb styling with selection ring

**Test scenarios:**
- Covers AE1. Happy path: Clicking "Circle" swatch sets `data-mask="circle"` on the root, image displays as a circle with 1:1 aspect ratio, the circle swatch has a yellow selection ring
- Covers AE2. Happy path: Clicking "None" swatch sets `data-mask="none"`, image displays rectangular with sharp corners, no mask custom properties on the root
- Happy path: Each of the 6 shape swatches shows a filled silhouette; "None" shows an outlined rectangle
- Happy path: Only one shape can be selected at a time — selecting a new shape deselects the previous
- Edge case: On section restore (after switching away and back), the previously selected mask is re-applied correctly from saved state
- Integration: Changing the mask triggers `onStateChange()`, which causes the shell to serialize the state including `data-mask`

**Verification:**
- All 7 swatches render correctly in the controls panel
- Selection ring visually matches the existing layout picker selection ring
- Switching between shapes instantly updates the preview image
- No border-radius control appears anywhere in the single-image controls

---

- [ ] U4. **Lightbox compatibility + existing test updates**

**Goal:** Verify the lightbox shows full unmasked images, and update existing tests that reference the removed border-radius control.

**Requirements:** R6, R10

**Dependencies:** U2, U3

**Files:**
- Modify: `tests/image-lightbox.spec.ts`
- Modify: `tests/shell-switching.spec.ts`

**Approach:**
- **State serialization**: No changes needed to `src/single-image.section.ts`. The existing `saveState()` iterates `root.dataset`, which automatically captures `data-mask`. The CSS custom properties `--mask-src` and `--mask-aspect-ratio` are derived from the schema by the controls `init()` on restore (reads `data-mask` from DOM, looks up the shape in `MASK_SHAPES`, sets the CSS props). This matches how `applyImageRadius()` derives CSS props from `data-radius`
- **Lightbox**: The lightbox dialog is appended inside the section root (`host.appendChild(dialog)`), so it inherits `--mask-src` via the CSS cascade. However, the mask is safe because the CSS selectors target specific BEM classes (`.single-image__trigger`, `.single-image__image`), not the custom property generically. The lightbox's own elements (`.image-lightbox__image`) do not match these selectors. Verify with no code changes — add explicit test coverage
- **Existing test updates**: Three tests reference the removed border-radius control and will fail:
  - `tests/image-lightbox.spec.ts` — "border radius slider updates the standalone image and lightbox close button": delete or replace with a mask-related test
  - `tests/shell-switching.spec.ts` — "single-image border radius persists across section switches": replace with mask persistence test
  - `tests/shell-switching.spec.ts` — "URL state restores single-image border radius on reload": replace with mask URL state test

**Patterns to follow:**
- `src/single-image.section.ts:29-39` — current `saveState()` that iterates dataset (unchanged)
- `tests/shell-switching.spec.ts` — state round-trip and URL serialization test patterns

**Test scenarios:**
- Covers AE3. Integration: With circle mask active, opening the lightbox shows the full rectangular image — verify `.image-lightbox__image` has no `mask-image` CSS applied
- Happy path: Select "Arch" mask, switch to gallery section, switch back to single-image — arch mask is still active and image displays correctly
- Happy path: Select a mask, URL includes `single-image.mask={value}`, reload restores the mask
- Edge case: Select a mask, switch away, select a different section's controls, switch back — mask state is preserved independently

**Verification:**
- Mask survives round-trip section switching
- Lightbox shows the full unmasked image for every mask shape
- URL state serialization includes the mask value
- All previously passing tests continue to pass (with updated assertions)

---

- [ ] U5. **Controls CSS for shape picker grid**

**Goal:** Add the grid column modifier and any picker-specific styling to controls CSS.

**Requirements:** R7, R8, R9

**Dependencies:** U3

**Files:**
- Modify: `src/controls.css`

**Approach:**
- Add `.control-group__options--shapes` modifier with 4-column grid (7 items: 4+3 rows)
- The "None" swatch's outlined-rectangle thumbnail uses `stroke="currentColor"` with no fill — the variant-thumb selected state (yellow `currentColor`) automatically makes the outline yellow when selected
- No other variant-thumb styling changes needed — the existing selection ring (yellow border on `.variant-thumb__preview`) and label styling work as-is

**Patterns to follow:**
- `src/controls.css:84-85` — `control-group__options--layout` modifier for 3-column grid

**Test scenarios:**
- Happy path: Shape swatches display in a 4-column grid with proper spacing
- Happy path: "None" swatch shows an outlined rectangle, other swatches show filled shapes
- Happy path: Selected swatch has yellow border ring matching the existing layout picker selection style
- Edge case: Focus-visible state on keyboard navigation shows the same yellow ring + box-shadow as existing variant-thumb items

**Verification:**
- 7 swatches in a 4+3 grid layout with consistent spacing
- "None" is visually distinct from shape swatches
- Selection and focus states match existing variant-thumb behavior

---

- [ ] U6. **E2E tests for mask behavior**

**Goal:** Add Playwright tests covering mask selection, state persistence, and lightbox interaction.

**Requirements:** R4, R5, R6, R8, R10

**Dependencies:** U1–U5

**Files:**
- Create: `tests/single-image-masks.spec.ts`

**Approach:**
- Follow existing test patterns in `tests/shell-switching.spec.ts` and `tests/image-lightbox.spec.ts`
- Use shared helpers from `tests/helpers.ts` (`checkRadio`) for radio selection
- Navigate to single-image section, interact with shape swatches, verify `data-mask` attribute and visual state

**Test scenarios:**
- Covers AE1. Happy path: Selecting "Circle" sets `data-mask="circle"` on the section root
- Covers AE2. Happy path: Selecting "None" sets `data-mask="none"` and no mask CSS properties are present
- Happy path: Each of the 6 shapes can be selected and sets the correct `data-mask` value
- Happy path: Only one swatch has the selected state (checked radio) at a time
- Covers AE3. Integration: With a mask active, opening the lightbox — verify `.image-lightbox__image` element has no `mask-image` computed style (guards against CSS cascade leak)
- Integration: Select a mask, switch to gallery, switch back — `data-mask` is preserved and the mask is visually applied
- Edge case: The border-radius control does not exist in the single-image controls panel
- Edge case: URL state includes the mask value after selection
- Edge case: Arrow-key navigation between shape swatches moves focus and selection ring correctly (radio group keyboard behavior)

**Patterns to follow:**
- `tests/shell-switching.spec.ts` — section switching, state round-trips, URL serialization tests
- `tests/image-lightbox.spec.ts` — lightbox behavior, focus trap, inert management

**Verification:**
- All tests pass
- Coverage includes the full mask lifecycle: select → persist → restore → lightbox

---

## System-Wide Impact

- **Interaction graph:** The mask is applied via CSS on `.single-image__trigger` and `.single-image__image`. The lightbox (`src/image.lightbox.ts`) reads source rect from the trigger element's `getBoundingClientRect()` — this returns the full rectangular box regardless of masking, so FLIP animations are unaffected
- **Error propagation:** No error paths — mask application is pure CSS. If an SVG fails to load, `mask-image` falls back to showing the full image (graceful degradation)
- **State lifecycle risks:** CSS custom properties (`--mask-src`, `--mask-aspect-ratio`) are not persisted — they are derived from `data-mask` by the controls init on restore, matching how `applyImageRadius()` derives from `data-radius`. The `--mask-src` custom property is inherited by all children of the section root including the lightbox dialog, but is only consumed by BEM-scoped CSS selectors — this is safe but is a latent footgun if future code uses `var(--mask-src)` on lightbox elements
- **API surface parity:** Gallery and PDP continue using `image-radius.ts` — no changes to their border-radius controls. The `section-width.css` hug mode references `var(--image-radius, 8px)` which will fall back correctly when single-image sets `--image-radius: 0px`
- **Unchanged invariants:** `image-radius.ts` API and behavior are untouched. Gallery, PDP, and nav sections are not modified. The shell's state serialization mechanism is used as-is

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Safari `mask-image` rendering differences | Always dual-declare with `-webkit-mask-image`. Test in Safari during implementation |
| FLIP animation visual jank when opening lightbox from masked image | Acceptable: animation uses full bounding box. Test visually — if jarring, consider stripping mask during animation as follow-up |
| Organic SVG shapes (blob) looking poor at small sizes | Author SVGs with smooth curves and test at thumbnail scale in the swatch picker |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-23-single-image-mask-shapes-requirements.md](docs/brainstorms/2026-04-23-single-image-mask-shapes-requirements.md)
- Existing variant-thumb picker pattern: `src/gallery.controls.ts:292-334`, `src/pdp-buy-box.controls.ts:26-73`
- Existing mask-image usage: `src/nav.css:88-89`
- Image radius shared module: `src/image-radius.ts`
- Overlay containment learning: `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`
- FLIP animation origin learning: `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`
