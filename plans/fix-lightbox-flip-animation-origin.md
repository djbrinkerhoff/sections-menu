---
title: "fix: Consistent lightbox FLIP animation origin"
type: fix
status: active
date: 2026-04-17
---

# fix: Consistent lightbox FLIP animation origin

## Problem Statement

The lightbox open/close animation sometimes originates from the wrong position — the image appears to fly in from offscreen instead of growing out of the clicked thumbnail. The close animation can also miss the thumbnail landing. This is most noticeable on first open and when scrollbar visibility changes.

## Root Causes

Three root causes identified via code analysis and research into PhotoSwipe/medium-zoom:

### 1. sourceRect measured after layout mutations

`lockScroll()` sets `overflow: hidden` on the scroll container, which removes the scrollbar and shifts content width by ~15px. `syncDialogPosition()` sets `dialog.style.top/height`, which can expand the host element. The current code measures `sourceRect` inside a `requestAnimationFrame` — **after** both mutations have fired. The thumbnail has already shifted from where the user clicked it.

**Evidence:** `src/image.lightbox.ts` lines 468-481 — `lockScroll()` at 470, `sourceRect` measured at 481.

### 2. object-fit:cover produces wrong source rect

Gallery thumbnails use `object-fit: cover` with `aspect-ratio: 1/1` (forced square). `getBoundingClientRect()` returns the element's box (the square container), not the visible image content area. A landscape photo cropped to a square has its visible center offset from the element center. The animation maps between the wrong coordinates.

**Evidence:** `src/gallery.css` lines 151-153 (`aspect-ratio: 1/1; object-fit: cover`), `src/image.lightbox.ts` line 328-329 (raw `scaleX`/`scaleY` from container rect).

### 3. Non-uniform scale distorts the image

`animateImageRect` computes independent `scaleX` and `scaleY` from source/target width and height ratios. When source is square (cover-cropped) and target is natural aspect ratio (contain), this produces non-uniform scaling — the image stretches during animation.

**Evidence:** `src/image.lightbox.ts` lines 328-329.

## Proposed Solution

Adopt PhotoSwipe's proven `innerRect` technique: compute the virtual uncropped image bounds inside the thumbnail container, use those for the FLIP calculation, and apply uniform scale.

### Implementation

- [ ] **Capture sourceRect before layout mutations**

Move the thumbnail measurement to before `syncDialogPosition()` and `lockScroll()`. Pass it into the rAF via closure.

```typescript
// BEFORE any layout changes
const sourceRect = computeSourceRect(sourceTarget);

hideSourceThumbnail(sourceTarget);
syncDialogPosition();
lockScroll();
dialog.show();
// ...
requestAnimationFrame(() => {
  const targetRect = image.getBoundingClientRect();
  animateOpen(sourceRect, targetRect);
});
```

- [ ] **Compute virtual uncropped rect for object-fit:cover thumbnails**

Add a `computeSourceRect` function that replicates the `object-fit: cover` math to find where the full image sits within the cropped container:

```typescript
function computeSourceRect(target: ZoomTarget): DOMRect | null {
  const img = target.image;
  const thumbRect = img.getBoundingClientRect();
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return thumbRect;

  // Check if the image is cropped (cover + forced aspect)
  const style = window.getComputedStyle(img);
  if (style.objectFit !== 'cover') return thumbRect;

  // Replicate object-fit:cover math
  const hRatio = thumbRect.width / naturalW;
  const vRatio = thumbRect.height / naturalH;
  const fillZoom = Math.max(hRatio, vRatio);

  const uncropped = {
    width: naturalW * fillZoom,
    height: naturalH * fillZoom,
    left: thumbRect.left + (thumbRect.width - naturalW * fillZoom) / 2,
    top: thumbRect.top + (thumbRect.height - naturalH * fillZoom) / 2,
  };

  return new DOMRect(uncropped.left, uncropped.top, uncropped.width, uncropped.height);
}
```

This produces the rect of the full image as if it weren't cropped — aligned with the visible center of the thumbnail.

- [ ] **Use uniform scale instead of independent scaleX/scaleY**

Replace the current `scale(scaleX, scaleY)` with a single `scale(S)` based on width ratio from the uncropped source to the target:

```typescript
const scale = fromRect.width / Math.max(toRect.width, 1);
// Single uniform scale — no distortion
{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }
```

- [ ] **Fix close animation: measure target while scroll is still locked**

The close path currently unlocks scroll before measuring. This causes the inverse problem — scrollbar reappearing shifts the thumbnail. Measure while locked, animate, then unlock:

```typescript
// Measure BEFORE unlock (layout matches what user sees)
const closeTargetRect = computeSourceRect(activeTarget) ?? fallbackRect;
unlockScroll();
clearInert();
await animateClose(closeTargetRect);
```

- [ ] **Tune easing and duration**

Per research (PhotoSwipe defaults, animation best practices):

```typescript
const OPEN_DURATION = 280;   // slightly longer for smooth settle
const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';  // decisive ease-out
const CLOSE_DURATION = 220;  // faster for responsiveness
const CLOSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';  // standard ease-in-out
```

- [ ] **Update tests for new wrapping behavior**

Verify animation doesn't break existing Playwright tests. No new tests needed — animation quality is visual, not assertion-based.

## Files

- Modify: `src/image.lightbox.ts` — animation functions, open/close sequences
- Modify: `src/image.lightbox.css` — remove `border-radius` from image during animation (optional polish)

## Key Decisions

- **Target-image animation (not clone):** Matches collection navigation model. Clone approach (medium-zoom) would require managing clone lifecycle during prev/next.
- **Uniform scale (not non-uniform):** Prevents distortion. The crop-to-uncrop visual difference is handled by the `innerRect` computation, not by stretching.
- **View Transitions API not used:** It snapshots the whole document (including shell chrome), provides less control over crop transitions, and doesn't solve the core `object-fit` mismatch.

## References

- PhotoSwipe `getCroppedBoundsByElement`: computes `fillZoomLevel` + offsets for object-fit:cover
- medium-zoom: clone + scale approach, no crop awareness
- Paul Lewis FLIP technique: measure before mutate, animate in rAF
- Current code: `src/image.lightbox.ts` lines 318-416 (animation), 440-530 (open/close)
