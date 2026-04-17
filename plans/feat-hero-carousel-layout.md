# feat: M3 hero carousel layout

## Overview

Add a Material 3-style "hero" carousel as a new gallery layout option (`data-layout="hero"`). The hero carousel shows one large item (~85% width) with a small peek of the next item, creating the signature M3 visual weight. Items snap into the hero position on scroll.

This is a new layout alongside the existing grid, slideshow, and masonry — not a replacement.

## What makes it different from the current slideshow

| | Slideshow | Hero Carousel |
|---|---|---|
| Hero item width | 100% | ~85% (calc(100% - 56px - 8px)) |
| Peek items | None | Next item peeks at ~56px |
| Border radius | None | 28px (M3 extra-large) |
| Visual emphasis | Flat — all items look the same | Active item is full brightness, peek items are dimmed |
| Scroll feel | Discrete page flip | Scroll-snap with visible context |

## Implementation approach

**Tier 1 (baseline)**: CSS scroll-snap with fixed hero/peek widths. On snap settle, toggle a `data-active` attribute via `scrollend` event. CSS transitions handle the opacity/brightness change. Works in all browsers.

**Tier 2 (progressive enhancement)**: `@supports (animation-timeline: view())` adds continuous scroll-driven `transform: scale()` + `filter: brightness()` — items smoothly dim and shrink as they scroll away from center. Chrome/Edge 115+, Safari 26+. Zero JS needed for this layer.

## CSS

```css
/* Hero carousel layout */
[data-layout="hero"] .gallery__grid {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
  /* Padding so last item can reach hero position */
  padding-inline-end: calc(100% - 56px - 8px);
}

[data-layout="hero"] .gallery__grid::-webkit-scrollbar { display: none; }

[data-layout="hero"] .gallery__item {
  flex: 0 0 calc(100% - 56px - 8px);  /* hero width = container - peek - gap */
  scroll-snap-align: start;
  scroll-snap-stop: always;
  border-radius: 28px;
  overflow: hidden;
  transition: opacity 0.3s ease;
  opacity: 0.6;
}

[data-layout="hero"] .gallery__item[data-active] {
  opacity: 1;
}

/* Progressive enhancement: continuous scroll-driven animation */
@supports (animation-timeline: view()) {
  [data-layout="hero"] .gallery__item {
    animation: hero-emphasis linear both;
    animation-timeline: view(inline);
    animation-range: contain;
    /* Let scroll-driven animation handle opacity instead of transition */
    transition: none;
    opacity: 1;
  }

  @keyframes hero-emphasis {
    0%   { transform: scale(0.95); filter: brightness(0.6); }
    50%  { transform: scale(1);    filter: brightness(1);   }
    100% { transform: scale(0.95); filter: brightness(0.6); }
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-layout="hero"] .gallery__item {
    transition: none;
    animation: none;
  }
}

/* Show prev/next and pagination for hero layout */
[data-layout="hero"] .gallery__prev,
[data-layout="hero"] .gallery__next { display: flex; }
[data-layout="hero"] .gallery__pagination { display: flex; }
[data-layout="hero"][data-pagination="counter"] .gallery__pagination { display: none; }
[data-layout="hero"][data-pagination="counter"] .gallery__counter { display: block; }
```

## JS changes

### `gallery.slideshow.ts`

The existing slideshow module is reused. Two changes:

1. **Keyboard guard** — accept both `slideshow` and `hero`:
   ```typescript
   if (layout !== 'slideshow' && layout !== 'hero') return;
   ```

2. **Active attribute** — after `updateActiveState(index)`, set `data-active` on the hero item (for the Tier 1 CSS transition fallback):
   ```typescript
   items.forEach((item, i) => {
     if (i === index) item.setAttribute('data-active', '');
     else item.removeAttribute('data-active');
   });
   ```
   This is already partially done (inert management) — just add the `data-active` toggle alongside it.

### `gallery.controls.ts`

1. Add `'hero'` to `LAYOUTS` array
2. Add SVG preview thumbnail for the layout picker
3. Add `HIDDEN_CONTROLS` entry: `hero: ['columns', 'gap']` (same as slideshow)
4. In `onLayoutChange`: init slideshow for `'hero'` too
5. In `syncControlVisibility`: timing nested-hide check includes `'hero'`

## Controls visibility

Same as slideshow — hide columns and gap, show autoplay/timing/pagination.

## State

No new data-attributes. `data-layout="hero"` is saved/restored by the existing `saveState()` iteration. All slideshow controls (autoplay, timing, pagination) apply identically.

## Files to modify

| File | Change |
|------|--------|
| `src/gallery.css` | Add `[data-layout="hero"]` rules |
| `src/gallery.controls.ts` | Add `'hero'` to LAYOUTS, HIDDEN_CONTROLS, layout picker SVG |
| `src/gallery.slideshow.ts` | Extend keyboard guard + add `data-active` toggle |
| `tests/shell-switching.spec.ts` | Add hero carousel test cases |

No new files needed.

## Acceptance Criteria

- [ ] Layout picker shows 4 options: grid, slideshow, masonry, hero
- [ ] Hero layout shows one large image with a peek of the next
- [ ] Items have 28px border radius
- [ ] Scroll-snap works — items snap to the hero position
- [ ] Prev/next buttons navigate between items
- [ ] Pagination indicators work (dots/dashes/counter/thumbnails)
- [ ] Active item has full opacity, inactive items are dimmed
- [ ] Progressive enhancement: smooth scroll-driven scale/brightness in supporting browsers
- [ ] `prefers-reduced-motion` disables animations
- [ ] State persists across section switches
- [ ] Autoplay works the same as slideshow
- [ ] Existing layouts unaffected
