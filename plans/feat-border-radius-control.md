# feat: Add border-radius control

## Overview

Add a stepped range slider to the controls panel that adjusts border-radius across the nav. Affects two contexts: (1) the inset container corners on simple, fullscreen, and top variants, and (2) all tile boxes on the tile variant (mobile closed boxes, mobile open overlay + tile cards, desktop tile bar + dropdown). Does **not** affect sidebar. The slider moves from sharp (0) on the left to fully rounded (9999px) on the right, with discrete visual stops in between.

## Data Model

**CSS custom property:** `--border-radius` on `.nav` root (default `0px`).

**Schema:** Add `borderRadius` to `ControlMap` in `nav.schema.ts`:

```typescript
export type ControlMap = {
  // ... existing entries
  borderRadius: '0' | '1' | '2' | '3' | '4';
};
```

The value is a step index (0–4) stored as `data-border-radius` on the nav root. CSS and JS map step indices to pixel values:

| Step | Label | Value |
|------|-------|-------|
| 0 | Sharp | `0px` |
| 1 | 4px | `4px` |
| 2 | 8px | `8px` |
| 3 | 16px | `16px` |
| 4 | Full | `9999px` |

## Implementation

### `src/nav.schema.ts`

Add the step values and update `ControlMap`:

```typescript
export const BORDER_RADIUS_STEPS = ['0px', '4px', '8px', '16px', '9999px'] as const;

export type ControlMap = {
  // ... existing entries
  borderRadius: '0' | '1' | '2' | '3' | '4';
};
```

### `src/controls.ts`

**1. Import** `BORDER_RADIUS_STEPS` from the schema.

**2. Update `HIDDEN_CONTROLS`** — hide on sidebar:

```typescript
const HIDDEN_CONTROLS: Partial<Record<Variant, string[]>> = {
  top: ['button-style'],
  sidebar: ['inset', 'border-radius'],
  tile: ['inset', 'logo-style', 'alignment', 'button-style'],
};
```

Note: `'inset'` moves into sidebar's list (it's already there at line 11). `'border-radius'` is added alongside it.

**3. New nested function: `createRangeGroup`** — defined inside `initControls` (like all other factory functions) so it has closure access to `signal`. A range input (`<input type="range">`) with step labels displayed below. This is a new control pattern (no existing range slider in the codebase).

```typescript
function createRangeGroup(
  name: string,
  label: string,
  steps: readonly string[],
  onInput: (stepIndex: number) => void,
): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'control-group';
  fieldset.dataset.control = name;
  fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

  const range = document.createElement('input');
  range.className = 'control-group__range';
  range.type = 'range';
  range.name = name;
  range.min = '0';
  range.max = String(steps.length - 1);
  range.step = '1';
  range.value = '0';
  range.ariaLabel = label;
  range.addEventListener('input', () => {
    onInput(Number.parseInt(range.value, 10));
  }, { signal });

  const labels = document.createElement('div');
  labels.className = 'control-group__range-labels';
  labels.innerHTML = `<span>Sharp</span><span>Full</span>`;

  fieldset.appendChild(range);
  fieldset.appendChild(labels);
  return fieldset;
}
```

**4. Wire the control** — add after the inset control group (~line 209):

```typescript
// Border radius
wrapper.appendChild(createRangeGroup(
  'border-radius', 'Border radius', BORDER_RADIUS_STEPS,
  (stepIndex) => {
    const value = BORDER_RADIUS_STEPS[stepIndex];
    if (value !== undefined) {
      navRoot.style.setProperty('--border-radius', value);
      navRoot.dataset.borderRadius = String(stepIndex);
    }
  },
));
```

**5. Update `setControl` for inset** — when inset is toggled on, `--nav-inset-radius` should inherit from `--border-radius` instead of being hardcoded to `0px`:

```typescript
if (key === 'inset') {
  const on = value === 'true';
  navRoot.style.setProperty('--nav-inset', on ? '16px' : '0px');
  // Remove the old --nav-inset-radius line entirely.
  // Border-radius is now driven by --border-radius via the CSS rule.
}
```

### `src/nav.css`

**1. Update the inset rule** (line 22) — use `--border-radius` instead of `--nav-inset-radius`:

```css
.nav[data-inset="true"]:is(
  [data-variant="simple"],
  [data-variant="fullscreen"],
  [data-variant="top"]
) {
  width: auto;
  margin: var(--nav-inset, 0px);
  border-radius: var(--border-radius, 0px);
}
```

**No `overflow: clip` or `overflow: hidden`.** `border-radius` on `.nav` rounds the element's own background, which is the desired effect. Adding `overflow: clip` would clip absolutely-positioned children — breaking the top variant's inline dropdown submenus (which extend below `.nav`) and creating issues with the link-row band's negative-margin bleed. At small radii (4–8px) the corner bleed from child backgrounds is invisible; at large radii it's a known trade-off, acceptable for now.

**2. Tile variant — mobile closed boxes** (inside `@container (max-width: 767px)`):

```css
/* Tile mobile closed: apply border-radius to individual boxes */
.nav[data-variant="tile"][data-open="false"] .nav__logo,
.nav[data-variant="tile"][data-open="false"] .nav__search-toggle,
.nav[data-variant="tile"][data-open="false"] .nav__cart,
.nav[data-variant="tile"][data-open="false"] .nav__menu-toggle {
  border-radius: var(--border-radius, 0px);
}

/* Tile mobile search open: search form box */
.nav[data-variant="tile"] .nav__search[data-search-open="true"] {
  border-radius: var(--border-radius, 0px);
}
```

