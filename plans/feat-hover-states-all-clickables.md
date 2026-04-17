# feat: Hover states for all clickable elements

## Overview

Add hover feedback to every clickable element in the nav. The effect should darken or lighten depending on the color context — not by mixing in flat white/black, but by shifting toward the opposing color in a perceptual color space.

## Approach

Use `color-mix(in oklch, ...)` to mix the element's current color toward the opposing custom property. This is already the pattern used for `--band-mix` in the top variant band backgrounds. oklch is perceptual — mixing in this space shifts lightness while preserving hue and chroma, which is exactly the "darker/lighter hue" the user wants.

**The formula:**

- **Text hover:** mix `--text-color` toward `--menu-color` → text fades slightly toward background
- **Background hover:** mix `--menu-color` toward `--text-color` → surface shifts slightly toward text

A single `--hover-mix` custom property (default `12%`) controls the strength and keeps it tunable.

```css
.nav {
  --hover-mix: 12%;
}

/* Text hover */
.nav__link:hover {
  color: color-mix(in oklch, var(--text-color), var(--menu-color) var(--hover-mix));
}

/* Background hover (tile cells, etc.) */
.nav[data-variant="tile"] .nav__link:hover {
  background-color: color-mix(in oklch, var(--menu-color), var(--text-color) var(--hover-mix));
}
```

This auto-adapts: on a dark nav (black bg, white text), hover lightens. On a light nav (white bg, black text), hover darkens. On colored navs (yellow bg, black text), it shifts along the natural contrast axis.

## Elements to cover

### Text-color hover (color shifts toward `--menu-color`)

These are text-on-background elements where the text itself changes on hover:

- [x] `.nav__link` — primary nav links (`src/nav.css:87`)
- [x] `.nav__submenu-link` — submenu dropdown links (`src/nav.css:111`)
- [x] `.nav__logo` — logo link (`src/nav.css:40`)
- [x] `.nav__social-link` — social icon links (`src/nav.css:~1855`)
- [x] `.nav__search-toggle` — search button (`src/nav.css:170`)
- [x] `.nav__cart` — cart button (`src/nav.css:214`)
- [x] `.nav__menu-toggle` — hamburger/plus/text button (`src/nav.css:244`)

### Background-color hover (background shifts toward `--text-color`)

These are elements where the container/cell has a colored background:

- [x] Tile desktop: `.nav[data-variant="tile"] .nav__link` — individual tile boxes (`src/nav.css:1340`)
- [x] Tile desktop: `.nav[data-variant="tile"] .nav__logo` — logo box (`src/nav.css:1307`)
- [x] Tile desktop: `.nav[data-variant="tile"] .nav__search-toggle`, `.nav__cart` — action boxes (`src/nav.css:1388`)

### Inverted-color hover (tile mobile open)

Tile mobile open state inverts colors (white tiles on dark bg). Here both the text-color and menu-color roles are swapped:

- [x] Tile mobile open: `[data-variant="tile"][data-open="true"] .nav__link` — these use `background: var(--text-color); color: var(--menu-color)` so the hover mix direction reverses

## Cleanup

- [x] Remove existing `opacity: 0.7` hover on `.nav__link:hover` (`src/nav.css:94-96`)
- [x] Remove existing `opacity: 1` hover on `.nav__submenu-link:hover` (`src/nav.css:117-119`)
- [x] Remove variant-specific submenu hover overrides (`src/nav.css:418-420`, `795-797`)

## Transition

- [ ] Add `transition: color 150ms ease, background-color 150ms ease` to clickable base styles (or scoped per element where transitions aren't already present)

## Edge cases

- **Transparent menu-color:** When `--menu-color: transparent`, `color-mix` with transparent may produce unexpected results. May need a fallback or skip hover for transparent.
- **Submenu links in base state** have `opacity: 0.7` — the new hover should replace this opacity pattern entirely. Submenu links could use `color-mix` at a reduced opacity equivalent instead, or keep opacity for the resting state and use color-mix for hover.
- **Tile desktop submenu dropdown** links use `opacity: 1` — straightforward, just add color-mix hover.
- **Simple mobile open** — links are large with borders; hover should be on the text color, not background.
- **Fullscreen** — centered bold links; hover on text color.
- **Sidebar** — nav links and submenu links both need hover; the Shop header label has `pointer-events: none` so it's excluded.

## Acceptance criteria

- [ ] Every clickable element in the nav has a visible hover state
- [ ] Hover darkens on light backgrounds, lightens on dark backgrounds
- [ ] Color shift uses oklch perceptual mixing (not flat white/black)
- [ ] Single `--hover-mix` custom property controls strength
- [ ] Tile desktop cells shift their background on hover
- [ ] No layout shift on hover (no padding/margin changes)
- [ ] Transitions are smooth (150ms)
- [ ] All 30 existing e2e tests still pass

## References

- Existing `color-mix(in oklch, ...)` pattern: `src/nav.css:359` (top variant band)
- `--band-mix` precedent: `src/nav.css:359, 392, 1995`
- Color definitions: `src/nav.schema.ts:9-16`
- Clickable element CSS: `src/nav.css:87-255` (base styles section)
