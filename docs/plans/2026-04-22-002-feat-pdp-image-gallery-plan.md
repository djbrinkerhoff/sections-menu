# Plan: PDP product image gallery with thumbnails, lightbox, aspect ratio, fill, and radius

## Context

The PDP buy box shows one hero image but has 6 images per product in data. The user wants a thumbnail-based image gallery with lightbox, aspect ratio, fill, and border radius controls — features the gallery section already has.

The gallery **slideshow** (~456 lines, scroll-snap, loop clones, autoplay, arrow positioning) is too coupled and complex to reuse. But the **lightbox**, **image radius**, **aspect ratio**, and **fill** features are already generic modules that the PDP can use directly.

## Approach

- **Thumbnails + image swap**: build a simple PDP-specific viewer (~70 lines)
- **Lightbox**: reuse `initImageLightbox()` from `src/image.lightbox.ts` — it's selector-agnostic, just needs `[data-zoom-target]` triggers
- **Border radius**: reuse `applyImageRadius()` + `IMAGE_RADIUS_STOPS` from `src/image-radius.ts`
- **Aspect ratio + fill**: CSS rules on PDP root driven by `data-aspect` / `data-fit` attributes (same pattern as gallery)
- **Controls**: add aspect, fill, radius, and lightbox toggle to `pdp-buy-box.controls.ts` using existing `createSegmentedGroup` / `createLabeledRangeGroup`

## Changes

### 1. Create `src/pdp-buy-box.gallery.ts` (~70 lines)

```ts
export interface PdpGalleryHandle {
  cleanup(): void;
  setImages(images: PdpBuyBoxImage[]): void;
  readonly activeIndex: number;
}
export function initPdpGallery(heroImage, thumbsContainer, signal): PdpGalleryHandle
```

- `setImages()`: clears thumbs, builds `<button class="pdp-buy-box__thumb" data-zoom-target>` per image with background-image, resets to index 0, updates hero
- Click delegation on thumbs reads `data-index`, swaps hero src
- Each image trigger gets `data-zoom-target` so lightbox discovers them automatically
- Touch swipe on gallery container (pointerdown/move/up, delta > 40px)

### 2. Edit `src/pdp-buy-box.partial.html`

Replace single `<img>` in `.pdp-buy-box__media`:

```html
<figure class="pdp-buy-box__media">
  <button class="pdp-buy-box__trigger" type="button" data-zoom-target data-pdp-slot="hero-trigger">
    <img class="pdp-buy-box__image" ... data-pdp-slot="hero-image" />
  </button>
  <div class="pdp-buy-box__thumbs" data-pdp-slot="thumbs"></div>
</figure>
```

The `<button data-zoom-target>` wrapping the hero image is what the lightbox discovers.

### 3. Edit `src/pdp-buy-box.ts` (~20 line diff)

- Add `thumbsContainer` to elements query
- Import and init `initPdpGallery`
- Replace manual hero image assignment in `renderProduct()` with `gallery.setImages(currentProduct.images)`

### 4. Edit `src/pdp-buy-box.controls.ts`

Add controls using existing builders (all already imported/available):
- **Aspect ratio**: `createSegmentedGroup` — `['square', 'landscape', 'portrait', 'auto']`
- **Fill**: `createSegmentedGroup` — `['cover', 'contain']`
- **Border radius**: `createLabeledRangeGroup` with `IMAGE_RADIUS_STOPS` + `applyImageRadius()`
- **Lightbox toggle**: `createSegmentedGroup` — `['false', 'true']`

Each drives a `data-*` attribute on the PDP root, persisted via `saveState()`.

### 5. Edit `src/pdp-buy-box.css` (~50 lines)

Add PDP-specific rules mirroring gallery patterns:

```css
/* Trigger + image base */
.pdp-buy-box__trigger { border-radius: var(--image-radius, 0px); overflow: hidden; }
.pdp-buy-box__image { border-radius: var(--image-radius, 0px); }

/* Aspect ratio */
[data-aspect="square"] .pdp-buy-box__image { aspect-ratio: 1 / 1; }
[data-aspect="landscape"] .pdp-buy-box__image { aspect-ratio: 4 / 3; }
[data-aspect="portrait"] .pdp-buy-box__image { aspect-ratio: 3 / 4; }
[data-aspect="auto"] .pdp-buy-box__image { aspect-ratio: auto; }

/* Fill */
[data-fit="cover"] .pdp-buy-box__image { object-fit: cover; }
[data-fit="contain"] .pdp-buy-box__image { object-fit: contain; border-radius: 0; }

/* Thumbnails */
.pdp-buy-box__thumbs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.pdp-buy-box__thumb { aspect-ratio: 1/1; background-size: cover; opacity: 0.4; border-radius: var(--image-radius, 0px); }
.pdp-buy-box__thumb[aria-selected="true"] { opacity: 1; }
```

### 6. Edit `src/pdp-buy-box.section.ts`

Add `aspect`, `fit`, `radius`, `lightbox` to `saveState()` return (read from `root.dataset`).

### 7. Edit `src/pdp-buy-box.partial.html` defaults

Add default data attributes to root: `data-aspect="square" data-fit="cover" data-lightbox="true"`.

## Files touched

| File | Action |
|------|--------|
| `src/pdp-buy-box.gallery.ts` | **Create** ~70 lines |
| `src/pdp-buy-box.partial.html` | **Edit** — trigger wrapper + thumbs container |
| `src/pdp-buy-box.ts` | **Edit** — wire gallery, replace hero render |
| `src/pdp-buy-box.controls.ts` | **Edit** — add 4 controls |
| `src/pdp-buy-box.css` | **Edit** — add ~50 lines |
| `src/pdp-buy-box.section.ts` | **Edit** — expand saveState |

## Modules reused (no changes needed)

- `src/image.lightbox.ts` — `initImageLightbox(host, options)`
- `src/image-radius.ts` — `applyImageRadius(root, value)`, `IMAGE_RADIUS_STOPS`
- `src/control-builders.ts` — `createSegmentedGroup`, `createLabeledRangeGroup`
- `src/image.lightbox.css` — already imported via main.css

## Verification

- `npx tsc --noEmit`
- `npx playwright test tests/pdp-buy-box.spec.ts` — update image selector refs, add thumbnail + lightbox tests
- Visual: thumbnails rebuild on product switch, clicking thumb swaps hero, lightbox opens from hero click, aspect/fit/radius controls work at all viewports
