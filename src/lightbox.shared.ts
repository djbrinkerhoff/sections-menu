// Shared utilities for lightbox implementations.
// Extracted from image.lightbox.ts and pdp-buy-box.lightbox.ts to eliminate duplication.

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.tabIndex !== -1);
}

export function findScrollContainer(host: HTMLElement): HTMLElement | null {
  let current = host.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return current;
    current = current.parentElement;
  }
  return null;
}

export function setTriggerExpanded(trigger: HTMLElement, expanded: boolean): void {
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

export function syncDialogPosition(
  dialog: HTMLElement,
  scrollContainer: HTMLElement,
): void {
  const top = scrollContainer.scrollTop;
  const height = scrollContainer.clientHeight;
  dialog.style.top = `${top}px`;
  dialog.style.height = `${height}px`;
}

export function lockScroll(scrollContainer: HTMLElement): void {
  scrollContainer.style.overflow = 'hidden';
}

export function unlockScroll(scrollContainer: HTMLElement | null): void {
  if (scrollContainer) scrollContainer.style.overflow = '';
}

export function clearInert(children: HTMLElement[]): void {
  for (const child of children) {
    child.removeAttribute('inert');
    child.removeAttribute('aria-hidden');
  }
}

export function collectInertChildren(host: HTMLElement, exclude: HTMLElement): HTMLElement[] {
  const inerted: HTMLElement[] = [];
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement) || child === exclude) continue;
    child.setAttribute('inert', '');
    child.setAttribute('aria-hidden', 'true');
    inerted.push(child);
  }
  return inerted;
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}
