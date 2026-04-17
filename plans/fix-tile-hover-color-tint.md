# fix: Tile hover — clean color tint on white, visible on black

## Problem

The current tile background hover formula uses a two-layer approach:
1. oklch lightness shift toward midpoint (darkens white to gray, lightens black)
2. 10% text-color tint via oklab mix

On white backgrounds with colored text (e.g. white bg + red text), the oklch shift produces a **neutral gray** (white has no chroma), and the 10% text-color tint is too weak to overcome it. Result: a muddy brownish wash instead of a clean color tint.

### Current formula (`src/nav.css:1455-1458`)

```css
background-color: color-mix(in oklab,
  oklch(from var(--menu-color) calc(l + (0.5 - l) * 0.3) c h),
  var(--text-color) 10%
);
```

## Proposed Solution

Drop the oklch lightness shift. Use direct `color-mix` in oklab between the background color and text color at ~15%. This lets the text color's hue come through on white backgrounds (producing a clean tint) while still producing a visible shift on black backgrounds.

### New formula

```css
/* src/nav.css — tile desktop hover (~line 1455) */
background-color: color-mix(in oklab, var(--menu-color), var(--text-color) 15%);

/* src/nav.css — tile mobile open hover (~line 1255) */
background-color: color-mix(in oklab, var(--text-color), var(--menu-color) 15%);
```

### Expected results

| Background | Text   | Hover result             |
|-----------|--------|--------------------------|
| White     | Red    | Light pink wash           |
| White     | Black  | Light gray                |
| White     | Yellow | Light yellow wash         |
| White     | Blue   | Light blue wash           |
| Black     | White  | Dark gray (~15% lighter)  |
| Black     | Red    | Very dark red tint        |
| Yellow    | Black  | Slightly darker yellow    |
| Blue      | White  | Slightly lighter blue     |
| Pink      | Black  | Slightly darker pink      |

The key tradeoff: colored backgrounds mixed with black text will darken + slightly desaturate. At 15% this should be subtle enough to avoid the "muddy" look that was a problem at higher percentages. If it's still muddy on colored backgrounds, we can try 12% or split into two rules.

## Tasks

- [x] Update tile desktop hover formula — `src/nav.css:1455-1458`
- [x] Update tile mobile open hover formula — `src/nav.css:1255-1258`
- [ ] Visually verify: white bg + each text color (red, black, yellow, blue, pink)
- [ ] Visually verify: black bg + white text
- [ ] Visually verify: colored bg (yellow, pink, blue) + black text
- [x] Run e2e tests

## References

- Tile desktop hover: `src/nav.css:1450-1460`
- Tile mobile open hover: `src/nav.css:1253-1260`
- Color definitions: `src/nav.schema.ts:9-17`
- Previous hover plan: `plans/fix-hover-states-v2.md`
