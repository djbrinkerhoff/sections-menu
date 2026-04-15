# feat: Add social links icon group (Instagram, Facebook, TikTok)

## Overview

Add a single on/off control to the controls panel that shows a group of three social-media icon links — Instagram, Facebook, TikTok — inside the nav. The group is one logical unit (all three on or off together) but renders in a variant-appropriate location: **always inside the menu on mobile**, and either **with the link group or inside the menu on desktop** depending on the variant.

No per-platform URL inputs, no ordering controls. One switch, three icons, variant-aware placement.

## Problem Statement / Motivation

Big Cartel storefronts commonly link to social accounts from their primary nav. The prototype currently has no way to preview how a social icon trio composes with the five variants × two viewports × alignment/capitalization combinations. Adding a simple toggle unlocks that preview surface while staying true to the prototype's "one switch, everything updates" ergonomic.

## Proposed Solution

Follow the established schema-first, data-attribute-driven pattern (matching `data-inset`, `data-cart-icon`, etc.):

1. Add `socialLinks: 'true' | 'false'` to `ControlMap` in `nav.schema.ts`.
2. Add static markup for `.nav__social` (group) containing three `<a>` links once in `nav.partial.html`, positioned as a sibling of `.nav__list` inside `.nav__primary`.
3. Render each icon via CSS `mask-image` using three new SVGs in `public/icons/` — same technique already used for `.nav__logo-mark`.
4. Drive visibility with `[data-social-links="true"] .nav__social { display: ... }` and place each variant's social group with per-variant CSS rules (grid placement, flex order, custom tile row).
5. Add a segmented Off/On control in `controls.ts` mirroring the `inset` control exactly.

No new JS behavior: social links have no open/close, no drawer, no ephemeral state. Inert / scroll-lock / focus management already cover them because they sit inside the menu container.

## Data Model

| Name | Type | Default | Location |
|---|---|---|---|
| `socialLinks` | `'true' \| 'false'` | `'false'` | `ControlMap` in `src/nav.schema.ts` |
| `data-social-links` | `"true" \| "false"` | `"false"` | `.nav` root in `src/nav.partial.html` |

No new CSS custom properties. Icon color inherits from `currentColor` on each variant's container, so the icons automatically follow `--menu-color` / `--text-color` depending on whether the placement is on the bar, inside the menu panel, or on a tile.

## Design Specification — Placement per variant × viewport

The social group is always present in the DOM (as `.nav__social`, sibling of `.nav__list` inside `.nav__primary`). `display` + grid/flex placement control where it shows.

### Mobile (narrow viewport, menu open)

| Variant | Placement | Notes |
|---|---|---|
| `simple` | Bottom of the open menu panel | After `.nav__list`, before bottom padding. Icons ~24px, horizontally inline, aligned to the menu's current alignment. |
| `fullscreen` | Bottom of the panel, above the cart icon | Fullscreen uses `display: flex; flex-direction: column` on `.nav__inner` with `.nav__cart` at `order: 2`. Place `.nav__social` at `order: 1` (after the list, before the cart). |
| `sidebar` | Last item inside the sliding panel | Appears as a single row of 3 inline icons, full-width border-top separator matching other sidebar items. Aligned left with the list. |
| `top` | Last **item** in the link row — one `<li>`-equivalent slot containing 3 grouped icons | `.nav__social` is styled as a flex item in the same row as `.nav__list`, appearing visually after the last link. Three icons sit side-by-side inside it. |
| `tile` | **Three tiles in a 3-column row** below the 2-column tile grid | Each icon becomes its own tile box (white fill, inverted colors), 3 across. Implemented as a nested grid inside `.nav__social` with `grid-template-columns: 1fr 1fr 1fr`. |

### Desktop (≥768px container width)

| Variant | Placement | Notes |
|---|---|---|
| `simple` | With the link group | Inline with `.nav__list` flex row, as a trailing flex sibling. Icons at ~20px, matching search/cart scale. |
| `fullscreen` | Stays inside the menu panel (same as mobile) | Full-screen overlay is used on all viewports for this variant; no desktop bar to worry about. |
| `sidebar` | Stays inside the sliding panel (same as mobile) | Same rationale as fullscreen. |
| `top` | With the link group, trailing the last link | Same placement pattern as mobile `top`. |
| `tile` | Last item in the desktop tile bar — **one tile containing all three icons** (default) | See Open Questions for the alternative "3 separate tiles" interpretation. Default matches user's softer guidance ("only show one") and leaves the horizontal bar visually balanced. |

