# feat: Add nav item count control

## Overview

Add a numeric input to the controls panel that sets how many items appear in `.nav__primary`, so you can test how the nav handles edge cases like 0 items, 1 item, or 10+ items across all variants and viewports.

## Acceptance Criteria

- [x] Number input in the controls panel labeled "Nav items" (range 0–20, default 4)
- [x] Changing the value rebuilds the `<ul class="nav__list">` with that many `<li>` items
- [x] Item #2 (when present) is always the "Shop" submenu item with its child list, so submenu behavior remains testable
- [x] Other items are simple links: "Home", then "Page 3", "Page 4", etc.
- [x] 0 items renders an empty `<ul>`
- [x] Nav behavior (`nav.ts`) still works after rebuild — menu toggle, submenu expand, escape, inert management
- [x] Ephemeral state resets when the count changes (close open menus/drawers)

## Implementation

### `src/controls.ts`

Add a 10th control after cart count (~line 111), reusing `createNumberInputGroup`:

```typescript
// 10. Nav item count
wrapper.appendChild(createNumberInputGroup('nav-items', 'Nav items', 4, setNavItemCount));
```

Add a `setNavItemCount(count)` helper alongside `setCartCount` (~line 39). This function:

1. Clamps `count` to 0–20
2. Finds `navRoot.querySelector('.nav__list')` 
3. Clears its children
4. Rebuilds `count` `<li>` elements:
   - Item 1: `<li class="nav__item"><a class="nav__link" href="#">Home</a></li>`
   - Item 2: the Shop submenu `<li>` (button + `<ul id="shop-submenu">` with 5 category links)
   - Items 3+: `<li class="nav__item"><a class="nav__link" href="#">Page N</a></li>`
5. Calls `resetEphemeralState(navRoot)` to close any open menus
6. Re-runs submenu wiring from `nav.ts` if item 2 was added (the submenu button needs its click listener)

### `src/nav.ts` — re-wirable submenu behavior

The submenu click handler is currently bound during `initNavBehavior()`. After rebuilding the list, the old submenu button is gone and the new one has no listener. Two options:

**Option A (preferred): Event delegation.** Move the submenu toggle handler to use event delegation on `navRoot` instead of binding directly to the button. This way new buttons automatically work without rebinding. The click handler already queries `.nav__item--has-submenu button` — just attach the listener to `navRoot` and filter by target.

**Option B: Export a `rewireSubmenu()` function** that `controls.ts` can call after rebuilding. More surgical but couples the two modules.

### No schema changes needed

This control doesn't map to a `data-*` attribute — it directly manipulates DOM children. No changes to `nav.schema.ts` or `nav.partial.html` are needed.

## Edge cases to verify

| Count | Expected behavior |
|-------|-------------------|
| 0 | Empty nav list, menu toggle still works, no JS errors |
| 1 | Single "Home" link, no submenu |
| 2 | "Home" + "Shop" with submenu |
| 4 | Default state, matches current static HTML |
| 10+ | Tests overflow/wrapping in `top` variant especially |
| 20 | Stress test for all variants |

## References

- `createNumberInputGroup()` pattern: `src/controls.ts:268`
- Current nav items: `src/nav.partial.html:46-62`
- `resetEphemeralState()`: `src/nav.ts:85`
- Submenu toggle handler: `src/nav.ts:292-305`
