import { getZoomTrigger, resolveZoomCollection, type ZoomTarget } from './image.targets';
import {
  clearInert,
  collectInertChildren,
  findScrollContainer,
  getFocusableElements,
  lockScroll,
  setTriggerExpanded,
  syncDialogPosition as syncDialogPositionShared,
  unlockScroll,
} from './lightbox.shared';

const SCROLL_CLOSE_THRESHOLD = 40;
const SWIPE_CLOSE_GUARD = 56;
const OPEN_DURATION_MS = 280;
const CLOSE_DURATION_MS = 220;
const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const CLOSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export interface LightboxSession {
  readonly targets: ZoomTarget[];
  readonly activeIndex: number;
  readonly mode: 'single' | 'collection';
}

export interface ImageLightboxOptions {
  isEnabled?(): boolean;
  onIndexChange?(session: LightboxSession): void;
  onOpen?(session: LightboxSession): void;
  onClose?(session: LightboxSession): void;
}

export interface ImageLightboxHandle {
  close(options?: CloseOptions): void;
  cleanup(): void;
  handleViewportChange(): void;
  isOpen(): boolean;
}

interface CloseOptions {
  animate?: boolean;
  restoreFocus?: boolean;
  notify?: boolean;
}

interface ActiveState {
  targets: ZoomTarget[];
  activeIndex: number;
  invoker: HTMLElement;
}

interface ScrollBaseline {
  target: EventTarget;
  top: number;
  left: number;
}

interface SwipeState {
  pointerId: number;
  startX: number;
  startY: number;
}

function getSession(state: ActiveState): LightboxSession {
  return {
    targets: state.targets,
    activeIndex: state.activeIndex,
    mode: state.targets.length > 1 ? 'collection' : 'single',
  };
}

function isScrollable(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element);
  const overflowY = styles.overflowY;
  const overflowX = styles.overflowX;
  const yScrollable = /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight;
  const xScrollable = /(auto|scroll|overlay)/.test(overflowX) && element.scrollWidth > element.clientWidth;
  return yScrollable || xScrollable;
}

function getScrollTop(target: EventTarget): number {
  if (target === window) return window.scrollY;
  if (target instanceof HTMLElement) return target.scrollTop;
  return 0;
}

function getScrollLeft(target: EventTarget): number {
  if (target === window) return window.scrollX;
  if (target instanceof HTMLElement) return target.scrollLeft;
  return 0;
}

