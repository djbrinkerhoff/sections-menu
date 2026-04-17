# fix: Hover states v2 — comprehensive rework

## Problem

The current hover implementation has two issues:
1. **Tile background hovers** use oklch midpoint shift which preserves hue on colored backgrounds but loses the nice text-color tinting effect on white tiles
2. **Text hovers on non-tile variants** work at the base level but some variant-specific overrides are missing

## Approach: two systems

### Text hovers (all variants)

Use `color-mix(in oklch, var(--text-color), var(--menu-color) var(--hover-mix))` for all clickable text. This is already working at the base level for most elements. The audit shows it naturally applies to simple, fullscreen, sidebar, and top variants because they inherit the base `color: var(--text-color)`.

**What needs fixing:**
- [ ] Sidebar open: submenu-link has custom styles — needs explicit hover
- [ ] Tile mobile open: text is `color: var(--menu-color)` (inverted) — base hover applies wrong values, needs override with swapped vars
- [ ] Tile desktop: text is `color: var(--text-color)` — base hover works, but also need to suppress the text hover since background hover is the primary feedback

### Tile background hovers

Use `color-mix(in oklch, <bg-color>, var(--opposite-color) 30%)` — the text-color tinting approach. This produces:
- Black bg + white text: visible gray (#484848) 
- White bg + colored text: nice tint (the effect you liked)
- White bg + black text: visible gray
- Colored bg + black text: **problem — muddies the color**

For the colored background case, the issue is that mixing black into a saturated color desaturates it. The fix: instead of mixing the text-color (which is often black), mix toward a darkened version of the background's OWN color. This preserves hue and chroma.

**Final formula for tile backgrounds:**
```css
/* Use oklch relative color to darken/lighten the bg,
   then tint with a touch of text-color for flavor */
oklch(from var(--menu-color) calc(l + (0.5 - l) * 0.3) c h)
```

BUT the user specifically liked the text-color tinting on white tiles. So the ideal is:
- On achromatic (black/white) tiles: `color-mix` with text-color works great
- On colored tiles: oklch lightness shift works great

Since we can't detect "is this color chromatic?" in CSS, use the **oklch midpoint shift at a moderate factor (0.3)** as the universal rule. This:
- On black: l=0 → 0.15 (visible, no chroma to muddy)
- On white: l=1 → 0.85 (visible, no chroma to muddy)  
- On yellow (l≈0.89): l→0.77 (darker yellow, clean)
- On pink (l≈0.81): l→0.69 (deeper pink, clean)

The "tinting" on white was just the darkening anyway — when white shifts to l=0.85, it's the same as a light gray. With a colored text-color, `color-mix` adds hue, but oklch just darkens — both are "visible hover." The oklch version is cleaner across all colors.

**Decision: increase the factor to 0.3 from 0.4 to be more subtle, since previous iteration was called "ass ugly" at 0.35+combined.** If 0.3 isn't enough, bump to 0.35.

## Tasks

### Base fixes
- [ ] Verify base text hover (`--hover-mix: 15%`) applies to: nav__link, submenu-link, logo, social-link, search-toggle, cart, menu-toggle
- [ ] Add sidebar open submenu-link hover if missing
- [ ] Fix tile mobile open text hover (inverted colors)

### Tile background hovers  
- [ ] Tile desktop: `oklch(from var(--menu-color) calc(l + (0.5 - l) * 0.3) c h)` — test with black, white, yellow, pink, lightBlue
- [ ] Tile mobile open: `oklch(from var(--text-color) calc(l + (0.5 - l) * 0.3) c h)` — same formula, swapped var
- [ ] Suppress text-color hover on tile desktop links (background hover is the feedback)

### Verification
- [ ] Test every variant × breakpoint combination
- [ ] Test with all 5 non-transparent colors (white, black, yellow, pink, lightBlue)
- [ ] All 30 e2e tests pass
