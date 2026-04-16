# feat: Gallery styles — Grid, Slideshow, Masonry

## Overview

Replace the current single-layout gallery with three switchable styles: Grid (existing, enhanced), Slideshow (scroll-snap carousel), and Masonry (CSS columns). A layout picker at the top of gallery controls switches between them. Controls show/hide based on the active layout.

## New data-attributes and defaults

```html
<div class="gallery"
     data-layout="grid"
     data-columns="3"
     data-gap="md"
     data-aspect="square"
     data-fit="cover"
     data-captions="false"
     data-heading="false"
     data-autoplay="false"
     data-timing="4"
     data-pagination="dots"
     style="--gallery-color: #ffffff; --gallery-accent: #000000">
```

| Attribute | Values | Default | Layouts |
|-----------|--------|---------|---------|
| `data-layout` | `grid`, `slideshow`, `masonry` | `grid` | all |
| `data-columns` | `2`, `3`, `4` | `3` | grid, masonry |
| `data-gap` | `none`, `sm`, `md`, `lg` | `md` | grid, masonry |
| `data-aspect` | `square`, `landscape`, `portrait`, `auto` | `square` | all |
| `data-fit` | `cover`, `contain` | `cover` | all |
| `data-captions` | `true`, `false` | `false` | all |
| `data-heading` | `true`, `false` | `false` | all |
| `data-autoplay` | `true`, `false` | `false` | slideshow |
| `data-timing` | `2`, `4`, `6`, `8` | `4` | slideshow (when autoplay on) |
| `data-pagination` | `dots`, `dashes`, `counter`, `thumbnails` | `dots` | slideshow |

## Control visibility by layout

Follow the nav section's `HIDDEN_CONTROLS` pattern in `gallery.controls.ts`:

```
const HIDDEN_CONTROLS: Record<string, string[]> = {
  grid:      ['autoplay', 'timing', 'pagination'],
  slideshow: ['columns', 'gap'],
  masonry:   ['autoplay', 'timing', 'pagination'],
};
```

Additionally, `timing` is hidden when `data-autoplay="false"` (nested visibility).

## HTML structure

All three layouts share the same HTML. Slideshow-specific elements (nav buttons, pagination, counter) are present in the markup but hidden via CSS when `data-layout` is not `slideshow`. This keeps the approach data-attribute-driven and avoids DOM manipulation on layout switch.

```html
<!-- gallery.partial.html -->
<div class="gallery" data-layout="grid" data-columns="3" data-gap="md"
     data-aspect="square" data-fit="cover" data-captions="false"
     data-heading="false" data-autoplay="false" data-timing="4"
     data-pagination="dots"
     style="--gallery-color: #ffffff; --gallery-accent: #000000">

  <h2 class="gallery__heading">Gallery</h2>

  <div class="gallery__grid">
    <figure class="gallery__item">
      <div class="gallery__image" style="background: linear-gradient(...)"></div>
      <figcaption class="gallery__caption">Caption</figcaption>
    </figure>
    <!-- ... 9 items -->
  </div>

  <!-- Slideshow controls (hidden unless data-layout="slideshow") -->
  <button class="gallery__prev" aria-label="Previous slide">
    <!-- chevron SVG -->
  </button>
  <button class="gallery__next" aria-label="Next slide">
    <!-- chevron SVG -->
  </button>

  <div class="gallery__pagination">
    <!-- Dots/dashes: one button per slide -->
    <!-- Counter: "1 of 9" text -->
    <!-- Thumbnails: miniature image strip -->
  </div>
</div>
```

## CSS approach

### Grid (existing, mostly unchanged)

```css
[data-layout="grid"] .gallery__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* driven by data-columns */
}
```

Existing container queries collapse columns at narrow widths.

### Masonry

```css
[data-layout="masonry"] .gallery__grid {
  display: block;
  column-count: 3; /* driven by data-columns */
  column-gap: 8px; /* driven by data-gap */
}

[data-layout="masonry"] .gallery__item {
  break-inside: avoid;
  margin-bottom: 8px; /* matches column-gap */
}
```

Uses CSS `column-count` — pure CSS, no JS, works everywhere. Vertical reading order is fine for an image gallery. Container queries collapse columns at narrow widths.

For masonry, `data-aspect` still works (user can force uniform aspect ratios) but `auto` is the natural choice since items have variable heights.

### Slideshow

```css
[data-layout="slideshow"] .gallery__grid {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
[data-layout="slideshow"] .gallery__grid::-webkit-scrollbar { display: none; }

[data-layout="slideshow"] .gallery__item {
  flex: 0 0 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

@media (prefers-reduced-motion: reduce) {
  [data-layout="slideshow"] .gallery__grid {
    scroll-behavior: auto;
  }
}
```

Slideshow nav buttons and pagination hidden for non-slideshow layouts:

```css
.gallery__prev, .gallery__next, .gallery__pagination { display: none; }
[data-layout="slideshow"] .gallery__prev,
[data-layout="slideshow"] .gallery__next,
[data-layout="slideshow"] .gallery__pagination { display: flex; }
```

### Pagination styles (pure CSS)

```css
[data-pagination="dots"] .gallery__indicator    { width: 8px; height: 8px; border-radius: 50%; }
[data-pagination="dashes"] .gallery__indicator  { width: 24px; height: 3px; border-radius: 2px; }
[data-pagination="counter"] .gallery__pagination { display: none; }
[data-pagination="counter"] .gallery__counter    { display: block; }
[data-pagination="thumbnails"] .gallery__indicator { /* mini image thumbnails */ }
```

Active indicator: `[aria-selected="true"] .gallery__indicator { opacity: 1; }`

