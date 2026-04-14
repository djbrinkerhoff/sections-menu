# feat: Add inset control

## Overview

Add a toggle control called "Inset" that applies 16px margin around the `.nav` element, creating visual space between the header and the preview container edge. Border-radius starts at 0. Only applies to the simple, fullscreen, and top variants. Works across mobile and desktop, including when the fullscreen menu is open.

## Acceptance Criteria

- [x] Toggle control labeled "Inset" in the controls panel (on/off, default off)
- [x] When on, `.nav` gets 16px margin on all sides (via CSS custom property `--nav-inset`)
- [x] Border-radius of 0px applied via `--nav-inset-radius` (wired for future adjustment)
- [x] Control is hidden when sidebar variant is selected
- [x] Inset state persists through variant switches (enabling inset on simple, switching to sidebar, switching back to simple still shows inset)
- [x] Fullscreen open state: the overlay is also inset (margin composes with `absolute inset-0`)
- [x] Simple open state (mobile): the expanded menu panel is also inset
- [x] Top variant: inset applies to both the masthead and the link-row band
- [x] Works at all viewport widths (375, 768, 1280, fluid)
- [x] Container query breakpoints shift naturally (nav is genuinely narrower when inset)

## Data Model

**Data attribute:** `data-inset="true" | "false"` on `.nav` root, following the `data-open` pattern.

**CSS custom properties** on `.nav` root:
- `--nav-inset: 16px` (set when toggle is on, `0px` when off)
- `--nav-inset-radius: 0px` (always set, adjustable later)

**Schema:** Add `inset` to `ControlMap` as `'true' | 'false'` in `nav.schema.ts`.

## Implementation

### `src/nav.schema.ts`

Add `inset` to the `ControlMap` type:

```typescript
export type ControlMap = {
  // ... existing entries
  inset: 'true' | 'false';
};
```

### `src/controls.ts`

**1. Update `HIDDEN_CONTROLS`** — add `'inset'` to sidebar's hidden list:

```typescript
const HIDDEN_CONTROLS: Partial<Record<Variant, string[]>> = {
  top: ['button-style'],
  sidebar: ['inset'],
};
```

**2. Add inset toggle** after the alignment control group (~line 200 area). Use `createSegmentedGroup` with two options ("Off" / "On") mapping to `'false'` / `'true'`, since this mirrors the existing pattern for discrete choices. The `setControl('inset', value)` call will set `data-inset` on the nav root.

**3. Sync CSS custom properties** — in the `setControl` function (or alongside it), when the `inset` key changes:

```typescript
// Inside setControl or as a dedicated handler:
if (key === 'inset') {
  const on = value === 'true';
  navRoot.style.setProperty('--nav-inset', on ? '16px' : '0px');
  navRoot.style.setProperty('--nav-inset-radius', '0px');
}
```

**4. Set defaults** — initialize `data-inset="false"`, `--nav-inset: 0px`, `--nav-inset-radius: 0px` on the nav root at startup.

### `src/nav.css`

Add inset styles scoped to the three compatible variants. Apply margin using the custom property:

```css
/* Inset — applies to simple, fullscreen, top only */
.nav[data-inset="true"]:is(
  [data-variant="simple"],
  [data-variant="fullscreen"],
  [data-variant="top"]
) {
  margin: var(--nav-inset, 0px);
  border-radius: var(--nav-inset-radius, 0px);
}
```

**Fullscreen open state** — margin composes naturally with `absolute inset-0`. When `.nav` is `position: absolute; inset: 0; margin: 16px`, the browser renders it inset from the containing block edges. No additional override needed.

**Simple open state (mobile)** — same: margin on `.nav` persists through the open-state grid restructure.

**Top variant** — the link-row band uses negative margins (`margin-inline: -16px; width: calc(100% + 32px)`) to bleed edge-to-edge. These negative margins are relative to `.nav__inner` padding, not `.nav` margin, so they are unaffected by the inset.

### `src/nav.partial.html`

Add default data attribute to the nav root:

```html
<header class="nav" ... data-inset="false">
```

And add default custom property values to the inline style:

```
--nav-inset: 0px; --nav-inset-radius: 0px;
```

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| Inset on + switch to sidebar | Control hides, `data-inset` persists but CSS excludes sidebar — no visual change |
| Inset on + switch back from sidebar | Control reappears, inset effect is visible again |
| Inset on + fullscreen open | Overlay is inset from preview edges, gap visible around it |
| Inset on + viewport 768px | Container measures 736px (768 - 32), triggering mobile breakpoint for simple/sidebar |
| Inset on + top variant inline links | `syncTopInlineState` measures narrower container — links may stack instead of inline |
| Inset on + cart drawer open | Cart drawer is a `<dialog>` on `#preview-root`, unaffected by nav margin |
| Inset on + search open (desktop) | Search input within `.nav__inner`, unaffected by outer margin |
| Border-radius 0px + overflow | No `overflow: clip` needed at 0px radius; add later if radius becomes adjustable |

## What This Does NOT Include

- Adjustable margin/radius inputs (future: replace toggle with number inputs)
- `overflow: clip` on `.nav` for non-zero border-radius (needs careful handling of dropdown submenus and negative-margin bands)
- Animation on toggle (instant change, same as variant switching)
- Container query breakpoint compensation (the shift is intentional)

## References

- Existing color controls pattern (CSS custom properties via `setProperty`): `src/controls.ts:95-99`
- Segmented control factory: `src/controls.ts:331`
- Hidden controls map: `src/controls.ts:7-10`
- Fullscreen open CSS: `src/nav.css:584-674`
- Container query setup: `src/nav.css:8`