**3. Tile variant — mobile open overlay** (line ~1040):

```css
[data-variant="tile"][data-open="true"] {
  /* existing rules ... */
  border-radius: var(--border-radius, 0px);
  /* overflow: hidden is already set here — good */
}
```

**4. Tile variant — mobile open tile cards** (inside `@container (max-width: 767px)`):

```css
/* Tile cards inherit border-radius */
[data-variant="tile"][data-open="true"] .nav__link {
  border-radius: var(--border-radius, 0px);
}

[data-variant="tile"][data-open="true"] .nav__item--has-submenu {
  border-radius: var(--border-radius, 0px);
}
```

**5. Tile variant — desktop boxes** (inside `@container (min-width: 768px)`):

```css
/* Desktop tile boxes */
.nav[data-variant="tile"] .nav__logo,
.nav[data-variant="tile"] .nav__link,
.nav[data-variant="tile"] .nav__search-toggle,
.nav[data-variant="tile"] .nav__cart {
  border-radius: var(--border-radius, 0px);
}

/* Desktop dropdown: match border-radius */
.nav[data-variant="tile"] .nav__submenu {
  border-radius: var(--border-radius, 0px);
}

/* Desktop search open box */
.nav[data-variant="tile"] .nav__search[data-search-open="true"] {
  border-radius: var(--border-radius, 0px);
}
```

All desktop rules go inside the existing `@container (min-width: 768px)` block; all mobile rules inside `@container (max-width: 767px)`. The search-open `border-radius` rule appears in both blocks since the search box renders differently at each breakpoint.

### `src/controls.css`

Add styles for the new range slider control:

```css
.control-group__range {
  width: 100%;
  accent-color: #fff;
  cursor: pointer;
}

.control-group__range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #999;
  margin-top: 4px;
}
```

### `src/nav.partial.html`

Add default custom property to the nav root's inline style and **remove** `--nav-inset-radius: 0px` (replaced by `--border-radius`):

```
--border-radius: 0px;
```

Remove `--nav-inset-radius: 0px;` from the inline `style` attribute.

And add default data attribute:

```html
data-border-radius="0"
```

## Interaction with Inset

The inset feature already sets `--nav-inset-radius`. This plan replaces that with `--border-radius`:

- **Inset ON + border-radius > 0**: nav container gets rounded corners. This is the primary use case the user described.
- **Inset OFF + border-radius > 0**: no visible rounding on simple/fullscreen/top (they're edge-to-edge, so rounding has no visual effect). But tile boxes still get rounded.
- **Inset ON + border-radius 0**: current behavior, sharp corners with inset gap.

The `--nav-inset-radius` property can be removed entirely and replaced by `--border-radius` in the CSS rule at line 22. The JS in `setControl` for `'inset'` no longer needs to set `--nav-inset-radius`.

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| Border-radius on tile + submenu expanded (mobile) | Submenu tile item drops `aspect-ratio: 1` but keeps rounded corners |
| Border-radius full (9999px) on tile closed (mobile) | Logo box and icon boxes become pill-shaped — visually fun, works fine |
| Border-radius on tile desktop + dropdown open | Dropdown gets matching radius; items inside don't clip thanks to padding |
| Border-radius on inset + fullscreen open | Overlay corners are rounded; open state's `overflow: hidden` clips children naturally |
| Border-radius on inset + top variant link-row | Link-row band bleeds via negative margins — at small radii (4–8px) the corner bleed is invisible; at 16px+ there may be slight rectangular corners showing behind the rounded container |
| Border-radius on inset + top variant inline submenu | Dropdown extends below `.nav` — no `overflow: clip` so it renders correctly |
| Switch variant with border-radius set | Value persists, CSS selectors just apply it to the relevant variant |
| Sidebar selected | Control hidden, `--border-radius` persists but no selectors target sidebar elements |
| Cart count badge | Unaffected — its `border-radius: 9999px` is hardcoded on `.nav__cart-count` (line 181) |

## What This Does NOT Include

- Sidebar border-radius support (explicitly deferred per user request)
- Independent per-element radius (e.g., different radius for outer container vs inner tiles)
- Animation/transition on radius change (instant, like all other controls)
- Responsive radius scaling (same value at all viewports)

## References

- Inset control plan (predecessor): `plans/feat-inset-control.md`
- Inset CSS rule using `--nav-inset-radius`: `src/nav.css:22`
- Inset JS setting `--nav-inset-radius: 0px`: `src/controls.ts:55-56`
- Hidden controls map: `src/controls.ts:8-12`
- `setControl` function: `src/controls.ts:46-58`
- Tile mobile closed boxes: `src/nav.css:916-965`
- Tile mobile open overlay: `src/nav.css:1040-1046`
- Tile mobile open tile cards: `src/nav.css:1107-1118`
- Tile desktop boxes: `src/nav.css:1247-1260`
- Tile desktop dropdown: `src/nav.css:1263-1272`
- Schema types: `src/nav.schema.ts:26-35`
- Control ordering in DOM: `src/controls.ts:176-229`