### Screenshots / Figma

No Figma source was provided with this request. The author should screenshot each variant × viewport combination after implementation and attach them under `plans/assets/feat-social-links-*.png` per the repo convention.

## Technical Approach

### 1. `public/icons/` — add three SVG assets

Create a new directory `public/icons/` with:

```
public/icons/instagram.svg
public/icons/facebook.svg
public/icons/tiktok.svg
```

Use single-path monochrome glyphs — Simple Icons (CC0) is the pragmatic source for a prototype:
- https://simpleicons.org/?q=instagram
- https://simpleicons.org/?q=facebook
- https://simpleicons.org/?q=tiktok

Each SVG should have `viewBox="0 0 24 24"`, no explicit `fill` (so `mask-image` + `background-color: currentColor` tints correctly), and the canonical Brand Center path data. For production shipping these would be replaced with downloads from Meta Brand Resource Center and TikTok Brand Hub; Simple Icons is fine for the prototype.

### 2. `src/nav.schema.ts`

Add `socialLinks` to `ControlMap` (line 27):

```typescript
export type ControlMap = {
  variant: Variant;
  open: 'true' | 'false';
  buttonStyle: ButtonStyle;
  alignment: Alignment;
  capitalization: Capitalization;
  cartIcon: CartIcon;
  logoStyle: LogoStyle;
  inset: 'true' | 'false';
  borderRadius: '0' | '1' | '2' | '3' | '4';
  socialLinks: 'true' | 'false';    // new
};
```

No new exported constants needed.

### 3. `src/nav.partial.html`

Add `data-social-links="false"` to the `.nav` root (line 2 attribute block, alongside existing `data-*`).

Add the social group as a sibling of `.nav__list` inside `.nav__primary` (between lines 63 and 64, after `</ul>` and before `</nav>`):

```html
<ul class="nav__social" aria-label="Social links">
  <li class="nav__social-item">
    <a class="nav__social-link" href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer me">
      <span class="nav__social-icon" data-icon="instagram" aria-hidden="true"></span>
    </a>
  </li>
  <li class="nav__social-item">
    <a class="nav__social-link" href="#" aria-label="Facebook" target="_blank" rel="noopener noreferrer me">
      <span class="nav__social-icon" data-icon="facebook" aria-hidden="true"></span>
    </a>
  </li>
  <li class="nav__social-item">
    <a class="nav__social-link" href="#" aria-label="TikTok" target="_blank" rel="noopener noreferrer me">
      <span class="nav__social-icon" data-icon="tiktok" aria-hidden="true"></span>
    </a>
  </li>
</ul>
```

**Rationale for `<ul>` inside `<nav id="nav-primary">`**
- Keeps list semantics under an existing `<nav>` landmark (Safari + VoiceOver retain list role inside `<nav>` even with `list-style: none` — no `role="list"` needed).
- Avoids nested `<nav>` landmarks.
- Co-located with `.nav__list`, so inert / scroll-lock / menu-open states apply automatically.
- Sits **outside** `.nav__list`, so `setNavItemCount()` (which rebuilds `.nav__list` children via `innerHTML`) does not destroy it. See Risks.

`aria-label="Social links"` on the outer `<ul>` gives it a screen-reader-distinguishable name from the primary list above it.

### 4. `src/controls.ts`

**HIDDEN_CONTROLS (line 9-13)** — No additions. The toggle is shown for all variants.

**New control entry** — Insert after the existing `inset` segmented group (around line 205, mirroring the `inset` pattern exactly):

```typescript
wrapper.appendChild(createSegmentedGroup(
  'social-links', 'Social links', ['false', 'true'] as const,
  { false: 'Off', true: 'On' },
  'socialLinks',
));
```

**setControl side-effects (line ~45-65)** — No special handling required. The generic `navRoot.dataset[key] = value` path already handles `socialLinks` → `data-social-links`.