async function preloadImage(src: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

/**
 * Compute the virtual uncropped image rect for a thumbnail.
 * When an image uses object-fit:cover with a forced aspect ratio,
 * getBoundingClientRect returns the container box (e.g. a square),
 * not the visible image content. This replicates the cover math
 * to find where the full image sits within the cropped container.
 */
function computeSourceRect(img: HTMLImageElement): DOMRect | null {
  const thumbRect = img.getBoundingClientRect();
  if (!thumbRect.width || !thumbRect.height) return null;

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return thumbRect;

  const style = window.getComputedStyle(img);
  if (style.objectFit !== 'cover') return thumbRect;

  const hRatio = thumbRect.width / naturalW;
  const vRatio = thumbRect.height / naturalH;
  const fillZoom = Math.max(hRatio, vRatio);

  const uncroppedW = naturalW * fillZoom;
  const uncroppedH = naturalH * fillZoom;
  const left = thumbRect.left + (thumbRect.width - uncroppedW) / 2;
  const top = thumbRect.top + (thumbRect.height - uncroppedH) / 2;

  return new DOMRect(left, top, uncroppedW, uncroppedH);
}

function createDialog(): {
  dialog: HTMLDialogElement;
  backdrop: HTMLDivElement;
  viewport: HTMLDivElement;
  image: HTMLImageElement;
  closeButton: HTMLButtonElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  counter: HTMLParagraphElement;
} {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-lightbox';
  dialog.setAttribute('aria-label', 'Expanded image view');
  dialog.setAttribute('aria-modal', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'image-lightbox__backdrop';

  const surface = document.createElement('div');
  surface.className = 'image-lightbox__surface';

  const closeButton = document.createElement('button');
  closeButton.className = 'image-lightbox__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image');
  closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>';

  const viewport = document.createElement('div');
  viewport.className = 'image-lightbox__viewport';

  const prevButton = document.createElement('button');
  prevButton.className = 'image-lightbox__nav image-lightbox__nav--prev';
  prevButton.type = 'button';
  prevButton.setAttribute('aria-label', 'Previous image');
  prevButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="11,4 6,9 11,14"/></svg>';

  const nextButton = document.createElement('button');
  nextButton.className = 'image-lightbox__nav image-lightbox__nav--next';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next image');
  nextButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7,4 12,9 7,14"/></svg>';

  const figure = document.createElement('figure');
  figure.className = 'image-lightbox__figure';

  const image = document.createElement('img');
  image.className = 'image-lightbox__image';
  image.decoding = 'async';
  figure.appendChild(image);

  const footer = document.createElement('div');
  footer.className = 'image-lightbox__footer';

  const counter = document.createElement('p');
  counter.className = 'image-lightbox__counter';
  footer.appendChild(counter);

  viewport.appendChild(prevButton);
  viewport.appendChild(figure);
  viewport.appendChild(nextButton);

  surface.appendChild(closeButton);
  surface.appendChild(viewport);
  surface.appendChild(footer);

  dialog.appendChild(backdrop);
  dialog.appendChild(surface);

  return { dialog, backdrop, viewport, image, closeButton, prevButton, nextButton, counter };
}

export function initImageLightbox(host: HTMLElement, options: ImageLightboxOptions = {}): ImageLightboxHandle {
  const { dialog, backdrop, viewport, image, closeButton, prevButton, nextButton, counter } = createDialog();
  host.appendChild(dialog);

  const abortController = new AbortController();
  const { signal } = abortController;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeState: ActiveState | null = null;
  let inertedChildren: HTMLElement[] = [];
  let scrollAbort: AbortController | null = null;
  let scrollBaselines: ScrollBaseline[] = [];
  let swipeState: SwipeState | null = null;
  let pendingRenderId = 0;
  let sessionId = 0;
  let isClosing = false;
  let destroyed = false;
  let hiddenThumbnail: HTMLImageElement | null = null;
  let scrollContainer: HTMLElement | null = null;
  let wheelCloseDistance = 0;

  function resolveScrollContainer(): HTMLElement | null {
    if (!scrollContainer) scrollContainer = findScrollContainer(host);
    return scrollContainer;
  }

  function syncDialogPosition(): void {
    const container = resolveScrollContainer();
    if (!container) return;
    syncDialogPositionShared(dialog, container);
  }

  function doLockScroll(): void {
    const container = resolveScrollContainer();
    if (container) lockScroll(container);
  }

  function doUnlockScroll(): void {
    unlockScroll(scrollContainer);
  }

  function isOpen(): boolean {
    // True when dialog is visible OR an open() is in-flight (activeState set,
    // awaiting renderIndex before dialog.show). Mutations must cancel both.
    return dialog.open || activeState !== null;
  }

  function syncChrome(): void {
    if (!activeState) return;

    const total = activeState.targets.length;
    const activeIndex = activeState.activeIndex;
    const isCollection = total > 1;

    dialog.dataset.mode = isCollection ? 'collection' : 'single';
    prevButton.disabled = !isCollection;
    nextButton.disabled = !isCollection;
    counter.textContent = isCollection ? `${activeIndex + 1} of ${total}` : '';
  }

  function applyInert(): void {
    clearInert(inertedChildren);
    inertedChildren = collectInertChildren(host, dialog);
  }

  function getScrollSources(): EventTarget[] {
    const sources: EventTarget[] = [window];
    let current = host.parentElement;
    while (current) {
      if (isScrollable(current)) sources.push(current);
      current = current.parentElement;
    }
    return sources;
  }

  function stopScrollClose(): void {
    scrollAbort?.abort();
    scrollAbort = null;
    scrollBaselines = [];
  }

  function onScrollClose(): void {
    if (!activeState || activeState.targets.length > 1) return;
    syncDialogPosition();
    const maxDelta = scrollBaselines.reduce((largest, baseline) => {
      const topDelta = Math.abs(getScrollTop(baseline.target) - baseline.top);
      const leftDelta = Math.abs(getScrollLeft(baseline.target) - baseline.left);
      return Math.max(largest, topDelta, leftDelta);
    }, 0);

    if (maxDelta >= SCROLL_CLOSE_THRESHOLD) {
      close();
    }
  }

  function onWheel(event: WheelEvent): void {
    if (!activeState) return;

    // Single-image: scroll to close
    if (activeState.targets.length <= 1) {
      wheelCloseDistance += Math.abs(event.deltaY) + Math.abs(event.deltaX);
      if (wheelCloseDistance >= SCROLL_CLOSE_THRESHOLD) {
        event.preventDefault();
        void close();
      }
      return;
    }

    // Collection: no wheel navigation
  }

  function startScrollClose(): void {
    stopScrollClose();
    if (!activeState || activeState.targets.length > 1) return;

    scrollAbort = new AbortController();
    const sources = getScrollSources();
    scrollBaselines = sources.map((target) => ({
      target,
      top: getScrollTop(target),
      left: getScrollLeft(target),
    }));

    for (const source of sources) {
      source.addEventListener('scroll', onScrollClose, { passive: true, signal: scrollAbort.signal });
    }
  }

  function animateBackdrop(fromOpacity: number, toOpacity: number, duration: number): Animation | null {
    if (prefersReducedMotion.matches) return null;
    return backdrop.animate(
      [{ opacity: fromOpacity }, { opacity: toOpacity }],
      { duration, easing: 'ease-out', fill: 'both' },
    );
  }

  function computeFlipValues(fromRect: DOMRect, toRect: DOMRect): { translateX: number; translateY: number; scale: number } {
    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;
    return {
      translateX: fromCenterX - toCenterX,
      translateY: fromCenterY - toCenterY,
      scale: fromRect.width / Math.max(toRect.width, 1),
    };
  }

  function animateImageOpen(fromRect: DOMRect, toRect: DOMRect): Animation {
    const { translateX, translateY, scale } = computeFlipValues(fromRect, toRect);
    return image.animate(
      [
        { transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: OPEN_DURATION_MS, easing: OPEN_EASING, fill: 'both' },
    );
  }

  function animateImageClose(fromRect: DOMRect, toRect: DOMRect): Animation[] {
    const { translateX, translateY, scale } = computeFlipValues(fromRect, toRect);
    const transform = image.animate(
      [
        { transform: 'translate(0, 0) scale(1)' },
        { transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` },
      ],
      { duration: CLOSE_DURATION_MS, easing: CLOSE_EASING, fill: 'both' },
    );
    const fade = image.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: CLOSE_DURATION_MS * 0.35, delay: CLOSE_DURATION_MS * 0.65, easing: 'ease-out', fill: 'both' },
    );
    return [transform, fade];
  }

  async function resolveDisplaySource(target: ZoomTarget): Promise<string> {
    const fallback = target.image.currentSrc || target.image.src || target.source;
    if (target.source === fallback) return fallback;

    try {
      await preloadImage(target.source);
      return target.source;
    } catch {
      return fallback;
    }
  }

  function preloadNeighbors(): void {
    if (!activeState || activeState.targets.length <= 1) return;
    const current = activeState.activeIndex;
    const neighbors = [activeState.targets[current - 1], activeState.targets[current + 1]]
      .filter((target): target is ZoomTarget => Boolean(target));

    for (const target of neighbors) {
      void preloadImage(target.source).catch(() => {});
    }
  }

  async function renderIndex(index: number): Promise<void> {
    if (!activeState) return;
    const target = activeState.targets[index];
    if (!target) return;

    const renderId = ++pendingRenderId;
    const source = await resolveDisplaySource(target);
    if (!activeState || renderId !== pendingRenderId) return;

    image.src = source;
    image.alt = target.alt;
    await image.decode().catch(() => {});
    if (!activeState || renderId !== pendingRenderId) return;

    activeState.activeIndex = index;
    syncChrome();

    // Defer neighbor preloads so they don't compete with current image
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => preloadNeighbors());
    } else {
      setTimeout(() => preloadNeighbors(), 300);
    }
  }

  function hideSourceThumbnail(target: ZoomTarget | undefined): void {
    if (hiddenThumbnail) {
      hiddenThumbnail.style.opacity = '';
      hiddenThumbnail = null;
    }
    if (target?.image) {
      target.image.style.opacity = '0';
      hiddenThumbnail = target.image;
    }
  }

  function showSourceThumbnail(): void {
    if (hiddenThumbnail) {
      hiddenThumbnail.style.opacity = '';
      hiddenThumbnail = null;
    }
  }

  function setChromeVisible(visible: boolean): void {
    closeButton.hidden = !visible;
    prevButton.hidden = !visible;
    nextButton.hidden = !visible;
    counter.hidden = !visible;
  }

  function clearStaleAnimations(): void {
    image.getAnimations().forEach((a) => a.cancel());
    backdrop.getAnimations().forEach((a) => a.cancel());
    image.style.opacity = '';
    image.style.transform = '';
  }

  function animateOpen(sourceRect: DOMRect | null): void {
    const targetRect = image.getBoundingClientRect();
    const animations: Animation[] = [];

    const backdropAnim = animateBackdrop(0, 1, OPEN_DURATION_MS);
    if (backdropAnim) animations.push(backdropAnim);
    if (sourceRect && !prefersReducedMotion.matches) {
      animations.push(animateImageOpen(sourceRect, targetRect));
    }

    for (const animation of animations) {
      animation.finished.catch(() => {});
    }
  }

  function animateClose(targetRect: DOMRect | null): Promise<void> {
    if (prefersReducedMotion.matches) return Promise.resolve();

    // Cancel any in-flight open animation to prevent compositing conflicts
    clearStaleAnimations();

    const currentRect = image.getBoundingClientRect();
    const animations: Animation[] = [];

    const backdropAnim = animateBackdrop(1, 0, CLOSE_DURATION_MS);
    if (backdropAnim) animations.push(backdropAnim);
    if (targetRect) {
      animations.push(...animateImageClose(targetRect, currentRect));
    }

    if (animations.length === 0) return Promise.resolve();
    return Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
  }

  async function goToIndex(index: number): Promise<void> {
    if (!activeState) return;
    const total = activeState.targets.length;
    const wrapped = ((index % total) + total) % total;
    if (wrapped === activeState.activeIndex) return;
    await renderIndex(wrapped);
    if (activeState && activeState.activeIndex === wrapped) {
      options.onIndexChange?.(getSession(activeState));
    }
  }

  async function open(trigger: HTMLElement): Promise<void> {
    if (destroyed) return;
    const targets = resolveZoomCollection(host, trigger);
    const activeIndex = targets.findIndex((target) => target.trigger === trigger);
    if (targets.length === 0 || activeIndex === -1) return;

    // Reset stale close state — a new open cancels any in-progress close
    isClosing = false;
    clearStaleAnimations();

    sessionId++;
    const openSessionId = sessionId;

    activeState = {
      targets,
      activeIndex,
      invoker: trigger,
    };

    setTriggerExpanded(trigger, true);
    const sourceTarget = targets[activeIndex];

    await renderIndex(activeIndex);
    if (!activeState || sessionId !== openSessionId) return;

    // Measure source rect BEFORE any layout mutations (scroll lock, dialog positioning)
    const sourceRect = sourceTarget ? computeSourceRect(sourceTarget.image) : null;

    hideSourceThumbnail(sourceTarget);
    clearStaleAnimations();
    syncDialogPosition();
    if (activeState.targets.length > 1) {
      doLockScroll();
    } else {
      doUnlockScroll();
    }
    if (!dialog.open) dialog.show();
    applyInert();
    syncChrome();
    closeButton.focus();
    startScrollClose();
    options.onOpen?.(getSession(activeState));

    requestAnimationFrame(() => {
      if (!activeState || sessionId !== openSessionId) return;
      animateOpen(sourceRect);
    });
  }

  async function close(closeOptions: CloseOptions = {}): Promise<void> {
    if (!activeState || destroyed) return;
    const {
      animate = true,
      restoreFocus = true,
      notify = true,
    } = closeOptions;
    const state = activeState;
    const closeSessionId = sessionId;
    if (isClosing) {
      if (animate) return;
      clearStaleAnimations();
    } else {
      isClosing = true;
      pendingRenderId += 1;
      stopScrollClose();
      swipeState = null;
      wheelCloseDistance = 0;

      setChromeVisible(false);

      // Measure the thumbnail's actual container rect (cropped box) while scroll is still locked
      const activeTarget = state.targets[state.activeIndex];
      const closeTargetRect = activeTarget?.image.isConnected && !activeTarget.image.closest('[hidden]')
        ? activeTarget.image.getBoundingClientRect()
        : null;

      // Show the thumbnail before animating so the cropped image is visible underneath
      showSourceThumbnail();

      if (animate) {
        await animateClose(closeTargetRect);
      } else {
        clearStaleAnimations();
      }
    }

    // If a new open() started during the close animation, bail out
    if (sessionId !== closeSessionId || activeState !== state) return;

    activeState = null;
    isClosing = false;
    if (dialog.open) dialog.close();
    doUnlockScroll();
    clearInert(inertedChildren);
    inertedChildren = [];
    setChromeVisible(true);
    setTriggerExpanded(state.invoker, false);
    if (restoreFocus && state.invoker.isConnected) {
      state.invoker.focus();
    }
    if (notify) {
      options.onClose?.(getSession(state));
    }
  }

  function handleKeyboard(event: KeyboardEvent): void {
    if (!activeState || isClosing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      void close();
      return;
    }

    if (event.key === 'ArrowLeft' && activeState.targets.length > 1) {
      event.preventDefault();
      void goToIndex(activeState.activeIndex - 1);
      return;
    }

    if (event.key === 'ArrowRight' && activeState.targets.length > 1) {
      event.preventDefault();
      void goToIndex(activeState.activeIndex + 1);
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (!activeState || isClosing || activeState.targets.length <= 1) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (swipeState !== null) return;
    if (event.target instanceof Element && event.target.closest('button')) return;

    swipeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function onPointerUp(event: PointerEvent): void {
    if (!activeState || isClosing || !swipeState) return;
    if (swipeState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeState.startX;
    const deltaY = event.clientY - swipeState.startY;
    swipeState = null;

    if (Math.abs(deltaX) < SWIPE_CLOSE_GUARD) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    if (deltaX < 0) {
      void goToIndex(activeState.activeIndex + 1);
    } else {
      void goToIndex(activeState.activeIndex - 1);
    }
  }

  function onPointerCancel(event: PointerEvent): void {
    if (swipeState?.pointerId === event.pointerId) {
      swipeState = null;
    }
  }

  dialog.addEventListener('keydown', handleKeyboard, { signal });
  dialog.addEventListener('wheel', onWheel, { passive: false, signal });
  closeButton.addEventListener('click', () => { void close(); }, { signal });
  prevButton.addEventListener('click', () => {
    if (!activeState) return;
    void goToIndex(activeState.activeIndex - 1);
  }, { signal });
  nextButton.addEventListener('click', () => {
    if (!activeState) return;
    void goToIndex(activeState.activeIndex + 1);
  }, { signal });
  backdrop.addEventListener('click', () => { void close(); }, { signal });
  dialog.addEventListener('click', (event) => {
    const target = event.target;
    // Close when clicking outside the image and interactive controls
    if (target === image) return;
    if (target instanceof HTMLButtonElement) return;
    if (target instanceof Element && target.closest('button')) return;
    void close();
  }, { signal });
  viewport.addEventListener('pointerdown', onPointerDown, { signal });
  viewport.addEventListener('pointerup', onPointerUp, { signal });
  viewport.addEventListener('pointercancel', onPointerCancel, { signal });

  host.addEventListener('click', (event) => {
    if (options.isEnabled && !options.isEnabled()) return;
    const trigger = getZoomTrigger(event.target);
    if (!trigger) return;
    event.preventDefault();
    void open(trigger);
  }, { signal });

  host.addEventListener('keydown', (event) => {
    if (options.isEnabled && !options.isEnabled()) return;
    const trigger = getZoomTrigger(event.target);
    if (!trigger) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void open(trigger);
  }, { signal });

  return {
    close(options = {}) {
      void close(options);
    },
    cleanup() {
      if (destroyed) return;
      const state = activeState;
      destroyed = true;
      sessionId += 1;
      pendingRenderId += 1;
      isClosing = false;
      activeState = null;
      swipeState = null;
      wheelCloseDistance = 0;
      clearStaleAnimations();
      abortController.abort();
      stopScrollClose();
      doUnlockScroll();
      showSourceThumbnail();
      clearInert(inertedChildren);
      inertedChildren = [];
      setChromeVisible(true);
      if (state) {
        setTriggerExpanded(state.invoker, false);
      }
      if (dialog.open) dialog.close();
      dialog.remove();
    },
    handleViewportChange() {
      if (!activeState) return;
      syncDialogPosition();
      startScrollClose();
      syncChrome();
    },
    isOpen,
  };
}
