---
title: "Fix Overlay Containment in Preview Container"
category: ui-bugs
problem_type: ui_bug
component: "Nav prototype shell — CSS containment architecture"
tags:
  - css-containment
  - position-fixed
  - dialog-api
  - stacking-contexts
  - viewport-simulation
description: |
  Three overlay containment bugs where fullscreen/sidebar/cart surfaces
  escaped a preview container meant to simulate viewport sizes. Root causes:
  position:fixed ignores non-viewport containing blocks, showModal() promotes
  to browser top layer, and position:relative on a parent creates an
  unintended containing block trapping child overlays.
keywords:
  - containing-block
  - stacking-context
  - dialog-showModal
  - fixed-positioning
  - preview-frame
---

# Fix Overlay Containment in Preview Container

## Symptom

In a side-by-side shell layout (preview canvas + controls panel), three overlay surfaces escaped the preview container (`#preview-root`):

1. **Fullscreen overlay** covered the entire browser window instead of the 375/768/1280px preview card
2. **Sidebar drawer** slid in from the browser edge, not the preview edge
3. **Cart dialog** (via `showModal()`) appeared in the browser top layer, inerted the controls panel, and ignored the selected viewport width

## Investigation

### What didn't work

- **Increasing `z-index`** on the preview container — doesn't affect `position: fixed` elements, which are always relative to the viewport (or an ancestor with `transform`/`will-change`/`contain`)
- **`overflow: hidden`** on the preview container — clips content but doesn't change the containing block for fixed-position descendants
- **`position: relative; z-index: 50`** on `nav__inner` (the top bar) to stack it above the overlay — this *created* a new containing block, trapping the `position: absolute; inset: 0` overlay within the nav bar's ~48px height instead of filling the preview container

### Key CSS concepts at play

1. **`position: fixed`** is relative to the viewport (or the nearest ancestor with `transform`, `will-change`, or `contain`). It ignores `position: relative` ancestors entirely.
2. **`dialog.showModal()`** promotes the element to the browser's **top layer**, which sits above all other content. It also applies `inert` to all sibling DOM trees — including the controls panel.
3. **`position: absolute`** is relative to the nearest **positioned ancestor** (one with `position` other than `static`). If a parent gets `position: relative`, it becomes the containing block — even if you intended the grandparent.

## Root Cause

Three separate CSS containment violations, all stemming from the same architectural mismatch: treating a `<div>` preview container like an iframe without understanding which CSS mechanisms respect container boundaries.

## Solution

### 1. Replace `fixed` with `absolute` for overlays

```css
/* Before (escapes to browser viewport) */
[data-variant="fullscreen"][data-open="true"] .nav__primary {
  @apply fixed inset-0 z-40 ...;
}

/* After (fills #preview-root which has position: relative) */
[data-variant="fullscreen"][data-open="true"] .nav__primary {
  @apply absolute inset-0 z-40 ...;
}
```

Ensure `#preview-root` has `position: relative` (it does via the `relative` Tailwind class).

### 2. Replace `showModal()` with `show()` + manual handling

```ts
// Before (escapes to top layer, inerts entire document)
cartDialog.showModal();

// After (stays in normal DOM flow within preview)
function openCartDrawer(): void {
  const dialog = getCartDialog();
  if (!dialog || dialog.open) return;
  dialog.show();           // NOT showModal()
  inertPush();             // Manual inert on preview content only
  dialog.focus();
}
```

Add manual Escape key and backdrop-click handlers since `show()` doesn't provide them.

### 3. Z-stack individual children, not the parent container

```css
/* Before (nav__inner becomes containing block, traps overlay) */
[data-variant="fullscreen"][data-open="true"] .nav__inner {
  @apply relative z-50;
}

/* After (children stack above overlay without creating a containing block) */
[data-variant="fullscreen"][data-open="true"] .nav__menu-toggle,
[data-variant="fullscreen"][data-open="true"] .nav__logo,
[data-variant="fullscreen"][data-open="true"] .nav__actions {
  @apply relative z-50;
}
```

This lets `position: absolute; inset: 0` on the overlay escape past `nav__inner` to `#preview-root`.

### 4. Give the preview container viewport-like dimensions

```html
<!-- min-height simulates a phone viewport for absolute overlays -->
<div id="preview-root" class="w-[375px] min-h-[667px] ... relative">
```

Without this, `absolute inset-0` fills a 0-height container.

## Prevention

- **Never use `position: fixed`** inside a preview/simulation container that isn't an actual iframe. Use `absolute` + a `relative` ancestor.
- **Never use `showModal()`** when the dialog must stay scoped to a sub-tree. Use `show()` with manual focus/escape/backdrop handling.
- **Before adding `position: relative` to any element**, check whether it has `position: absolute` descendants that need to escape to a grandparent. If so, apply positioning to leaf children instead.
- **Rule of thumb:** if your layout has a "viewport simulation" container, treat it as the positioning root and audit every `fixed`/`absolute` descendant to confirm it anchors there.

## Related

- [MDN: Containing block](https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block)
- [MDN: dialog.showModal() — top layer](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)
- [CSS stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context)
