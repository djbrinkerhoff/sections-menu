# feat: E-commerce Nav Prototyping Shell

_Plan last updated 2026-04-13 — ✨ pass 4 (Tailwind 4 migration): swapped Tailwind 3 for Tailwind 4 per directive; updated install, config, CSS import, and arbitrary-value syntax._

## Enhancement Summary

**Deepened on:** 2026-04-13 (pass 3); **Re-targeted:** 2026-04-13 (pass 4 — Tailwind 4)
**Agents run (pass 3):** `best-practices-researcher`, `framework-docs-researcher`, `architecture-strategist`, `pattern-recognition-specialist`, `kieran-typescript-reviewer`, `julik-frontend-races-reviewer`, `code-simplicity-reviewer`, `spec-flow-analyzer`.

### Pass 4: Tailwind 4 Migration

- **Install:** `npm i tailwindcss @tailwindcss/vite` (no PostCSS / no `tailwind.config.js` required).
- **Vite plugin:** add `tailwindcss()` to `vite.config.ts`.
- **CSS entry:** `@import "tailwindcss";` replaces v3's `@tailwind base; @tailwind components; @tailwind utilities;`.
- **Config is CSS-native:** any custom tokens live in `@theme { … }` blocks inside `main.css`. For this prototype we don't extend the default theme (colors are runtime CSS vars), so the `@theme` block is empty / optional.
- **Arbitrary-value shorthand:** `bg-(--menu-color)` replaces `bg-[var(--menu-color)]`. Type-hinted form is `bg-(color:--menu-color)` (parens, no `var()` wrapper). The v3 `bg-[color:var(--menu-color)]` form still works but is not idiomatic.
- **`@apply` in nested CSS modules** needs a `@reference "../main.css";` directive at the top of the module so Tailwind can resolve theme tokens (new in v4).
- **`data-*` / `group-data-*` named-group variants** (e.g. `group/nav` + `group-data-[variant=sidebar]/nav:…`) work identically to v3.2+. No changes needed there.
- **Browser requirements tighten slightly:** Safari 16.4+, Chrome 111+, Firefox 128+. Evergreen-only targets. Acceptable for a prototype; flag for the WYSIWYG builder if broader support is needed downstream.

### Key Improvements Incorporated (pass 3)

1. **Factual corrections** — `<dialog>` backdrop click does NOT close natively; moved `aria-expanded` from the search `<form>` to the toggle button; `showModal()` already makes siblings inert (no need to duplicate). _Pass 4 supersedes the previous v3 dist-tag correction._
2. **Type-safe controls contract** — `ControlMap` mapped type eliminates the `value: string` hole; `setControl(root, 'variant', 'banana')` is now a compile error. Dead ternary deleted.
3. **State reset on variant switch** — added a first-class `resetEphemeralState(root)` contract; variant/viewport changes close the menu, search, submenu, and cart. Fixes three real races.
4. **Magic-string source of truth** — introduced `src/nav.schema.ts` exporting `as const` tuples for every valid data-attribute value; consumed by controls panel and TS types.
5. **Accessibility gaps closed** — `aria-label` on menu-toggle flips ("Menu" ↔ "Close menu") with `data-open`; keyboard pattern for horizontal-scroll `top` nav specified; radio groups use native inputs + `peer-checked`; `inert` scope is explicit (preview content only, never the controls panel).
6. **Sidebar close mechanism documented** — document-level `pointerdown` handler, NOT an injected backdrop element, preserving the "no DOM mutation" contract.
7. **Acceptance criteria tightened and extended** — 7 new flow-gap ACs; byte-identity promoted from `console.log` to a Vitest unit test.
8. **Simplicity refactors adopted selectively** — CSS-only search expand with a single document-level `pointerdown` for click-outside; deferred focus trap for fullscreen/sidebar to pass-3 (documented follow-up); kept `<dialog>` for cart and submenu accordion (in original scope).

### New Considerations Discovered

- **Cross-control semantic conflicts** (menu color = transparent in fullscreen ≠ valid; text color = menu color → invisible) are now flagged as design-time warnings, not runtime guards.
- **`inert` reference counter** needed: fullscreen menu + open cart dialog can nest.
- **Variant switch should use `document.startViewTransition`** (optional polish, progressive enhancement).

---

## Overview

Build a single-page prototyping **shell** that previews an e-commerce navigation component, with:

1. **Four visual variants** (`simple`, `fullscreen`, `sidebar`, `top`) that all render from **one identical HTML fragment** — differences are CSS only.
2. **A custom controls panel** that mutates the nav's style and behavior live (style, menu color, button style, alignment, text color, capitalization, cart icon).
3. **Mobile-first responsive preview** with a viewport switcher (mobile / tablet / desktop / fluid).

**The hard constraint that shapes every decision below:** all four variants MUST render from one **identical HTML fragment**. The only thing that changes between variants is CSS and state data-attributes. This mirrors the target WYSIWYG builder, which emits one canonical DOM and themes it.

See reference screenshots in `plans/assets/`:

- [`nav-variants.png`](./assets/nav-variants.png) — the four variants in closed and open states.
- [`nav-controls.png`](./assets/nav-controls.png) — the controls panel design.

## Problem Statement / Motivation

We are isolating the top-of-page nav block out of a WYSIWYG builder so we can iterate on its visual design, confirm four visually distinct treatments can be produced from **one canonical DOM**, and give stakeholders a live control surface to tune the block without touching code. The prototype doubles as a reference implementation for what the builder must emit.

Without this shell, variants only exist in Figma and can't prove the "one DOM, four skins, seven discrete controls" contract actually holds.

## Proposed Solution

