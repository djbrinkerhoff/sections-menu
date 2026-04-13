# sections-menu

Interactive nav prototype for Big Cartel storefronts. Vanilla TypeScript + Vite + Tailwind CSS v4. No framework.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck then build (`tsc && vite build`)
- `npm run test:e2e` — run Playwright e2e tests (auto-starts dev server on 127.0.0.1:4173)

## Architecture

Single-page app with two panels: a preview canvas (left) showing a nav component, and a controls panel (right) for configuring it live.

- `index.html` — shell with `#preview-root` and `#controls-root` containers
- `src/nav.partial.html` — raw HTML nav markup, imported via Vite `?raw`
- `src/nav.schema.ts` — source of truth for variant names, button styles, alignments, colors, and their TypeScript types
- `src/nav.ts` — nav behavior (menu toggle, search, submenu, cart drawer, inert management, scroll lock, focus return, escape handling)
- `src/controls.ts` — builds the controls panel DOM, wires viewport switcher, applies `data-*` attributes and CSS custom properties to the nav root
- `src/nav.css` — all nav styling, variant layouts, alignment grids, cart drawer
- `src/controls.css` — controls panel styling (dark theme)
- `src/main.css` — Tailwind entry point, imports nav.css and controls.css

## Conventions

- **Data-attribute driven**: nav state is controlled via `data-variant`, `data-open`, `data-button-style`, `data-alignment`, `data-capitalization`, `data-cart-icon`, `data-logo-style`, `data-cart-count` on the `.nav` root. CSS selectors target these attributes.
- **CSS custom properties**: `--menu-color` and `--text-color` on the nav root control theming.
- **BEM naming**: `.nav__*` for nav elements, `.controls__*` / `.control-group__*` for controls.
- **AbortController cleanup**: both `initNavBehavior` and `initControls` return cleanup functions that abort all listeners.
- **Inert reference counting**: `inertPush`/`inertPop`/`inertReset` manage the `inert` attribute on preview siblings.
- **Schema-first**: add new option values to `nav.schema.ts` first, then wire CSS and controls.
- **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters` are all enabled.
- **No framework abstractions**: all DOM manipulation is manual. Don't introduce React, Lit, or similar.
- **Container queries**: nav.css uses `container-type: inline-size` on `.nav` for responsive rules.
- **Logos**: SVG mask images in `public/logos/`, applied via CSS `mask-image`.

## Testing

Playwright e2e tests live in `tests/`. They test accessibility attributes, keyboard interactions (Escape key flows), focus management, and cleanup contracts. The test server runs on `127.0.0.1:4173`.
