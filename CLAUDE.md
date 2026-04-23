# sections-menu

Interactive prototype for Big Cartel storefront sections. Vanilla TypeScript + Vite + Tailwind CSS v4. No framework.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck then build (`tsc && vite build`)
- `npm run test:e2e` — run Playwright e2e tests (auto-starts dev server on 127.0.0.1:4173)

## Architecture

Multi-component shell with two panels: a preview canvas (left) and a controls panel (right). A dropdown picker at the top of the controls panel switches between components. Each component (called a "Section") owns its own preview HTML, controls, behavior, and isolated state.

### Shell layer
- `src/shell.ts` — `Section`/`MountedSection` interfaces, section registry, `switchTo()` lifecycle (save → destroy → mount → init), state cache (`Map<string, Record<string, string>>`), viewport wiring, picker UI
- `src/main.ts` — registers sections, calls `initShell()`
- `index.html` — shell with `#preview-root`, `#controls-root`, `#controls-container`, and `#viewport-bar`

### Navigation section
- `src/nav.section.ts` — Section wrapper: init/destroy/saveState with correct destroy ordering (resetEphemeral → resetModuleState → cleanupNav → cleanupControls)
- `src/nav.partial.html` — raw HTML nav markup, imported via Vite `?raw`
- `src/nav.schema.ts` — source of truth for variant names, button styles, alignments, colors, and their TypeScript types
- `src/nav.ts` — nav behavior (menu toggle, search, submenu, cart drawer, inert management, scroll lock, focus return, escape handling). Exports `resetEphemeralState` and `resetNavModuleState`
- `src/nav.controls.ts` — builds the nav controls panel DOM, applies `data-*` attributes and CSS custom properties to the nav root. Returns handle with `cleanup()`, `setNavItemCount()`, `setCartCount()`, `navItemCount`
- `src/nav.css` — all nav styling, variant layouts, alignment grids, cart drawer

### Image Gallery section
- `src/gallery.section.ts` — Section wrapper: init/destroy/saveState
- `src/gallery.partial.html` — gallery items built dynamically from IMAGE_SETS in controls
- `src/gallery.controls.ts` — gallery controls (layout, columns, gap, aspect ratio, captions, image sets, lightbox, autoplay). Schema arrays inlined at top
- `src/gallery.slideshow.ts` — slideshow behavior: scroll-snap navigation, auto-play, pagination, keyboard, loop clones. Also reused by PDP media
- `src/gallery.css` — CSS Grid driven by data-attributes, container queries

### Single Image section
- `src/single-image.section.ts` — Section wrapper: init/destroy/saveState
- `src/single-image.partial.html` — single hero image with text content
- `src/single-image.controls.ts` — controls for background width, content width, border radius
- `src/single-image.css` — layout and typography, container queries

### PDP Buy Box section
- `src/pdp-buy-box.section.ts` — Section wrapper: init/destroy/saveState
- `src/pdp-buy-box.partial.html` — product detail page markup (media + details)
- `src/pdp-buy-box.ts` — core buy box behavior: product rendering, variant selection, pricing, stock labels, quantity
- `src/pdp-buy-box.controls.ts` — controls for layout (carousel/column/split), product picker, variant toggles, pricing display, aspect ratio, lightbox
- `src/pdp-buy-box.media.ts` — media slideshow: builds slides from product images, wires triggers for lightbox
- `src/pdp-buy-box.lightbox.ts` — Huckberry-style stacked lightbox with desktop thumbnail rail and mobile scroll
- `src/pdp-buy-box.data.ts` — product definitions with variants, stock counts, pricing, sold-out states
- `src/pdp-buy-box.css` — responsive two-column layout, variant chips, quantity stepper, info sections
- `src/pdp-buy-box.lightbox.css` — lightbox overlay, desktop rail, mobile stack

### Shared modules
- `src/lightbox.shared.ts` — shared lightbox utilities (focus trapping, scroll container, inert management, dialog positioning)
- `src/image.lightbox.ts` — FLIP-animated lightbox for single images and collections (used by gallery and single-image)
- `src/image.lightbox.css` — lightbox overlay, navigation, counter, animations
- `src/image.targets.ts` — zoom target resolution (`ZoomTarget`, `resolveZoomCollection`, `getZoomTrigger`)
- `src/image-radius.ts` — shared border radius stops and `applyImageRadius()` (used by gallery, single-image, PDP)
- `src/control-builders.ts` — `createStepperGroup`, `createSegmentedGroup` (used by all controls files)
- `src/range-control.ts` — `createLabeledRangeGroup` for range slider controls
- `src/colors.ts` — shared color palette (`COLORS`) and display labels
- `src/section-width.ts` — shared width schema (`BG_WIDTHS`, `CONTENT_WIDTHS`) for background/content width tiers
- `src/section-width.css` — 6/12-column grid system for section width tiers
- `src/controls.css` — controls panel styling (dark theme), picker styles
- `src/main.css` — Tailwind entry point, imports all section and shared CSS