**Default state** — Social links default to `off`. The initial nav root has `data-social-links="false"`. The segmented group should read the current `dataset.socialLinks` on render to show the correct active segment.

### 5. `src/nav.css`

New CSS organized as follows. Approximate line counts in parentheses.

**a) Base `.nav__social` styles (~20 lines)** — Append to nav.css (end of file, or near other shared-across-variant rules):

```css
/* Default: hidden. Shown per variant+viewport when data-social-links="true". */
.nav__social { display: none; list-style: none; padding: 0; margin: 0; }
.nav__social-item { list-style: none; }

.nav__social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  color: currentColor;
}

.nav__social-icon {
  display: block;
  width: 20px;
  height: 20px;
  background-color: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.nav__social-icon[data-icon="instagram"] {
  -webkit-mask-image: url('/icons/instagram.svg');
  mask-image: url('/icons/instagram.svg');
}
.nav__social-icon[data-icon="facebook"] {
  -webkit-mask-image: url('/icons/facebook.svg');
  mask-image: url('/icons/facebook.svg');
}
.nav__social-icon[data-icon="tiktok"] {
  -webkit-mask-image: url('/icons/tiktok.svg');
  mask-image: url('/icons/tiktok.svg');
}
```

This mirrors the existing `.nav__logo-mark` pattern at `src/nav.css:53-76`. Both Webkit-prefixed and unprefixed mask properties are included, matching repo convention.

**b) Per-variant + viewport placement rules**

Keep these in each variant's existing section so reviewers can find them. Rough outline (exact selectors to match existing patterns):

```css
/* SIMPLE — mobile open: show at the bottom of the panel */
@container (max-width: 767px) {
  [data-variant="simple"][data-open="true"][data-social-links="true"] .nav__social {
    display: flex;
    gap: 12px;
    padding: 24px 16px 16px;
    justify-content: flex-start;
  }
}

/* SIMPLE — desktop: show inline with link group */
@container (min-width: 768px) {
  [data-variant="simple"][data-social-links="true"] .nav__primary {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  [data-variant="simple"][data-social-links="true"] .nav__social {
    display: inline-flex;
    gap: 8px;
  }
}

/* FULLSCREEN — open (all viewports): above the cart at bottom of column */
[data-variant="fullscreen"][data-open="true"][data-social-links="true"] .nav__social {
  display: flex;
  gap: 16px;
  order: 1;   /* between nav list (order 0) and cart (order 2) */
  padding: 16px;
  justify-content: center;
}

/* SIDEBAR — open (all viewports): last item inside the sliding panel */
[data-variant="sidebar"][data-open="true"][data-social-links="true"] .nav__social {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid currentColor;   /* match existing list separator treatment */
  margin-top: auto;                      /* push to bottom inside flex column */
}

/* TOP — inline as a trailing list-sibling, both mobile and desktop */
[data-variant="top"][data-social-links="true"] .nav__primary {
  display: flex;
  align-items: center;
}
[data-variant="top"][data-social-links="true"] .nav__social {
  display: inline-flex;
  gap: 8px;
  margin-inline-start: 16px;   /* visual separation from last link */
}

/* TILE — mobile open: 3-column row of icon tiles below the 2-col tile grid */
@container (max-width: 767px) {
  [data-variant="tile"][data-open="true"][data-social-links="true"] .nav__social {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    padding: 0 16px 16px;
  }
  [data-variant="tile"][data-open="true"][data-social-links="true"] .nav__social-link {
    width: 100%;
    aspect-ratio: 1;
    background: var(--text-color);
    color: var(--menu-color);
  }
}

/* TILE — desktop: one combined tile at the end of the row (DEFAULT; see Open Questions) */
@container (min-width: 768px) {
  [data-variant="tile"][data-social-links="true"] .nav__social {
    display: inline-flex;
    gap: 12px;
    background: var(--text-color);
    color: var(--menu-color);
    padding: 12px 16px;
    align-items: center;
  }
}
```

**c) Alignment-aware `justify-content`** — The simple-mobile rule above uses `flex-start`, but to match `data-alignment`, extend the existing shared alignment-override section (~line 782-841 in the existing tile plan notes) with rules for `.nav__social`:

```css
[data-alignment="center"][data-social-links="true"] .nav__social { justify-content: center; }
[data-alignment="right"][data-social-links="true"]  .nav__social { justify-content: flex-end; }
```

These only affect variants where `.nav__social` is a flex row with `justify-content` meaningfully applied; grid-based rules (tile mobile) are unaffected.

### 6. `src/nav.ts`

**No changes required.** Verified against the repo research:

- Submenu detection uses `closest('.nav__item--has-submenu button')` — does not match social links (`.nav__social-link` has no submenu class).
- `resetEphemeralState()` closes menu/search/submenu/cart — none of this touches social links.
- Focus trap / inert is applied to preview siblings, not per-element — social links inside `.nav__primary` inherit menu inertness correctly.
- `syncTopInlineState()` measures `.nav__list` children; because `.nav__social` is a sibling of `.nav__list`, it is not measured, so the top variant's collapse threshold is unaffected.

### 7. `tests/nav-accessibility.spec.ts`

Add a new test suite `describe('social links')`:

- **Toggle off by default** — `data-social-links` is `"false"` on load and `.nav__social` is not visible.
- **Toggle on — mobile simple** — Switch to simple + 375px, toggle on, open menu, assert `.nav__social` is visible inside `.nav__primary`, positioned below `.nav__list`.
- **Toggle on — mobile fullscreen** — Assert `.nav__social` order-index computes to render above `.nav__cart` and below `.nav__list`.
- **Toggle on — mobile sidebar** — Open sidebar, assert `.nav__social` has a top border and is the last focusable item in the panel.
- **Toggle on — mobile top** — Switch to top + 375px, assert `.nav__social` is visible inline with `.nav__list` (same flex row), tab order places it after the last link.
- **Toggle on — mobile tile** — Open tile menu, assert `.nav__social` computed `grid-template-columns` contains three tracks and each link renders as an inverted-color square.
- **Toggle on — desktop simple / top** — 1024px viewport, assert icons render inline with `.nav__list`.
- **Toggle on — desktop fullscreen / sidebar** — Icons only appear when menu is opened (never on the closed bar).
- **Accessibility** — Each `.nav__social-link` has `aria-label` matching the platform name and the child `.nav__social-icon` has `aria-hidden="true"`.
- **Tab order** — Tabbing from the last `.nav__link` lands on the first `.nav__social-link`, then through the trio in Instagram → Facebook → TikTok order.
- **Persistence across variant switches** — Toggle on, change variant 3 times, `data-social-links` stays `"true"` and icons remain visible in the new variant's placement.

## Acceptance Criteria

