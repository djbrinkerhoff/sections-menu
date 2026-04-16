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
- `src/controls.ts` — builds the nav controls panel DOM, applies `data-*` attributes and CSS custom properties to the nav root. Accepts `(navRoot, container)` params. Returns handle with `cleanup()`, `setNavItemCount()`, `setCartCount()`, `navItemCount`
- `src/nav.css` — all nav styling, variant layouts, alignment grids, cart drawer

### Image Gallery section
- `src/gallery.section.ts` — Section wrapper: init/destroy/saveState
- `src/gallery.partial.html` — gallery markup with 9 placeholder gradient images
- `src/gallery.controls.ts` — gallery controls (columns, gap, aspect ratio, captions). Schema arrays inlined at top
- `src/gallery.css` — CSS Grid driven by data-attributes, container queries

### Shared
- `src/controls.css` — controls panel styling (dark theme), picker styles
- `src/main.css` — Tailwind entry point, imports nav.css, gallery.css, and controls.css

## Adding a new section

1. Create `src/foo.partial.html` with a root element carrying `data-*` defaults and `style="--foo-prop: value"`
2. Create `src/foo.css` with styles driven by data-attribute selectors. Use `container-type: inline-size` on root
3. Create `src/foo.controls.ts` exporting `initFooControls(root, container)` → `{ cleanup() }`. Inline schema arrays at top
4. Create `src/foo.section.ts` implementing `Section` from `shell.ts`. Wire init/destroy/saveState
5. Import CSS in `src/main.css`
6. Register in `src/main.ts`: `registerSection(fooSection)`

## Conventions

- **Data-attribute driven**: component state is controlled via `data-*` attributes on the component root (`.nav`, `.gallery`). CSS selectors target these attributes.
- **CSS custom properties**: each section scopes its own (`--menu-color`/`--text-color` for nav, `--gallery-color`/`--gallery-accent` for gallery).
- **BEM naming**: `.nav__*` for nav, `.gallery__*` for gallery, `.controls__*` / `.control-group__*` for controls.
- **AbortController cleanup**: all `addEventListener` calls use `{ signal }`. Cleanup aborts the controller. Shell viewport listeners use a shell-level AbortController.
- **Inert reference counting**: `inertPush`/`inertPop`/`inertReset` manage the `inert` attribute on preview siblings.
- **Schema-first**: add new option values to the schema first, then wire CSS and controls. Nav uses `nav.schema.ts`; gallery inlines its schema in `gallery.controls.ts`.
- **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` are all enabled.
- **No framework abstractions**: all DOM manipulation is manual. Don't introduce React, Lit, or similar.
- **Container queries**: both nav.css and gallery.css use `container-type: inline-size` on their root for responsive rules.
- **Logos**: SVG mask images in `public/logos/`, applied via CSS `mask-image`.
- **Mount/unmount lifecycle**: sections are fully torn down and rebuilt on switch (not show/hide). This avoids listener conflicts, ID collisions, and stale observer state.
- **State-before-init**: when restoring a section, saved data-attributes and CSS properties are applied to the DOM *before* `init()` runs, so controls derive correct initial values from the DOM.
- **Destroy ordering is critical** for nav: `resetEphemeralState` → `resetNavModuleState` → `cleanupNav` → `cleanupControls`. Reversing this causes stale references.
- **Overlay containment**: never use `position: fixed` or `showModal()` inside `#preview-root`. Use `position: absolute` + `show()`. See `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`.

## Testing

Playwright e2e tests live in `tests/`. The test server runs on `127.0.0.1:4173`.

- `tests/nav-accessibility.spec.ts` — accessibility attributes, keyboard interactions, focus management, cleanup contracts, social links, edge cases
- `tests/shell-switching.spec.ts` — component switching, state round-trips, gallery controls, viewport persistence, controls sync after restore
