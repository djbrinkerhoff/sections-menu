import { getZoomTrigger, resolveZoomCollection, type ZoomTarget } from './image.targets';

const SCROLL_CLOSE_THRESHOLD = 40;
const SWIPE_CLOSE_GUARD = 56;
const SWIPE_VERTICAL_RATIO = 1.2;
const ZOOM_ANIMATION_MS = 220;

export interface LightboxSession {
  readonly targets: ZoomTarget[];
  readonly activeIndex: number;
  readonly mode: 'single' | 'collection';
}

export interface ImageLightboxOptions {
  isEnabled?(): boolean;
  onOpen?(session: LightboxSession): void;
  onClose?(session: LightboxSession): void;
}

export interface ImageLightboxHandle {
  close(): void;
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

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selector))
    .filter((element) => !element.hidden && element.tabIndex !== -1);
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
  closeButton.textContent = '\u00d7';

  const viewport = document.createElement('div');
  viewport.className = 'image-lightbox__viewport';

  const prevButton = document.createElement('button');
  prevButton.className = 'image-lightbox__nav image-lightbox__nav--prev';
  prevButton.type = 'button';
  prevButton.setAttribute('aria-label', 'Previous image');
  prevButton.innerHTML = '&#8249;';

  const nextButton = document.createElement('button');
  nextButton.className = 'image-lightbox__nav image-lightbox__nav--next';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next image');
  nextButton.innerHTML = '&#8250;';

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
  let destroyed = false;

  function isOpen(): boolean {
    return activeState !== null && dialog.open;
  }

  function setTriggerExpanded(trigger: HTMLElement, expanded: boolean): void {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function syncChrome(): void {
    if (!activeState) return;

    const total = activeState.targets.length;
    const activeIndex = activeState.activeIndex;
    const isCollection = total > 1;

    dialog.dataset.mode = isCollection ? 'collection' : 'single';
    prevButton.disabled = !isCollection || activeIndex === 0;
    nextButton.disabled = !isCollection || activeIndex === total - 1;
    counter.textContent = isCollection ? `${activeIndex + 1} of ${total}` : '';
  }

  function clearInert(): void {
    for (const child of inertedChildren) {
      child.removeAttribute('inert');
      child.removeAttribute('aria-hidden');
    }
    inertedChildren = [];
  }

  function applyInert(): void {
    clearInert();
    for (const child of Array.from(host.children)) {
      if (!(child instanceof HTMLElement) || child === dialog) continue;
      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
      inertedChildren.push(child);
    }
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
    const maxDelta = scrollBaselines.reduce((largest, baseline) => {
      const topDelta = Math.abs(getScrollTop(baseline.target) - baseline.top);
      const leftDelta = Math.abs(getScrollLeft(baseline.target) - baseline.left);
      return Math.max(largest, topDelta, leftDelta);
    }, 0);

    if (maxDelta >= SCROLL_CLOSE_THRESHOLD) {
      close();
    }
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

  function animateBackdrop(fromOpacity: number, toOpacity: number): Animation | null {
    if (prefersReducedMotion.matches) return null;
    return backdrop.animate(
      [{ opacity: fromOpacity }, { opacity: toOpacity }],
      { duration: ZOOM_ANIMATION_MS, easing: 'ease-out', fill: 'both' },
    );
  }

  function animateImageRect(fromRect: DOMRect | null, toRect: DOMRect, direction: 'open' | 'close'): Animation | null {
    if (!fromRect || prefersReducedMotion.matches) return null;

    const fromCenterX = fromRect.left + fromRect.width / 2;
    const fromCenterY = fromRect.top + fromRect.height / 2;
    const toCenterX = toRect.left + toRect.width / 2;
    const toCenterY = toRect.top + toRect.height / 2;

    const translateX = fromCenterX - toCenterX;
    const translateY = fromCenterY - toCenterY;
    const scaleX = fromRect.width / Math.max(toRect.width, 1);
    const scaleY = fromRect.height / Math.max(toRect.height, 1);

    const keyframes = direction === 'open'
      ? [
          { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, opacity: 0.82 },
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
        ]
      : [
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
          { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, opacity: 0.82 },
        ];

    return image.animate(keyframes, {
      duration: ZOOM_ANIMATION_MS,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'both',
    });
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
    activeState.activeIndex = index;
    syncChrome();
    preloadNeighbors();
  }

  function animateOpen(sourceRect: DOMRect | null): void {
    const targetRect = image.getBoundingClientRect();
    const animations = [
      animateBackdrop(0, 1),
      animateImageRect(sourceRect, targetRect, 'open'),
    ].filter((animation): animation is Animation => animation !== null);

    if (animations.length === 0) return;
    for (const animation of animations) {
      animation.finished.catch(() => {});
    }
  }

  function animateClose(targetRect: DOMRect | null): Promise<void> {
    if (prefersReducedMotion.matches) return Promise.resolve();

    const currentRect = image.getBoundingClientRect();
    const animations = [
      animateBackdrop(1, 0),
      targetRect ? animateImageRect(targetRect, currentRect, 'close') : null,
    ].filter((animation): animation is Animation => animation !== null);

    if (animations.length === 0) return Promise.resolve();
    return Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(() => undefined);
  }

  async function goToIndex(index: number): Promise<void> {
    if (!activeState) return;
    const clamped = Math.max(0, Math.min(activeState.targets.length - 1, index));
    if (clamped === activeState.activeIndex) return;
    await renderIndex(clamped);
  }

  async function open(trigger: HTMLElement): Promise<void> {
    if (destroyed) return;
    const targets = resolveZoomCollection(host, trigger);
    const activeIndex = targets.findIndex((target) => target.trigger === trigger);
    if (targets.length === 0 || activeIndex === -1) return;

    sessionId++;
    const openSessionId = sessionId;

    activeState = {
      targets,
      activeIndex,
      invoker: trigger,
    };

    setTriggerExpanded(trigger, true);
    const sourceRect = targets[activeIndex]?.image.getBoundingClientRect() ?? null;

    await renderIndex(activeIndex);
    if (!activeState || sessionId !== openSessionId) return;

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
    activeState = null;
    pendingRenderId += 1;
    stopScrollClose();
    swipeState = null;

    const activeTarget = state.targets[state.activeIndex];
    const closeTargetRect = activeTarget?.image.isConnected && !activeTarget.image.closest('[hidden]')
      ? activeTarget.image.getBoundingClientRect()
      : null;

    if (animate) {
      await animateClose(closeTargetRect);
    }

    // If a new open() started during the close animation, bail out
    if (sessionId !== closeSessionId) return;

    if (dialog.open) dialog.close();
    clearInert();
    setTriggerExpanded(state.invoker, false);
    if (restoreFocus && state.invoker.isConnected) {
      state.invoker.focus();
    }
    if (notify) {
      options.onClose?.(getSession(state));
    }
  }

  function handleKeyboard(event: KeyboardEvent): void {
    if (!activeState) return;

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
    if (!activeState || activeState.targets.length <= 1) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (swipeState !== null) return;

    swipeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function onPointerUp(event: PointerEvent): void {
    if (!activeState || !swipeState) return;
    if (swipeState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeState.startX;
    const deltaY = event.clientY - swipeState.startY;
    swipeState = null;

    if (Math.abs(deltaX) < SWIPE_CLOSE_GUARD) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_VERTICAL_RATIO) return;

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
    close() {
      void close();
    },
    cleanup() {
      destroyed = true;
      void close({ animate: false, restoreFocus: false, notify: false });
      abortController.abort();
      stopScrollClose();
      clearInert();
      if (dialog.open) dialog.close();
      dialog.remove();
    },
    handleViewportChange() {
      if (!activeState) return;
      startScrollClose();
      syncChrome();
    },
    isOpen,
  };
}
