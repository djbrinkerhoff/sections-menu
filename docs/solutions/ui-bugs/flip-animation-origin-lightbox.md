---
title: "Fix FLIP Animation Origin in Contained Lightbox"
category: ui-bugs
problem_type: ui_bug
component: "Image lightbox — FLIP open/close animation"
tags:
  - flip-animation
  - object-fit-cover
  - web-animations-api
  - scroll-lock
  - layout-shift
description: |
  FLIP lightbox animation originated from the wrong position — offscreen or
  offset from the clicked thumbnail. Three root causes: measuring sourceRect
  after layout mutations, ignoring object-fit:cover crop geometry, and using
  non-uniform scale. Close animation had a secondary issue where the image
  paused then snap-cropped into the thumbnail box.
keywords:
  - getBoundingClientRect
  - object-fit-cover
  - computeSourceRect
  - uniform-scale
  - scrollbar-shift
  - fill-both-persistence
---

# Fix FLIP Animation Origin in Contained Lightbox

## Symptom

The lightbox open animation sometimes originated from offscreen or an incorrect position instead of growing from the clicked thumbnail. Behavior was inconsistent: first open was often wrong, second open was correct. The close animation had a separate issue — the image would arrive at its destination, visibly pause, then snap-crop into the thumbnail's box.

## Investigation

### What didn't work

1. **Measuring sourceRect in rAF after layout mutations** — `lockScroll()` sets `overflow: hidden` on the scroll container, removing the scrollbar and shifting content width by ~15px. `syncDialogPosition()` sets dialog dimensions, potentially expanding the host. Measuring the thumbnail after these mutations gave coordinates that didn't match where the user clicked.

2. **Using raw `getBoundingClientRect()` on cover-cropped thumbnails** — Gallery thumbnails use `object-fit: cover` with `aspect-ratio: 1/1` (forced square). `getBoundingClientRect()` returns the element container (the square), not the visible image content. A landscape photo in a square container has its visual center offset from the element center.

3. **Independent `scaleX` / `scaleY`** — When source (square thumbnail) and target (natural aspect ratio lightbox) have different proportions, independent scale factors distort the image during animation.

### Root causes

| Cause | Effect | Severity |
|-------|--------|----------|
| sourceRect measured after `lockScroll()` | Animation starts from shifted position | High |
| `getBoundingClientRect()` ignores `object-fit: cover` crop | Animation origin misaligned with visible content | High |
| `scale(scaleX, scaleY)` non-uniform | Image stretches during animation | Medium |
| Close targets uncropped virtual rect | Pause then snap-crop on close | Medium |
| `fill: 'both'` persists `opacity: 0` | Image invisible on reopen after ~20 cycles | Medium |
| Open/close animations composite simultaneously | Visual judder during rapid interaction | Low |

## Solution

### 1. Compute virtual uncropped rect for object-fit:cover

Replicate the `object-fit: cover` math (inspired by PhotoSwipe's `getCroppedBoundsByElement`) to find where the full image sits within the cropped container:

```typescript
function computeSourceRect(img: HTMLImageElement): DOMRect | null {
  const thumbRect = img.getBoundingClientRect();
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return thumbRect;

  const style = window.getComputedStyle(img);
  if (style.objectFit !== 'cover') return thumbRect;

  const fillZoom = Math.max(thumbRect.width / naturalW, thumbRect.height / naturalH);
  const uncroppedW = naturalW * fillZoom;
  const uncroppedH = naturalH * fillZoom;

  return new DOMRect(
    thumbRect.left + (thumbRect.width - uncroppedW) / 2,
    thumbRect.top + (thumbRect.height - uncroppedH) / 2,
    uncroppedW,
    uncroppedH,
  );
}
```

### 2. Measure before layout mutations

Capture sourceRect **before** `syncDialogPosition()`, `lockScroll()`, and `dialog.show()`:

```typescript
// BEFORE any layout changes
const sourceRect = computeSourceRect(sourceTarget.image);

hideSourceThumbnail(sourceTarget);
syncDialogPosition();
lockScroll();
dialog.show();
// ...
requestAnimationFrame(() => {
  animateOpen(sourceRect); // uses pre-mutation measurement
});
```

### 3. Uniform scale

Replace `scale(scaleX, scaleY)` with a single uniform `scale(S)` based on width ratio:

```typescript
const scale = fromRect.width / Math.max(toRect.width, 1);
// { transform: `translate(${tx}px, ${ty}px) scale(${scale})` }
```

### 4. Smooth close with crossfade

For close, target the thumbnail's actual container rect (not uncropped), show the thumbnail before animation starts, and fade the lightbox image in the last 35%:

```typescript
// Show thumbnail underneath before animating
showSourceThumbnail();

// Transform runs full duration, opacity fades in the last 35%
const transform = image.animate(
  [{ transform: '...' }, { transform: '...' }],
  { duration: 220, easing: '...', fill: 'both' },
);
const fade = image.animate(
  [{ opacity: 1 }, { opacity: 0 }],
  { duration: 220 * 0.35, delay: 220 * 0.65, fill: 'both' },
);
```

### 5. Cancel stale animations

Cancel lingering `fill: 'both'` animations before opening or closing to prevent opacity persistence and compositing conflicts:

```typescript
function clearStaleAnimations(): void {
  image.getAnimations().forEach((a) => a.cancel());
  backdrop.getAnimations().forEach((a) => a.cancel());
  image.style.opacity = '';
}
```

Called at the start of both `open()` (before `dialog.show()`) and `animateClose()` (before starting close animations).

### 6. Await `image.decode()` before animation

Ensures the lightbox image has correct dimensions when measured, preventing zero-rect animation on first open:

```typescript
image.src = source;
image.alt = target.alt;
await image.decode().catch(() => {});
```

## Prevention

- **Measure before mutating.** Any time you need a `getBoundingClientRect()` for animation, capture it before layout-changing operations (scroll lock, overflow changes, DOM insertions).
- **Account for `object-fit` geometry.** Raw `getBoundingClientRect()` returns the element box, not the visible content area. When `object-fit: cover` is used, compute the virtual uncropped rect.
- **Use uniform scale.** Avoid `scale(scaleX, scaleY)` when animating between containers with different aspect ratios — it distorts the content.
- **Cancel prior animations on the same element.** The Web Animations API adds new animations without canceling existing ones. `fill: 'both'` makes the persistence of old animations particularly dangerous.
- **Await `decode()` before measuring images.** On cold cache, `image.src = url` does not guarantee the image is laid out when `getBoundingClientRect()` is called.

## References

- PhotoSwipe `getCroppedBoundsByElement`: computes `fillZoomLevel` + offsets for object-fit:cover
- medium-zoom: clone + scale approach (no crop awareness)
- Paul Lewis FLIP technique: measure before mutate, animate in rAF
- `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`: related containment constraint
- `src/image.lightbox.ts`: implementation