A Vite + vanilla TypeScript single-page app. **Tailwind CSS v4** is the styling language (installed via the `@tailwindcss/vite` plugin; no PostCSS or `tailwind.config.js` required). No runtime UI framework and no control-panel library — the controls panel is a small custom component built with the same Tailwind utilities.

Page layout:

```
┌──────────────────────────┬──────────────────────────┐
│  preview canvas          │  controls panel          │
│  (nav rendered at the    │  (design spec in         │
│   selected viewport;     │   plans/assets/          │
│   viewport switcher      │   nav-controls.png)      │
│   sits above the canvas) │                          │
└──────────────────────────┴──────────────────────────┘
```

- One shared `nav.partial.html` fragment is injected into a preview container.
- The `.nav` root carries **six data attributes** that drive every variant difference and every control:
  - `data-variant="simple|fullscreen|sidebar|top"`
  - `data-open="true|false"` (N/A for `top` — always treated as open)
  - `data-button-style="hamburger|plus|text"`
  - `data-alignment="left|center|right"`
  - `data-capitalization="normal|lowercase|uppercase"`
  - `data-cart-icon="cart|bag"`
- **Colors** are CSS custom properties set on the `.nav` root:
  - `--menu-color` (background) and `--text-color` are set by the controls panel via `style.setProperty`. Five preset swatches.
  - _Follow-up:_ move colors to `data-menu-color` / `data-text-color` attributes when the WYSIWYG builder schema is defined, for a uniform data-attr contract.
- **Tailwind's `group-data-*` variant** handles ancestor-driven utility switching. The nav root gets `class="group/nav ..."` and descendants style themselves via `group-data-[variant=sidebar]/nav:...` etc. (Works identically in v3.2+ and v4.)
- For rules that would produce an explosion of group-data chains (e.g. the fullscreen open-state fixed overlay), use `@apply` inside a scoped CSS block: `[data-variant="fullscreen"][data-open="true"] .nav__menu { @apply fixed inset-0 ...; }`. In v4, nested CSS modules that use `@apply` must include `@reference "../main.css";` at the top so theme tokens resolve.
- The controls panel is a custom right-hand sidebar built with Tailwind utilities. **Radio-group semantics** use native `<input type="radio">` inputs wrapped in `<fieldset><legend>` — free keyboard arrow-key navigation, no custom ARIA. Labels are styled as swatches / segmented buttons via the Tailwind `peer-checked:` variant.

### Why these choices