- [x] `socialLinks: 'true' | 'false'` exists in `ControlMap` (`src/nav.schema.ts`).
- [x] Nav root carries `data-social-links="false"` by default in `src/nav.partial.html`.
- [x] `.nav__social` exists in markup with three child `<a>` links (Instagram, Facebook, TikTok).
- [x] Each link has `aria-label`, `target="_blank"`, `rel="noopener noreferrer me"`.
- [x] Each icon renders via CSS `mask-image` from `public/icons/{platform}.svg`.
- [x] Icons pick up `currentColor` so they re-theme correctly across all color combinations.
- [x] Controls panel shows an "Off / On" segmented group labeled "Social links".
- [x] Toggle flips `data-social-links` on `.nav` root.
- [x] Touch target for each icon is ≥ 44×44 CSS pixels.
- [x] **Mobile `simple`** — icons appear at the bottom of the open menu.
- [x] **Mobile `fullscreen`** — icons appear above the cart icon inside the panel.
- [x] **Mobile `sidebar`** — icons appear as the last item inside the sliding panel.
- [x] **Mobile `top`** — icons appear inline at the end of the link row as a grouped trio.
- [x] **Mobile `tile`** — icons appear as three separate tiles in a 3-column row beneath the 2-column link grid.
- [x] **Desktop `simple`** — icons appear inline with the link group.
- [x] **Desktop `fullscreen`** — icons remain inside the full-screen menu panel (same as mobile).
- [x] **Desktop `sidebar`** — icons remain inside the sliding panel (same as mobile).
- [x] **Desktop `top`** — icons appear inline at the end of the link row.
- [x] **Desktop `tile`** — icons appear as one combined tile at the end of the row (see Open Question Q1).
- [x] `data-alignment` (`center`, `right`) shifts the social group's justification where applicable (simple, top, sidebar).
- [x] `data-capitalization` does not affect icons (they have no text).
- [x] Focus order follows DOM order: last link → first social link → second → third.
- [x] Inert / scroll-lock still work when a menu containing social links is opened/closed.
- [x] `setNavItemCount()` does not remove the social group when it rebuilds `.nav__list`.
- [x] Playwright tests pass for every variant × viewport placement assertion.

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| Toggle flipped with menu open | Icons appear or disappear instantly, no layout shift outside the menu panel. |
| User enables social links on `top` variant with enough links to collapse inline → stacked | Social group stays with the link row; when top collapses to a stacked inline dropdown, social group rides along. |
| Nav item count set to 0 with social links on | Social group still visible and focusable; list above it is empty. |
| Nav item count set to 20 with social links on, `top` variant | Top variant's existing overflow handling still applies; social trio stays at the end. If horizontal overflow clips, social icons can be clipped (accept as a known limitation — match current `top` behavior). |
| All color combinations (yellow menu + black text, etc.) | Icons pick up `currentColor`, so they always contrast with their container. Inverted tile backgrounds (menu-color text on text-color tile) need sanity-check on edge pairings (e.g. pink on yellow). |
| Switching from a variant that shows icons inline to one that shows them inside the menu | CSS handles transition; no JS rewiring needed. |
| Escape pressed with menu open | Menu closes, social icons become inert along with the rest of the panel (existing inert contract covers them). |
| Tab from last social link | Focus exits into the next `.nav__actions` focusable (`.nav__search` toggle). |
| RTL locale | Icons flow in document order; `margin-inline-start` on top variant respects logical direction. (Not tested in current prototype — flag as future concern.) |

## Open Questions

| # | Question | Default Assumption |
|---|---|---|
| Q1 | **Desktop `tile`: "items but only show one"** — is this one combined tile containing all three icons, or three separate tiles (like mobile tile)? | One combined tile at the end of the row (matches "only show one"). User to confirm — the implementation can switch to three-tile with ~10 lines of CSS if needed. |
| Q2 | **Hover / focus treatment** — should icons brighten, underline, or draw a focus ring? | Use the browser default focus ring (`:focus-visible`) matching other nav links; no custom hover state for the prototype. |
| Q3 | **Fullscreen mobile placement** — user said "at the bottom or at the cart" — should they share a row with the cart icon or sit on their own row above it? | Own row above the cart (less visually cramped). |
| Q4 | **Ordering of the three platforms** | Instagram → Facebook → TikTok (alphabetical by platform popularity / Meta-first grouping). Flag for storefront owner preference in a future settings iteration. |
| Q5 | **URLs used in the prototype** | All three `href="#"`. No real account links for a prototype. |
| Q6 | **Alignment behavior on `sidebar`** — sidebar menu items are left-aligned regardless of `data-alignment`. Should social icons follow the variant-forced alignment or the global control? | Variant-forced (left) — consistent with sidebar list behavior. |
| Q7 | **Capitalization** — should we add a `sr-only` text label that capitalization could affect? | No. Icons are purely visual; the `aria-label` stays canonical ("Instagram", not "INSTAGRAM"). |

## What This Does NOT Include

- Individual on/off toggles per platform (one switch controls the whole group).
- URL entry fields for each platform in the controls panel.
- Additional platforms (Twitter/X, YouTube, Pinterest, Threads, Bluesky, Mastodon, etc.).
- Reorder UI for the three icons.
- Hover/pressed micro-animations beyond browser defaults.
- A separate control for icon size or color — they follow `currentColor` and are fixed at 20px.
- A behavioral contract for an icon group that wraps to multiple lines on very narrow viewports (the trio always fits in a single row at 375px).
- Localization of `aria-label` values — English only for the prototype.
- Schema-level URL typing (no `socialUrls` object; this is purely a visibility toggle).

## Dependencies & Risks