### Heading

```css
.gallery__heading { display: none; }
[data-heading="true"] .gallery__heading { display: block; }
```

### Fill behavior

For the gradient placeholder divs, approximate with `background-size`:

```css
[data-fit="cover"] .gallery__image   { background-size: cover; }
[data-fit="contain"] .gallery__image { background-size: contain; background-repeat: no-repeat; background-position: center; }
```

When real `<img>` elements are used, switch to `object-fit`.

## Slideshow behavior (JS)

New file: `src/gallery.slideshow.ts` — exports `initSlideshow(galleryRoot, signal)` returning `{ cleanup() }`.

Responsibilities:
- **Active slide tracking**: IntersectionObserver (threshold 0.5, root = `.gallery__grid`) sets `aria-selected` on pagination indicators and updates the counter text
- **Prev/next buttons**: `scrollBy({ left: +/- slideWidth, behavior: 'smooth' })`
- **Pagination clicks**: dots/dashes/thumbnails are clickable, scroll to the corresponding slide
- **Keyboard nav**: left/right arrow keys when focus is inside the gallery, `e.preventDefault()` to avoid page scroll
- **Auto-play**: `setInterval` at `data-timing` seconds. Resets on manual interaction (button click, pagination click, keyboard nav). Pauses on `pointerenter` and `focusin`. Respects `prefers-reduced-motion` (never starts if active).
- **`aria-live`**: `"off"` while auto-playing, `"polite"` when stopped
- **Inert management**: non-visible slides get `inert` + `aria-hidden="true"` via IntersectionObserver
- **Cleanup**: `signal.addEventListener('abort', ...)` clears interval, disconnects observer

### Internal layout-switch lifecycle

When the user changes `data-layout` via the controls:
- If leaving slideshow: call slideshow `cleanup()`, null the reference
- If entering slideshow: call `initSlideshow(galleryRoot, signal)`
- Grid and masonry are CSS-only, no init/cleanup needed

This is managed inside `gallery.controls.ts` via the layout control's change handler, not the shell.

## State management

### `saveState()` changes

Add `EPHEMERAL_KEYS` to gallery (like nav):

```typescript
const EPHEMERAL_KEYS = new Set<string>(); // none currently, but ready for future use
```

Current slide index is NOT a data-attribute — it is tracked by IntersectionObserver in JS only, so it naturally resets on remount. No ephemeral key filtering needed for it.

All new data-attributes (`layout`, `fit`, `heading`, `autoplay`, `timing`, `pagination`) are saved by iterating `galleryRoot.dataset` (existing pattern). CSS custom properties (`--gallery-color`, `--gallery-accent`) saved as `css:` keys (existing pattern).

### On restore

Shell applies `data-layout="slideshow"` (etc.) to the DOM before `init()`. The controls code reads the DOM to set initial control states. If layout is `slideshow`, the layout change handler calls `initSlideshow()`. If `data-autoplay="true"`, the slideshow starts auto-advancing (unless `prefers-reduced-motion`).

## Controls layout

Top to bottom in the controls panel:

1. **Layout** — variant-style thumbnail picker (like nav's variant picker): 3 options with small preview icons for grid/slideshow/masonry
2. **Heading** — toggle (on/off)
3. **Columns** — segmented (2/3/4) — hidden for slideshow
4. **Spacing** — segmented (none/sm/md/lg) — hidden for slideshow
5. **Aspect Ratio** — segmented (square/landscape/portrait/auto)
6. **Fill** — segmented (cover/contain)
7. **Captions** — toggle (on/off)
8. **Auto Play** — toggle (on/off) — slideshow only
9. **Timing** — segmented (2s/4s/6s/8s) — slideshow only, hidden when autoplay off
10. **Pagination** — segmented (dots/dashes/counter/thumbnails) — slideshow only

## Files to create/modify

| File | Action | Notes |
|------|--------|-------|
| `src/gallery.partial.html` | Modify | Add heading, slideshow nav/pagination elements, new data-attr defaults |
| `src/gallery.css` | Modify | Add masonry, slideshow, pagination, heading, fill CSS |
| `src/gallery.controls.ts` | Modify | Add layout picker, new controls, HIDDEN_CONTROLS, slideshow lifecycle wiring |
| `src/gallery.slideshow.ts` | Create | Slideshow behavior (auto-play, IntersectionObserver, keyboard, pagination) |
| `src/gallery.section.ts` | Modify | Update destroy to handle slideshow cleanup, add ephemeral keys if needed |
| `tests/shell-switching.spec.ts` | Modify | Update existing gallery tests, add layout switching + state persistence tests |

## Acceptance Criteria

- [x] Layout picker switches between grid, slideshow, masonry
- [x] Controls show/hide correctly per layout
- [x] Grid works as before (columns, gap, aspect, captions) plus new fill and heading
- [x] Masonry uses CSS columns, respects columns/gap settings
- [x] Slideshow scrolls horizontally with scroll-snap, one slide at a time
- [x] Prev/next buttons navigate slides
- [x] Pagination (dots/dashes/counter/thumbnails) indicates active slide
- [x] Dots, dashes, and thumbnails are clickable to jump to a slide
- [x] Auto-play advances slides at the configured interval
- [x] Auto-play pauses on hover and focus
- [x] Auto-play respects `prefers-reduced-motion`
- [x] Manual navigation resets the auto-play timer
- [x] Heading toggles on/off
- [x] State persists across section switches (layout, all controls)
- [x] Slideshow slide index resets on remount (ephemeral)
- [x] Slideshow timers and observers are cleaned up on destroy and layout switch
- [x] Existing tests still pass