- **Tailwind 4** is the user requirement (switched from v3 in pass 4). Rust-based engine via `@tailwindcss/vite` is dramatically faster, CSS-native config eliminates a config file, and the new `bg-(--var)` shorthand plays very naturally with runtime-swappable CSS custom properties — exactly this prototype's theming model.
- **Vanilla TS over React:** the target is a WYSIWYG builder that emits raw HTML — no JSX abstraction between us and the DOM.
- **Custom controls panel (not Tweakpane/Leva):** the designed controls are all **discrete, themed widgets** (swatches, segmented buttons) — not generic sliders. A generic panel library would fight the design. A ~200-line custom component built in the same Tailwind language keeps the shell coherent.
- **`data-*` on the root + `group-data-*` utilities** is the 2026-idiomatic Tailwind pattern for "same markup, many skins" and keeps the mapping control → visual direct and grep-able.
- **Five fixed color swatches** expressed as CSS custom properties let Tailwind utilities read them via the v4 shorthand (`bg-(color:--menu-color)`) while the controls swap the var.
- **Native `<dialog>` for the slide-over cart:** focus trap, `::backdrop`, Escape-to-close, and sibling `inert` for free. _Correction: backdrop click-to-close is NOT free; add a JS handler._
- **`:focus-within` + JS click-outside for search expand:** mostly CSS, with one document-level `pointerdown` listener to handle click-outside (pure CSS can't detect that).

## Pass-2 Factual Corrections

> These were caught by the framework-docs and a11y agents. Applied inline below where relevant; collected here for reviewer traceability.

1. **`<dialog>` backdrop click does NOT close natively.** Either add a JS handler that checks `event.target === dialog`, or use the new `closedby="any"` attribute (which has no Safari support as of 2026; use the JS handler).
2. **`aria-expanded` belongs on the toggle button, not the `<form>`.** Previous draft placed `aria-expanded` on `<form class="nav__search">`; corrected to `.nav__search-toggle`.
3. **`showModal()` already makes siblings inert.** Do NOT set `inert` on siblings for the cart drawer — the browser handles it. For the fullscreen/sidebar menu (which is NOT a `<dialog>`), manual `inert` is still required.
4. **Tailwind 4 install** is `npm i tailwindcss @tailwindcss/vite`. No PostCSS or `tailwind.config.js` required; any theme tokens live in `@theme { }` blocks in `main.css`.
5. **`@starting-style` is not officially "Baseline"** yet per caniuse (~91% global support). Safe for Tailwind 4's evergreen targets; treat the animated dialog exit as progressive enhancement.
6. **Latest Vite stable is 8.0.8.** Plan's "Vite 8.x" claim is correct.

## The Four Variants

All four render from the same markup (below). Only the root `data-variant` attribute (plus `data-open`) changes.

### 1. `simple`

- **Closed:** top bar — hamburger (left), BIG CARTEL logo (center), search icon + cart icon (right).
- **Open:** top bar morphs — X (left), search icon + cart icon (right). Below the top bar, the link list wraps inline (flex-wrap) as uppercase blue text at smallish size. Shop category submenu opens inline as an accordion below the "Shop" link.
- **Layout:** inline / horizontal, content-preserving (doesn't cover the page).

### 2. `fullscreen`

- **Closed:** identical top bar to `simple`.
- **Open:** **full-viewport overlay** (`fixed inset-0`) in `--menu-color`. X in top-left of the overlay. Large bold vertical-stack link list centered (big type, ~48px). Cart "button" appears large at the bottom-center with an `"N items"` count label. Search icon is in the top bar of the overlay (next to the X).
- **Layout:** covers the preview container; `inert` applied to preview content (not controls panel); scroll locked on the preview container while open.
- **Desktop (1280px):** still `fixed inset-0` **within the preview container** (the viewport switcher constrains `.preview` width). The overlay scales up; type size increases at `md:` breakpoint.

### 3. `sidebar`

- **Closed:** identical top bar.
- **Open:** left-aligned drawer (~60–70% viewport width on mobile, fixed 320–360px on desktop) slides in from the left, colored with `--menu-color`. X at top-left of the drawer. Vertical link list (left-aligned, not huge type). Search and cart sit at the bottom of the drawer column. The rest of the preview remains visible (drawer does not cover preview viewport).
- **Close mechanism:** Escape key, clicking the X, OR clicking outside the drawer. Outside-click uses a **document-level `pointerdown` listener** that checks `composedPath()` — it does NOT inject a backdrop div (would violate the same-markup contract). See "Sidebar close mechanism" below.

### 4. `top`

- **Always "open":** no hamburger, no X. Top bar always shows the logo + inline horizontal link list + search + cart.
- **Overflow:** horizontal scroll (`overflow-x-auto`) for the link list when narrow.
- **`data-open`** is ignored for this variant. The hamburger button and menu-toggle affordance are hidden. `setControl` explicitly forces `data-open="false"` when switching to `top`.
- **Accessibility:** the scroll container has `tabindex="0" role="region" aria-label="Primary navigation"` so keyboard users can arrow-scroll. Gradient fade masks on the overflow edges are a visual affordance. Tab through links still works for reaching clipped items.
- **Below 375px:** may require horizontal scroll for the entire top bar (logo + actions). Acceptable; not a blocker for pass-3.

## Controls Panel (7 groups)

See [`plans/assets/nav-controls.png`](./assets/nav-controls.png).

Panel header: **"Menu"** + helper copy (`"Lorem Explain global nav so that they know it behaves differently than other blocks."`).

| # | Group           | Options                                    | Drives                                                                                                      |
|---|-----------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| 1 | **Style**       | `simple` · `fullscreen` · `sidebar` · `top` (2×2 thumbnail grid) | `data-variant` (also triggers `resetEphemeralState`)                                                        |
| 2 | **Menu color**  | 5 swatches: black · yellow · pink · light blue · transparent (checkerboard) | `--menu-color` custom property                                                                              |
| 3 | **Button style**| `hamburger` · `plus` · `text ("Menu")`    | `data-button-style` (all three glyphs pre-rendered in DOM; CSS shows the active one)                        |
| 4 | **Alignment**   | `left` · `center` · `right`                | `data-alignment` → `text-align` / flex `justify-*` on the link list                                         |
| 5 | **Text color**  | 5 swatches (same palette as Menu color; transparent is visually disabled — crossed-out swatch) | `--text-color` custom property                                                                              |
| 6 | **Capitalization**| `Aa` (normal) · `a↓` (lowercase) · `A↑` (uppercase) | `data-capitalization` → `text-transform`                                                                    |
| 7 | **Cart icon**   | `cart` · `bag`                             | `data-cart-icon` (both SVGs pre-rendered; CSS shows the active one)                                         |

Implementation: each group is a `<fieldset>` with `<legend>` and native `<input type="radio" name="group-name" hidden class="peer sr-only">` + `<label for="...">`. Selected state via `peer-checked:ring-2 peer-checked:ring-purple-500`. Keyboard arrow-navigation is free from native radio semantics.

**Color palette (shared by Menu color and Text color):**

| Name        | Swatch       | Hex / value       |
|-------------|--------------|-------------------|
| black       | ●            | `#000000`         |
| yellow      | ●            | `#F4D923`         |
| pink        | ●            | `#F8B4D0`         |
| light blue  | ●            | `#BEE8F0`         |
| transparent | checkerboard | `transparent`     |

> **Transparent text-color swatch is visually disabled in pass-3:** rendered as a crossed-out circle (diagonal line through the swatch, Figma "no fill" convention) with `aria-disabled="true"` and `pointer-events: none`. Tooltip: "Not available for text color." For Menu color it remains interactive (= "no background"), which is meaningful.

Selected state: the active swatch/button gets a purple ring (`ring-2 ring-purple-500 ring-offset-2`).

Below the 7 groups, an extra shell-only control group sits outside the "Menu" card: **Viewport**: `375` · `768` · `1280` · `fluid`. Changing the viewport also triggers `resetEphemeralState` — see below.

## Canonical HTML Markup (shared by all variants)

This is the **only** markup any variant may style. No element may be added, removed, reordered, or renamed — variants express visual difference through CSS utilities + custom properties keyed on the root's data attributes.

```html
<!-- src/nav.partial.html -->
<header
  class="nav group/nav"
  data-variant="simple"
  data-open="false"
  data-button-style="hamburger"
  data-alignment="left"
  data-capitalization="normal"
  data-cart-icon="cart"
  style="--menu-color: #ffffff; --text-color: #000000;"
>
  <div class="nav__inner">

    <button class="nav__menu-toggle" aria-expanded="false" aria-controls="nav-primary" aria-label="Menu">
      <!-- All three button-style glyphs present + a close glyph; CSS shows exactly one. -->
      <span class="nav__menu-toggle-glyph" data-glyph="hamburger" aria-hidden="true">
        <svg><!-- hamburger lines --></svg>
      </span>
      <span class="nav__menu-toggle-glyph" data-glyph="plus" aria-hidden="true">
        <svg><!-- plus icon --></svg>
      </span>
      <span class="nav__menu-toggle-glyph" data-glyph="text" aria-hidden="true">Menu</span>
      <span class="nav__menu-toggle-glyph" data-glyph="close" aria-hidden="true">
        <svg><!-- X --></svg>
      </span>
    </button>

    <a class="nav__logo" href="/" aria-label="Big Cartel home">
      <svg class="nav__logo-mark"><!-- fish mark --></svg>
      <span class="nav__logo-text">BIG CARTEL</span>
    </a>

    <nav id="nav-primary" class="nav__primary" aria-label="Primary">
      <ul class="nav__list">
        <li class="nav__item"><a class="nav__link" href="#">Home</a></li>
        <li class="nav__item nav__item--has-submenu">
          <button class="nav__link" aria-expanded="false" aria-controls="shop-submenu">Shop</button>
          <ul id="shop-submenu" class="nav__submenu" hidden>
            <li><a href="#">Category One</a></li>
            <li><a href="#">Category Two</a></li>
            <li><a href="#">Category Three</a></li>
            <li><a href="#">Category Four</a></li>
            <li><a href="#">Category Five</a></li>
          </ul>
        </li>
        <li class="nav__item"><a class="nav__link" href="#">About Us</a></li>
        <li class="nav__item"><a class="nav__link" href="#">Contact</a></li>
      </ul>
    </nav>

    <div class="nav__actions">
      <form class="nav__search" role="search" aria-label="Site search">
        <button
          class="nav__search-toggle"
          type="button"
          aria-label="Open search"
          aria-expanded="false"
          aria-controls="nav-search-input"
        >
          <svg class="nav__icon nav__icon--search"><!-- magnifier --></svg>
        </button>
        <input id="nav-search-input" class="nav__search-input" type="search" name="q" placeholder="Search" />
      </form>

      <button class="nav__cart" type="button" aria-label="Open cart" aria-controls="cart-drawer">
        <!-- Both cart-icon glyphs present; CSS shows exactly one. -->
        <span class="nav__cart-glyph" data-glyph="cart" aria-hidden="true">
          <svg><!-- cart --></svg>
        </span>
        <span class="nav__cart-glyph" data-glyph="bag" aria-hidden="true">
          <svg><!-- bag --></svg>
        </span>
        <span class="nav__cart-count" aria-hidden="true">0 items</span>
      </button>
    </div>
  </div>
</header>

<dialog id="cart-drawer" class="cart-drawer" aria-label="Shopping cart">
  <div class="cart-drawer__body">cart</div>
</dialog>
```

**Locked contracts:**

- No variant may add, remove, reorder, or rename any element or attribute.
- All four `data-glyph` children of the menu-toggle are always present; CSS selects the active one.
- Both cart glyphs are always present; `[data-cart-icon="..."]` picks one.
- The cart-count label is always in the DOM; variants decide its visibility.
- Search form is always present in `.nav__actions`; variants decide placement and expansion.
- **`aria-label` on `.nav__menu-toggle` flips at runtime:** `"Menu"` when `data-open="false"`, `"Close menu"` when `data-open="true"`. This is a JS responsibility, not CSS.
- **`aria-expanded` lives on the toggle button**, not on the parent form or the nav root.

## State Reset on Variant Switch (new — critical)

**Problem (identified by spec-flow + race reviewer):** variant and viewport switches can strand interaction state. User expands search on `simple`, switches to `fullscreen` → input is focused inside an invisible container. User opens the `sidebar` drawer, switches to `top` → the drawer is hidden but `data-open="true"` persists; switching back to `sidebar` makes it reappear unexpectedly.

**Solution:** `setControl` for `variant`, and every viewport-switch click, must call `resetEphemeralState(root)` **before** mutating the target attribute.

```ts
// src/nav.ts
export function resetEphemeralState(root: HTMLElement): void {
  // Close menu
  root.dataset.open = 'false';
  const toggle = root.querySelector<HTMLButtonElement>('.nav__menu-toggle')!;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Menu');

  // Collapse search
  const searchBtn = root.querySelector<HTMLButtonElement>('.nav__search-toggle')!;
  searchBtn.setAttribute('aria-expanded', 'false');
  searchBtn.setAttribute('aria-label', 'Open search');
  root.querySelector<HTMLInputElement>('.nav__search-input')?.blur();

  // Close Shop submenu
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]')!;
  shopBtn.setAttribute('aria-expanded', 'false');
  root.querySelector('#shop-submenu')?.setAttribute('hidden', '');

  // Close cart dialog (top-layer transient — don't leak into next variant)
  const dialog = document.getElementById('cart-drawer') as HTMLDialogElement;
  if (dialog.open) dialog.close();

  // Drain inert counter (defensive)
  inertReset();
}
```

## `inert` & Focus Management (expanded — resolves critical spec-flow Qs)

- **Cart dialog (`<dialog>.showModal()`)** — browser automatically makes siblings inert and traps focus. Do NOT duplicate this manually.
- **Fullscreen / sidebar open state** — NOT a `<dialog>`. We manually manage `inert` and focus.
- **`inert` scope:** set on the **preview content only** (`#preview-root` minus the nav itself), NEVER on the controls panel or viewport switcher. The designer must always be able to interact with controls.
  - Implementation: `inert` is applied to `#preview-root > :not(.nav)` if there's any sibling, or to a `#preview-background-content` wrapper if we introduce a placeholder. For pass-3 the preview contains only the nav, so `inert` is effectively a no-op — but the contract is defined for when real page content arrives.
- **`inert` reference counter** — fullscreen overlay and cart dialog can nest. A simple counter:
  ```ts
  let inertDepth = 0;
  export function inertPush() { if (inertDepth++ === 0) applyInert(true); }
  export function inertPop()  { if (--inertDepth <= 0) { inertDepth = 0; applyInert(false); } }
  export function inertReset(){ inertDepth = 0; applyInert(false); }
  ```
- **Focus return:** on menu open, store `document.activeElement`; on close, restore it (unless variant has changed, in which case focus returns to the menu toggle of the new variant).
- **Escape key** for the fullscreen / sidebar open state: a single document-level `keydown` listener.

## Sidebar Close Mechanism

**Constraint:** no DOM injection allowed (would break the same-markup contract). There is no backdrop element.

**Mechanism:** a single document-level `pointerdown` listener, installed only while `data-variant="sidebar"` and `data-open="true"`:

```ts
function installSidebarOutsideClose(root: HTMLElement) {
  const handler = (e: PointerEvent) => {
    const drawer = root.querySelector<HTMLElement>('.nav__primary')!;
    if (!e.composedPath().includes(drawer) && !e.composedPath().includes(root.querySelector('.nav__menu-toggle')!)) {
      root.dataset.open = 'false';
      document.removeEventListener('pointerdown', handler, true);
    }
  };
  document.addEventListener('pointerdown', handler, true);
  return () => document.removeEventListener('pointerdown', handler, true);
}
```

The listener is attached on `open` and removed on `close`. Using `pointerdown` (not `click`) avoids the "toggle opens it, outside-close immediately closes it on the same tick" race.

## Race Conditions & Ordering (distilled from race-review)

| # | Race                                            | Fix                                                                                     |
|---|-------------------------------------------------|-----------------------------------------------------------------------------------------|
| 1 | Search open + variant switch                    | `resetEphemeralState(root)` before variant write                                         |
| 2 | Cart dialog open + variant switch               | `resetEphemeralState` closes the dialog                                                  |
| 3 | Fullscreen menu open + cart dialog              | `inert` reference counter (fullscreen pushes, cart does not — browser handles cart inert) |
| 4 | Submenu click + document click-outside           | Use `pointerdown` with `composedPath()` and `capture: true`                              |
| 5 | Menu open + viewport resize                      | Viewport switcher calls `resetEphemeralState`                                            |
| 6 | Rapid double-click on menu toggle                | State-gate: `STATE_IDLE` / `STATE_ANIMATING` flag cleared on `transitionend`              |
| 7 | Variant switch mid-animation (flicker)           | Wrap variant assignment in `document.startViewTransition?.(...)`; progressive enhancement |

## Technical Considerations

- **Stack:** Vite 8.0.8 + vanilla TypeScript, Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/vite` plugin). No PostCSS, no Autoprefixer (Tailwind 4 handles vendor prefixes via Lightning CSS), no `tailwind.config.js`. No other runtime deps.
- **Tailwind configuration is CSS-native:** a single `@import "tailwindcss";` at the top of `main.css` and an optional empty `@theme { }` block for future tokens. Content-scanning is automatic — Tailwind 4 discovers template files from the Vite graph, so there is no `content: [...]` array to maintain.
- **Strict tsconfig** shipped from day one (see Implementation Sketch below).
- **Import the partial as a raw string** using Vite's `?raw` suffix: `import navHtml from './nav.partial.html?raw'`.
- **Variant styling split and refactor trigger:**
  - Simple cases go inline with `group-data-[variant=x]/nav:` utilities.
  - Heavy layout overrides (fullscreen overlay, sidebar drawer) live in `src/nav.css` under scoped selectors using `@apply`.
  - **Refactor rule:** _if a single element accumulates >3 `group-data-*` utilities on the same property axis, OR the same `group-data-[variant=X]` selector appears on >4 elements for a single variant, move those rules into `nav.css`._
  - **Specificity note at the top of `nav.css`:** `@apply` inside `[data-variant="x"]` blocks compiles to specificity `[0,2,1]` which will override a single utility class. Rules here win — plan accordingly.
- **Glyph visibility** uses equal-specificity show/hide rules, not `:not()`:
  ```css
  .nav__menu-toggle-glyph { display: none; }
  [data-open="false"][data-button-style="hamburger"] .nav__menu-toggle-glyph[data-glyph="hamburger"],
  [data-open="false"][data-button-style="plus"]      .nav__menu-toggle-glyph[data-glyph="plus"],
  [data-open="false"][data-button-style="text"]      .nav__menu-toggle-glyph[data-glyph="text"],
  [data-open="true"]  .nav__menu-toggle-glyph[data-glyph="close"] { display: inline-flex; }
  ```
- **Transitions scoped to `[data-open]`, not `[data-variant]`:** variant swaps should be instant (or wrapped in `startViewTransition`); open/close should be animated.
- **Behavioral JS is shared:** one `src/nav.ts` module. Variants never require variant-specific JS.
- **Controls state:** `src/controls.ts` closes over the nav root and dispatches mutations via private helpers. `setControl` and `setColor` are not exported as public API — they live inside `initControls`. This keeps the shell/nav boundary clean and prevents accidental misuse.
- **Color palette** lives in `src/nav.schema.ts` (single source of truth; see below).

## Source of Truth: `src/nav.schema.ts`

Prevents magic-string drift across HTML, CSS, and TS.

```ts
// src/nav.schema.ts
export const VARIANTS       = ['simple', 'fullscreen', 'sidebar', 'top'] as const;
export const BUTTON_STYLES  = ['hamburger', 'plus', 'text'] as const;
export const ALIGNMENTS     = ['left', 'center', 'right'] as const;
export const CAPITALIZATIONS = ['normal', 'lowercase', 'uppercase'] as const;
export const CART_ICONS     = ['cart', 'bag'] as const;

export const COLORS = {
  black: '#000000',
  yellow: '#F4D923',
  pink: '#F8B4D0',
  lightBlue: '#BEE8F0',
  transparent: 'transparent',
} as const;

export type Variant        = (typeof VARIANTS)[number];
export type ButtonStyle    = (typeof BUTTON_STYLES)[number];
export type Alignment      = (typeof ALIGNMENTS)[number];
export type Capitalization = (typeof CAPITALIZATIONS)[number];
export type CartIcon       = (typeof CART_ICONS)[number];
export type ColorName      = keyof typeof COLORS;
export type ColorValue     = (typeof COLORS)[ColorName];

export type ControlMap = {
  variant: Variant;
  open: 'true' | 'false';
  buttonStyle: ButtonStyle;
  alignment: Alignment;
  capitalization: Capitalization;
  cartIcon: CartIcon;
};
```

CSS selectors still use the literal string (`[data-variant="simple"]`). Document this at the top of `nav.css` with a `/* variant names sourced from src/nav.schema.ts */` comment.

## Accessibility & UX Considerations (consolidated)

Drawn from WAI-ARIA APG, MDN, WCAG 2.2, and Adrian Roselli's horizontal-scroll guidance. URLs in References.

- **Dialog / Modal (cart drawer):** follow APG modal pattern. `<dialog>.showModal()` gives focus trap + Escape for free. Add JS backdrop-click handler (not free).
- **Disclosure pattern (search, Shop submenu):** `aria-expanded` on the trigger button; `aria-controls` documents intent (harmless even though AT support is weak). Move focus to the revealed control on open; restore on close.
- **Radio group pattern (controls):** native `<fieldset>` + `<legend>` + `<input type="radio">`. Do NOT hand-roll `role="radiogroup"`. Keyboard arrow-key navigation is free.
- **WCAG 2.2 SC 2.4.11 (Focus Not Obscured):** if the sticky top bar covers focused nav items during Tab-through (possible in `fullscreen` open state), scroll focused item into view.
- **WCAG 2.2 SC 2.4.7 (Focus Visible):** do not remove the default outline; add `focus-visible:ring-2` via Tailwind on every interactive element.
- **Horizontal-scroll nav (`top`):** `tabindex="0"` + `role="region"` + `aria-label` on the scroll container; gradient fade masks as visual affordances; Tab through links still works.
- **`aria-label` on menu-toggle flips with `data-open`:** "Menu" ↔ "Close menu". Implemented in `nav.ts` alongside the `data-open` toggle.
- **Scroll lock mechanism:** when fullscreen overlay opens, set `overflow: hidden` on the preview container (NOT the `<body>`, which also contains the controls panel). Remove on close.
- **Search click-outside:** document-level `pointerdown` listener; `:focus-within` alone can't detect mouse-outside-without-focus-change.

## Cross-control Semantic Conflicts (design-time warnings)

These are **not** runtime guards for pass-3 — just documented. The builder can enforce later.

| Combination                                            | Problem                                  | Pass-3 behavior                   |
|--------------------------------------------------------|------------------------------------------|-----------------------------------|
| Menu color = transparent + fullscreen variant          | Overlay doesn't obscure page             | Allow; add TODO for builder       |
| Text color = Menu color (e.g., both black)             | Invisible text                           | Allow; TODO contrast warning      |
| Text color = transparent                               | Invisible text always                    | Swatch visually disabled          |
| Button style = any + `top` variant                     | Toggle button is hidden by `top`          | Allow; no-op                      |
| Capitalization = lowercase in Turkish                  | Dotless-i in `I` → `ı`                   | N/A (English placeholders)        |

## Acceptance Criteria

### Functional (must pass — pass-3)

- [x] `npm install && npm run dev` boots the shell at localhost.
- [x] Shell renders the controls panel and preview canvas side-by-side.
- [x] **Style** control switches `data-variant` — all four variants render correctly in both closed and open states.
- [x] **Menu color** swatch click updates `--menu-color` and the nav background updates live in every variant.
- [x] **Text color** swatch click updates `--text-color`; link text updates live. Transparent swatch is disabled (non-interactive, crossed-out).
- [x] **Button style** switches the glyph inside `.nav__menu-toggle` (hamburger / plus / "Menu" text). Glyphs are pre-rendered; none are added or removed. Changing button style while `data-open="true"` leaves the close (X) glyph visible (button style only affects closed-state glyph).
- [x] **Alignment** changes horizontal alignment of the link list in the open state (left / center / right).
- [x] **Capitalization** applies `text-transform` to link labels (normal / lowercase / uppercase).
- [x] **Cart icon** switches between cart and bag glyph without mutating DOM.
- [x] **Viewport** selector resizes the preview container to 375 / 768 / 1280 / fluid. Viewport switch triggers `resetEphemeralState`.
- [x] Shop submenu opens and closes; shows five placeholder categories in every variant. Submenu resets (closes) on variant switch.
- [x] Search icon expands into an input in **every** variant; Escape, outside-click, or blur collapses it. Search resets on variant switch.
- [x] Cart icon is visible in both closed and open states of **every** variant; clicking opens the slide-over `<dialog>` containing the literal text "cart". Backdrop click closes (JS handler). Escape closes (native). Cart closes on variant switch.
- [x] `top` variant: hamburger/X is hidden; link list is inline and horizontally scrolls when overflow. Scroll container is keyboard-reachable.
- [x] Colors set via the controls are **preserved across variant switches** (switching from `fullscreen` to `sidebar` keeps `--menu-color` and `--text-color`).
- [x] **Variant switch resets `data-open`** to `false`, clearing any stale overlay state.
- [x] **`aria-label` on menu-toggle** flips "Menu" ↔ "Close menu" with `data-open`.
- [x] **`inert` is scoped to preview content only** — the controls panel is never inerted.
- [x] **Sidebar close-on-outside-click** uses a document-level `pointerdown` listener (no DOM injection).
- [x] **Fullscreen at 1280px** still renders `fixed inset-0` within the preview container.

### Quality

- [x] Keyboard navigation: Tab reaches every interactive element; Escape closes dialogs/menus/search.
- [ ] Lighthouse accessibility ≥ 95 on mobile and desktop.
- [x] No variant-specific JS introduced.
- [x] No variant adds/removes DOM nodes.
- [ ] **Byte-identity Vitest unit test** (promoted from dev-time `console.log`): inject `navHtml` into 4 containers with different `data-variant` values; assert `innerHTML` is identical after injection.
- [ ] **Schema-selector sync test:** for each value in `VARIANTS`/`BUTTON_STYLES`/etc., assert a corresponding `[data-*="..."]` selector exists in `nav.css`.
- [x] `pnpm build` produces a static bundle under 120 KB gzipped.

### Follow-ups (deferred)

- [ ] Focus trap implementation for fullscreen/sidebar open states (currently best-effort via `inert`).
- [ ] Playwright visual-regression snapshots (4 variants × open/closed = 8 screenshots).
- [ ] Contrast warning when Text color approaches Menu color (WCAG AA 4.5:1).
- [ ] Move colors from inline `style` to `data-menu-color` / `data-text-color` attributes once builder schema is defined.

## Out of Scope (this pass)

- Cart contents / product grid / real checkout.
- Real logo asset.
- Persisting controls state to `localStorage` or URL.
- Exporting the current control values as a CSS snippet or JSON payload for the builder.
- Mega-menu for Shop.
- Full focus trap library for fullscreen/sidebar (deferred).
- Localization / RTL.

## Project Structure

```
sections-menu/
├── index.html                 # Shell chrome + preview + controls mount
├── package.json
├── tsconfig.json
├── vite.config.ts             # registers @tailwindcss/vite plugin
├── plans/
│   ├── feat-nav-prototype-shell.md
│   └── assets/
│       ├── nav-variants.png
│       └── nav-controls.png
└── src/
    ├── main.ts                # Bootstrap: inject partial, wire controls + viewport
    ├── nav.ts                 # Shared behavior + resetEphemeralState + inert counter
    ├── nav.partial.html       # THE canonical markup
    ├── nav.css                # Variant-scoped @apply blocks; imported from main.css
    ├── main.css               # @tailwind directives + imports nav.css and controls.css
    ├── controls.ts            # Custom controls panel logic + rendering
    ├── controls.css           # Controls panel @apply blocks (swatches, segmented buttons)
    └── nav.schema.ts          # Single source of truth: VARIANTS, COLORS, ControlMap
```

_Note:_ the simplicity reviewer recommended collapsing to 3 files. We keep the 8-file layout because (a) each boundary is load-bearing (schema, behavior, controls, palette-in-schema, CSS split), (b) TS reviewer endorsed the split, and (c) a prototype that becomes a reference implementation benefits from clean module seams. Files can always be merged later; extracting modules is the expensive direction.

## Implementation Sketch

### `tsconfig.json`
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

### `vite.config.ts`
```ts
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
```

### `src/main.css` (Tailwind 4 entry)
```css
@import "tailwindcss";

/* Empty @theme block reserved for future token extensions. */
@theme {
  /* e.g. --color-brand: oklch(0.8 0.2 140); */
}

@import "./nav.css";
@import "./controls.css";
```

### `src/nav.css` (top of file)
```css
/* Required in v4: gives @apply access to theme tokens from main.css. */
@reference "./main.css";

/* variant names sourced from src/nav.schema.ts */
```

### `src/main.ts`
```ts
import './main.css';
import navHtml from './nav.partial.html?raw';
import { initNavBehavior, resetEphemeralState } from './nav';
import { initControls } from './controls';

function requireElement<T extends Element>(selector: string, parent: ParentNode = document): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el;
}

const preview = requireElement<HTMLElement>('#preview-root');
preview.innerHTML = navHtml;
const navRoot = requireElement<HTMLElement>('.nav', preview);

const cleanupNav = initNavBehavior(navRoot);
const cleanupControls = initControls(navRoot);

document.querySelectorAll<HTMLButtonElement>('[data-viewport]').forEach(btn => {
  btn.addEventListener('click', () => {
    const w = btn.dataset.viewport!;
    preview.style.width = w === 'fluid' ? '100%' : `${w}px`;
    resetEphemeralState(navRoot);
  });
});

// Cleanup contract available if the preview ever re-mounts.
void cleanupNav; void cleanupControls;
```

### `src/nav.ts` (key signatures)
```ts
import type { ControlMap } from './nav.schema';

export function initNavBehavior(root: HTMLElement): () => void;
export function resetEphemeralState(root: HTMLElement): void;
export function inertPush(): void;
export function inertPop(): void;
export function inertReset(): void;
```

### `src/controls.ts` (type-safe `setControl`)
```ts
import { VARIANTS, COLORS } from './nav.schema';
import type { ControlMap, ColorValue } from './nav.schema';
import { resetEphemeralState } from './nav';

export function initControls(navRoot: HTMLElement): () => void {
  // Private helpers closed over navRoot — never exported.
  function setControl<K extends keyof ControlMap>(key: K, value: ControlMap[K]): void {
    if (key === 'variant') {
      resetEphemeralState(navRoot);
      if (value === 'top') navRoot.dataset.open = 'false';
      if (document.startViewTransition) {
        document.startViewTransition(() => { navRoot.dataset[key] = value; });
        return;
      }
    }
    navRoot.dataset[key] = value; // dataset is camelCase-aware; no ternary needed
  }

  function setColor(target: 'menu' | 'text', value: ColorValue): void {
    navRoot.style.setProperty(target === 'menu' ? '--menu-color' : '--text-color', value);
  }

  // Render 7 control groups as <fieldset>/<legend> + native radio inputs.
  // Wire each radio's 'change' event to setControl or setColor.

  return () => { /* remove listeners */ };
}
```

### `src/nav.css` (excerpt — equal-specificity glyph rules)
```css
/* Glyph visibility uses equal-specificity rules, no :not() */
.nav__menu-toggle-glyph { display: none; }

[data-open="false"][data-button-style="hamburger"] .nav__menu-toggle-glyph[data-glyph="hamburger"],
[data-open="false"][data-button-style="plus"]      .nav__menu-toggle-glyph[data-glyph="plus"],
[data-open="false"][data-button-style="text"]      .nav__menu-toggle-glyph[data-glyph="text"],
[data-open="true"] .nav__menu-toggle-glyph[data-glyph="close"] {
  display: inline-flex;
}

.nav__cart-glyph { display: none; }
[data-cart-icon="cart"] .nav__cart-glyph[data-glyph="cart"],
[data-cart-icon="bag"]  .nav__cart-glyph[data-glyph="bag"] { display: inline-flex; }

/* Top variant: no hamburger, always inline */
[data-variant="top"] .nav__menu-toggle { display: none; }
[data-variant="top"] .nav__primary      { @apply block overflow-x-auto; }
[data-variant="top"] .nav__list         { @apply flex flex-nowrap gap-4 whitespace-nowrap; }

/* Shared overlay base — dedup for fullscreen + sidebar open */
[data-variant="fullscreen"][data-open="true"] .nav__primary,
[data-variant="sidebar"][data-open="true"]    .nav__primary {
  @apply fixed z-40 bg-(color:--menu-color) text-(color:--text-color);
}

[data-variant="fullscreen"][data-open="true"] .nav__primary {
  @apply inset-0 flex flex-col items-center justify-center gap-6 text-4xl font-bold;
}

[data-variant="sidebar"][data-open="true"] .nav__primary {
  @apply inset-y-0 left-0 w-[min(70vw,360px)] flex flex-col gap-2 px-6 pt-14;
}

/* Alignment & capitalization */
[data-alignment="left"]   .nav__list { @apply items-start text-left; }
[data-alignment="center"] .nav__list { @apply items-center text-center; }
[data-alignment="right"]  .nav__list { @apply items-end text-right; }

[data-capitalization="normal"]    .nav__link { text-transform: none; }
[data-capitalization="lowercase"] .nav__link { text-transform: lowercase; }
[data-capitalization="uppercase"] .nav__link { text-transform: uppercase; }

/* Transitions only on open-state changes, not variant changes */
.nav__primary { transition: none; }
[data-open="true"]  .nav__primary,
[data-open="false"] .nav__primary { transition: transform 200ms ease; }
```

## Dependencies & Risks

- **Dependency:** Tailwind CSS v4 + `@tailwindcss/vite` ([install guide](https://tailwindcss.com/docs/installation/using-vite)). Use `tailwindcss@latest` (resolves to v4); no PostCSS, no Autoprefixer, no `tailwind.config.js`.
- **Dependency:** Vite 8.0.8 ([docs](https://vite.dev/guide/)).
- **No runtime JS libraries.**
- **Risk — Tailwind v4 browser baseline:** v4 requires Safari 16.4+, Chrome 111+, Firefox 128+. Acceptable for a modern prototype; if the eventual builder must support older browsers, re-evaluate. Mitigation: pin `"@tailwindcss/vite": "^4.0.0"` so a future Tailwind v5 with breaking changes doesn't drift in.
- **Risk — variant pressure on markup:** a designer may want a structural change. CSS Grid named areas + flex `order` cover most cases. If a variant genuinely can't be done in CSS, escalate — the WYSIWYG builder can't render it either.
- **Risk — `<dialog>` animation portability:** `@starting-style` ~91% support. Acceptable for a prototype.
- **Risk — fullscreen without `<dialog>`:** markup unified at the cost of manual `inert` / focus management. Flagged; focus trap deferred to follow-up.
- **Risk — transparent text swatch:** disabled in pass-3 to resolve the contradiction.
- **Risk — specificity trap:** `@apply` inside `[data-variant]` blocks beats inline utility classes. Documented in `nav.css` header comment.

## References & Research

### External
- [Tailwind v4 — installation with Vite](https://tailwindcss.com/docs/installation/using-vite).
- [Tailwind v4 — `data-*` / `group-data-*` variants (hover, focus, and other states)](https://tailwindcss.com/docs/hover-focus-and-other-states).
- [Tailwind v4 — arbitrary values with CSS custom properties (`bg-(--var)` shorthand)](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values).
- [Tailwind v4 — `@apply` directive and `@reference` for nested CSS](https://tailwindcss.com/docs/functions-and-directives#apply-directive).
- [Tailwind v4 — CSS-first config with `@theme`](https://tailwindcss.com/docs/theme).
- [Tailwind v3 → v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide).
- [Vite — importing assets as strings (`?raw`)](https://vite.dev/guide/assets#importing-asset-as-string).
- [MDN — `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog).
- [MDN — `inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert).
- [MDN — `aria-expanded`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded).
- [MDN — `:focus-within`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-within).
- [WAI-ARIA APG — Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- [WAI-ARIA APG — Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
- [WAI-ARIA APG — Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
- [WCAG 2.2 SC 2.4.11 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- [Adrian Roselli — Keyboard-Only Scrolling Areas](https://adrianroselli.com/2022/06/keyboard-only-scrolling-areas.html).
- [Aleksandr Hovhannisyan — theme-switch patterns](https://www.aleksandrhovhannisyan.com/blog/the-perfect-theme-switch/).

### Internal
- This file: `plans/feat-nav-prototype-shell.md`.
- Reference screenshots: `plans/assets/nav-variants.png`, `plans/assets/nav-controls.png`.