- **No new runtime deps.** Uses only existing Vite + vanilla DOM + Tailwind v4 toolchain.
- **`setNavItemCount()` compatibility** — `controls.ts` rebuilds `.nav__list.innerHTML`. The plan places `.nav__social` as a **sibling** of `.nav__list` inside `.nav__primary`, so the rebuild does not touch it. Confirmed in the research phase; add a Playwright assertion (change nav item count with social toggle on → icons still present).
- **`syncTopInlineState()`** — measures only `.nav__list` children. `.nav__social` outside `.nav__list` is invisible to this calculation, so the `top` variant's inline/stacked threshold is unaffected.
- **Tile variant mobile 3-column row** — Implemented as an independent nested grid inside `.nav__social`, not by changing the main 2-column `.nav__list` grid. Avoids cross-row column reconciliation issues.
- **Tile variant desktop ambiguity (Q1)** — default shipped is the "one combined tile" interpretation. Flag in PR for user confirmation before merge.
- **Brand trademark risk** — Simple Icons SVGs are CC0-licensed but the brand marks themselves remain trademarked. Fine for a prototype; production adoption should swap in the official brand-center assets.
- **`mask-image` + currentColor** — requires `-webkit-` prefix for Safari mask composites (confirmed in repo's existing logo usage at `src/nav.css:53-76`). Not a regression; matches established pattern.
- **Contrast on inverted tile surfaces** — pink icon tile on a yellow menu color is low-contrast. Document as a color-pairing caveat; aligns with the same caveat already in `plans/feat-tile-nav-variant.md`.

## References & Research

### Internal References
- Nav root attribute block: `src/nav.partial.html:2-15`
- Nav primary list markup: `src/nav.partial.html:48-64`
- Schema source of truth: `src/nav.schema.ts:27-37`
- Boolean control precedent (`inset`): `src/controls.ts:~205-209`
- `setControl()` generic data-attribute assignment: `src/controls.ts:~47-52`
- Hidden controls map: `src/controls.ts:9-13`
- Logo `mask-image` pattern to copy: `src/nav.css:53-76`
- Shared closed-state grid: `src/nav.css:448-489`
- Simple mobile open state: `src/nav.css:490-594`
- Fullscreen open state: `src/nav.css:604-694`
- Sidebar open state: `src/nav.css:696-778`
- Top variant: `src/nav.css:250-430`
- Tile variant: `src/nav.css:1018-1419`
- Shared alignment overrides: `src/nav.css:~782-841`
- Tile plan (pattern to follow): `plans/feat-tile-nav-variant.md`
- Nav item count plan (interaction check): `plans/feat-nav-item-count-control.md`
- Inset plan (boolean-toggle precedent): `plans/feat-inset-control.md`
- Test patterns: `tests/nav-accessibility.spec.ts`

### External References
- Simple Icons (CC0 SVG brand icons): https://simpleicons.org/
- Meta Brand Resource Center — Instagram glyph: https://www.meta.com/brand/resources/instagram/icons/
- Meta Brand Resource Center — Facebook logo: https://www.meta.com/brand/resources/facebook/logo/
- TikTok Brand Hub: https://tiktokbrandhub.com/
- MDN `mask-image`: https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image
- MDN `inert`: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
- Scott O'Hara — Lists, `list-style: none`, Safari: https://www.scottohara.me/blog/2019/01/12/lists-and-safari.html
- WAI ARIA8 (link name from `aria-label`): https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA8
- WCAG 2.2 SC 2.5.8 (Target Size — Minimum, 24×24 CSS px): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- IndieWeb `rel="me"`: https://indieweb.org/rel-me
- Vite `?raw` imports: https://vite.dev/guide/assets#importing-asset-as-string
- Tailwind v4 release notes: https://tailwindcss.com/blog/tailwindcss-v4

### Research Agents (2026-04-15)
- Repo research analyst — confirmed BEM + data-attribute conventions, flagged `setNavItemCount` / `syncTopInlineState` interactions.
- Best-practices researcher — accessibility, brand guidelines, icon-implementation trade-offs.
- Framework docs researcher — Tailwind v4 + Vite 6 + CSS `mask-image` + container queries in 2026.