## Adding a new section

1. Create `src/foo.partial.html` with a root element carrying `data-*` defaults and `style="--foo-prop: value"`
2. Create `src/foo.css` with styles driven by data-attribute selectors. Use `container-type: inline-size` on root
3. Create `src/foo.controls.ts` exporting `initFooControls(root, container)` → `{ cleanup() }`. Inline schema arrays at top
4. Create `src/foo.section.ts` implementing `Section` from `shell.ts`. Wire init/destroy/saveState
5. Import CSS in `src/main.css`
6. Register in `src/main.ts`: `registerSection(fooSection)`

## Conventions

- **Data-attribute driven**: component state is controlled via `data-*` attributes on the component root (`.nav`, `.gallery`, `.single-image`, `.pdp-buy-box`). CSS selectors target these attributes.
- **CSS custom properties**: each section scopes its own (`--menu-color`/`--text-color` for nav, `--gallery-color`/`--gallery-accent` for gallery, `--image-radius`/`--image-button-radius` shared by gallery/single-image/PDP).
- **BEM naming**: `.nav__*` for nav, `.gallery__*` for gallery, `.single-image__*` for single image, `.pdp-buy-box__*` for PDP, `.image-lightbox__*` for lightbox, `.controls__*` / `.control-group__*` for controls.
- **AbortController cleanup**: all `addEventListener` calls use `{ signal }`. Cleanup aborts the controller. Shell viewport listeners use a shell-level AbortController.
- **Inert reference counting**: `inertPush`/`inertPop`/`inertReset` manage the `inert` attribute on preview siblings.
- **Schema-first**: add new option values to the schema first, then wire CSS and controls. Nav uses `nav.schema.ts`; gallery inlines its schema in `gallery.controls.ts`.
- **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` are all enabled.
- **No framework abstractions**: all DOM manipulation is manual. Don't introduce React, Lit, or similar.
- **Container queries**: all section CSS files use `container-type: inline-size` on their root for responsive rules. Use `@container` queries (not `@media`) for responsive styles inside the preview.
- **State serialization keys**: `data-*` attributes are saved as plain keys, CSS custom properties as `css:--prop-name`, JS-only state as `custom:keyName`. The `custom:` prefix skips DOM restoration in `applyStateToRoot` — use only for state that requires JS-side restore logic (e.g., nav's `custom:navItemCount`).
- **Logos**: SVG mask images in `public/logos/`, applied via CSS `mask-image`.
- **Mount/unmount lifecycle**: sections are fully torn down and rebuilt on switch (not show/hide). This avoids listener conflicts, ID collisions, and stale observer state.
- **State-before-init**: when restoring a section, saved data-attributes and CSS properties are applied to the DOM *before* `init()` runs, so controls derive correct initial values from the DOM.
- **Destroy ordering is critical** for nav: `resetEphemeralState` → `resetNavModuleState` → `cleanupNav` → `cleanupControls`. Reversing this causes stale references.
- **Overlay containment**: never use `position: fixed` or `showModal()` inside `#preview-root`. Use `position: absolute` + `show()`. See `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`.

## Testing

Playwright e2e tests live in `tests/`. The test server runs on `127.0.0.1:4173`. Shared helpers (`checkRadio`, `setRangeValue`) are in `tests/helpers.ts`.

- `tests/nav-accessibility.spec.ts` — accessibility attributes, keyboard interactions, focus management, cleanup contracts, social links, edge cases
- `tests/shell-switching.spec.ts` — component switching, state round-trips, gallery controls, slideshow behavior, section width system, URL state serialization
- `tests/image-lightbox.spec.ts` — standalone (single-image) and collection (gallery) lightbox: open/close, keyboard, focus trap, inert management, scroll-close, viewport containment, border radius, slideshow coordination
- `tests/pdp-buy-box.spec.ts` — PDP mounting, product switching, variant interactions, pricing modes, sold-out states, quantity, media navigation, state persistence, responsive layout
- `tests/pdp-buy-box-lightbox.spec.ts` — PDP lightbox desktop/mobile modes, rail navigation, keyboard, focus trap, backdrop close, section-switch lifecycle
