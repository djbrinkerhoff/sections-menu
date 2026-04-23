import type { PdpBuyBoxImage } from './pdp-buy-box.data';

const CLOSE_DURATION_MS = 180;
const DESKTOP_MIN_WIDTH = 736;

type LightboxMode = 'desktop' | 'mobile';

interface CloseOptions {
  animate?: boolean;
  restoreFocus?: boolean;
}

interface PdpBuyBoxLightboxOptions {
  getActiveIndex(): number;
  getImages(): readonly PdpBuyBoxImage[];
  isEnabled(): boolean;
  onActiveIndexChange(index: number): void;
}

interface ActiveState {
  activeIndex: number;
  figures: HTMLElement[];
  images: readonly PdpBuyBoxImage[];
  invoker: HTMLElement;
  mode: LightboxMode;
  thumbButtons: HTMLButtonElement[];
}

export interface PdpBuyBoxLightboxHandle {
  cleanup(): void;
  close(options?: CloseOptions): void;
  handleViewportChange(): void;
  isOpen(): boolean;
  open(index: number, invoker: HTMLElement): void;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
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

function createDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'pdp-buy-box-lightbox';
  dialog.setAttribute('aria-label', 'Expanded product gallery');
  dialog.setAttribute('aria-modal', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'pdp-buy-box-lightbox__backdrop';

  const surface = document.createElement('div');
  surface.className = 'pdp-buy-box-lightbox__surface';

  const closeButton = document.createElement('button');
  closeButton.className = 'pdp-buy-box-lightbox__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image viewer');
  closeButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>';

  const body = document.createElement('div');
  body.className = 'pdp-buy-box-lightbox__body';

  const railShell = document.createElement('div');
  railShell.className = 'pdp-buy-box-lightbox__rail-shell';

  const railUp = document.createElement('button');
  railUp.className = 'pdp-buy-box-lightbox__rail-control pdp-buy-box-lightbox__rail-control--up';
  railUp.type = 'button';
  railUp.setAttribute('aria-label', 'Show previous image');
  railUp.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,10 8,6 12,10"/></svg>';

  const railViewport = document.createElement('div');
  railViewport.className = 'pdp-buy-box-lightbox__rail-viewport';

  const rail = document.createElement('div');
  rail.className = 'pdp-buy-box-lightbox__rail';
  railViewport.appendChild(rail);

  const railDown = document.createElement('button');
  railDown.className = 'pdp-buy-box-lightbox__rail-control pdp-buy-box-lightbox__rail-control--down';
  railDown.type = 'button';
  railDown.setAttribute('aria-label', 'Show next image');
  railDown.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,6 8,10 12,6"/></svg>';

  railShell.appendChild(railUp);
  railShell.appendChild(railViewport);
  railShell.appendChild(railDown);

  const stack = document.createElement('div');
  stack.className = 'pdp-buy-box-lightbox__stack';

  body.appendChild(railShell);
  body.appendChild(stack);
  surface.appendChild(closeButton);
  surface.appendChild(body);
  dialog.appendChild(backdrop);
  dialog.appendChild(surface);

  return {
    backdrop,
    closeButton,
    dialog,
    rail,
    railDown,
    railShell,
    railUp,
    railViewport,
    stack,
  };
}

export function initPdpBuyBoxLightbox(
  host: HTMLElement,
  options: PdpBuyBoxLightboxOptions,
): PdpBuyBoxLightboxHandle {
  const {
    backdrop,
    closeButton,
    dialog,
    rail,
    railDown,
    railShell,
    railUp,
    railViewport,
    stack,
  } = createDialog();

  host.appendChild(dialog);

  const abortController = new AbortController();
  const { signal } = abortController;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeState: ActiveState | null = null;
  let closeTimer = 0;
  let destroyed = false;
  let ignoreScrollSync = false;
  let inertedChildren: HTMLElement[] = [];
  let pendingScrollTargetTop: number | null = null;
  let resumeScrollSyncFrame = 0;
  let settleScrollSyncFrame = 0;
  let scrollContainer: HTMLElement | null = null;
  let scrollSyncFallbackTimer = 0;
  let scrollSyncFrame = 0;

  function getMode(): LightboxMode {
    return host.clientWidth >= DESKTOP_MIN_WIDTH ? 'desktop' : 'mobile';
  }

  function findScrollContainer(): HTMLElement | null {
    let current = host.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      if (/(auto|scroll|overlay)/.test(style.overflowY)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function syncDialogPosition(): void {
    if (!scrollContainer) {
      scrollContainer = findScrollContainer();
    }
    if (!scrollContainer) return;

    dialog.style.top = `${scrollContainer.scrollTop}px`;
    dialog.style.height = `${scrollContainer.clientHeight}px`;
  }

  function lockScroll(): void {
    if (!scrollContainer) {
      scrollContainer = findScrollContainer();
    }
    if (scrollContainer) {
      scrollContainer.style.overflow = 'hidden';
    }
  }

  function unlockScroll(): void {
    if (scrollContainer) {
      scrollContainer.style.overflow = '';
    }
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

  function setTriggerExpanded(trigger: HTMLElement, expanded: boolean): void {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function clearContent(): void {
    rail.replaceChildren();
    stack.replaceChildren();
    railViewport.scrollTop = 0;
  }

  function updateRailControls(): void {
    if (!activeState || activeState.mode !== 'desktop') {
      railShell.hidden = true;
      return;
    }

    railShell.hidden = false;
    const hasMultipleImages = activeState.images.length > 1;

    railUp.hidden = !hasMultipleImages;
    railDown.hidden = !hasMultipleImages;
    railUp.disabled = !hasMultipleImages || activeState.activeIndex <= 0;
    railDown.disabled = !hasMultipleImages
      || activeState.activeIndex >= activeState.images.length - 1;
  }

  function syncActiveIndex(index: number): void {
    if (!activeState) return;

    const nextIndex = clampIndex(index, activeState.images.length);
    activeState.activeIndex = nextIndex;

    for (const [figureIndex, figure] of activeState.figures.entries()) {
      const selected = figureIndex === nextIndex;
      figure.dataset.active = selected ? 'true' : 'false';
    }

    for (const [buttonIndex, button] of activeState.thumbButtons.entries()) {
      const selected = buttonIndex === nextIndex;
      button.dataset.selected = selected ? 'true' : 'false';
      button.setAttribute('aria-current', selected ? 'true' : 'false');
      if (selected) {
        button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    options.onActiveIndexChange(nextIndex);
    updateRailControls();
  }

  function getFigureScrollTop(figure: HTMLElement): number {
    const stackRect = stack.getBoundingClientRect();
    const figureRect = figure.getBoundingClientRect();
    const paddingTop = Number.parseFloat(window.getComputedStyle(stack).paddingTop) || 0;
    return Math.max(0, figureRect.top - stackRect.top + stack.scrollTop - paddingTop);
  }

  function syncActiveIndexFromScroll(): void {
    scrollSyncFrame = 0;
    if (!activeState || activeState.figures.length === 0) return;

    const scrollTop = stack.scrollTop;
    let closestIndex = activeState.activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const [index, figure] of activeState.figures.entries()) {
      const distance = Math.abs(getFigureScrollTop(figure) - scrollTop);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    if (closestIndex !== activeState.activeIndex) {
      syncActiveIndex(closestIndex);
    } else {
      updateRailControls();
    }
  }

  function scheduleScrollSync(): void {
    if (ignoreScrollSync) return;
    if (scrollSyncFrame !== 0) return;
    scrollSyncFrame = window.requestAnimationFrame(syncActiveIndexFromScroll);
  }

  function clearPendingScrollSyncResume(): void {
    if (resumeScrollSyncFrame !== 0) {
      window.cancelAnimationFrame(resumeScrollSyncFrame);
      resumeScrollSyncFrame = 0;
    }

    if (settleScrollSyncFrame !== 0) {
      window.cancelAnimationFrame(settleScrollSyncFrame);
      settleScrollSyncFrame = 0;
    }
    if (scrollSyncFallbackTimer !== 0) {
      window.clearTimeout(scrollSyncFallbackTimer);
      scrollSyncFallbackTimer = 0;
    }
  }

  function resumeScrollSync(): void {
    clearPendingScrollSyncResume();
    pendingScrollTargetTop = null;
    ignoreScrollSync = false;
    scheduleScrollSync();
  }

  function pauseScrollSync(): void {
    ignoreScrollSync = true;
    pendingScrollTargetTop = null;
    clearPendingScrollSyncResume();

    resumeScrollSyncFrame = window.requestAnimationFrame(() => {
      resumeScrollSyncFrame = 0;
      settleScrollSyncFrame = window.requestAnimationFrame(() => {
        settleScrollSyncFrame = 0;
        resumeScrollSync();
      });
    });
  }

  function pauseScrollSyncUntilTarget(targetTop: number): void {
    ignoreScrollSync = true;
    pendingScrollTargetTop = targetTop;
    clearPendingScrollSyncResume();
    scrollSyncFallbackTimer = window.setTimeout(() => {
      scrollSyncFallbackTimer = 0;
      resumeScrollSync();
    }, 600);
  }

  function goToIndex(index: number, immediate = false): void {
    if (!activeState) return;

    const nextIndex = clampIndex(index, activeState.images.length);
    const target = activeState.figures[nextIndex];
    if (!target) return;
    const targetTop = getFigureScrollTop(target);
    const shouldScrollImmediately = immediate || prefersReducedMotion.matches;

    syncActiveIndex(nextIndex);
    if (shouldScrollImmediately) {
      pauseScrollSync();
    } else {
      pauseScrollSyncUntilTarget(targetTop);
    }
    stack.scrollTo({
      top: targetTop,
      behavior: shouldScrollImmediately ? 'auto' : 'smooth',
    });
  }

  function render(): void {
    if (!activeState) return;

    dialog.dataset.mode = activeState.mode;
    clearContent();

    const figures: HTMLElement[] = [];
    const thumbButtons: HTMLButtonElement[] = [];

    for (const [index, image] of activeState.images.entries()) {
      if (activeState.mode === 'desktop') {
        const thumbButton = document.createElement('button');
        thumbButton.className = 'pdp-buy-box-lightbox__rail-thumb';
        thumbButton.type = 'button';
        thumbButton.dataset.index = String(index);
        thumbButton.setAttribute('aria-label', `Show image ${index + 1} of ${activeState.images.length}`);

        const thumbImage = document.createElement('img');
        thumbImage.className = 'pdp-buy-box-lightbox__rail-thumb-image';
        thumbImage.src = image.src;
        thumbImage.alt = image.alt;
        thumbImage.width = image.width;
        thumbImage.height = image.height;
        thumbImage.loading = 'lazy';

        thumbButton.appendChild(thumbImage);
        rail.appendChild(thumbButton);
        thumbButtons.push(thumbButton);
      }

      const figure = document.createElement('figure');
      figure.className = 'pdp-buy-box-lightbox__figure';
      figure.dataset.index = String(index);

      const stackImage = document.createElement('img');
      stackImage.className = 'pdp-buy-box-lightbox__image';
      stackImage.src = image.src;
      stackImage.alt = image.alt;
      stackImage.width = image.width;
      stackImage.height = image.height;
      stackImage.decoding = 'async';

      figure.appendChild(stackImage);
      stack.appendChild(figure);
      figures.push(figure);
    }

    const backToTopButton = document.createElement('button');
    backToTopButton.className = 'pdp-buy-box-lightbox__back-to-top';
    backToTopButton.type = 'button';
    backToTopButton.textContent = 'Back to top';
    stack.appendChild(backToTopButton);

    activeState.figures = figures;
    activeState.thumbButtons = thumbButtons;
    syncActiveIndex(activeState.activeIndex);
    goToIndex(activeState.activeIndex, true);
    updateRailControls();
  }

  function finishClose(restoreTarget: HTMLElement | null, restoreFocus: boolean): void {
    if (closeTimer !== 0) {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    }

    if (scrollSyncFrame !== 0) {
      window.cancelAnimationFrame(scrollSyncFrame);
      scrollSyncFrame = 0;
    }

    clearPendingScrollSyncResume();
    pendingScrollTargetTop = null;
    ignoreScrollSync = false;

    if (dialog.open) {
      dialog.close();
    }

    dialog.removeAttribute('data-mode');
    dialog.removeAttribute('data-state');
    clearContent();
    unlockScroll();
    clearInert();

    if (restoreFocus && restoreTarget && restoreTarget.isConnected) {
      restoreTarget.focus();
    }
  }

  function close(closeOptions: CloseOptions = {}): void {
    const { animate = true, restoreFocus = true } = closeOptions;
    if (!activeState && !dialog.open) return;

    const restoreTarget = activeState?.invoker ?? null;
    if (restoreTarget) {
      setTriggerExpanded(restoreTarget, false);
    }

    activeState = null;

    if (!dialog.open || !animate || prefersReducedMotion.matches) {
      finishClose(restoreTarget, restoreFocus);
      return;
    }

    dialog.dataset.state = 'closing';
    closeTimer = window.setTimeout(() => {
      finishClose(restoreTarget, restoreFocus);
    }, CLOSE_DURATION_MS);
  }

  function handleKeyboard(event: KeyboardEvent): void {
    if (!activeState) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (activeState.mode === 'desktop' && event.key === 'ArrowLeft') {
      event.preventDefault();
      goToIndex(activeState.activeIndex - 1);
      return;
    }

    if (activeState.mode === 'desktop' && event.key === 'ArrowRight') {
      event.preventDefault();
      goToIndex(activeState.activeIndex + 1);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      closeButton.focus();
      return;
    }

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

  dialog.addEventListener('keydown', handleKeyboard, { signal });
  backdrop.addEventListener('click', () => {
    close();
  }, { signal });
  closeButton.addEventListener('click', () => {
    close();
  }, { signal });
  stack.addEventListener('scroll', () => {
    if (ignoreScrollSync && pendingScrollTargetTop !== null) {
      if (Math.abs(stack.scrollTop - pendingScrollTargetTop) <= 1) {
        resumeScrollSync();
      }
      return;
    }

    scheduleScrollSync();
  }, { signal });
  stack.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>('.pdp-buy-box-lightbox__back-to-top');
    if (!button) return;

    goToIndex(0);
  }, { signal });
  rail.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>('.pdp-buy-box-lightbox__rail-thumb');
    if (!button) return;

    const index = Number.parseInt(button.dataset.index ?? '', 10);
    if (!Number.isFinite(index)) return;

    goToIndex(index);
  }, { signal });
  railUp.addEventListener('click', () => {
    if (!activeState) return;
    goToIndex(activeState.activeIndex - 1);
  }, { signal });
  railDown.addEventListener('click', () => {
    if (!activeState) return;
    goToIndex(activeState.activeIndex + 1);
  }, { signal });

  return {
    cleanup() {
      destroyed = true;
      close({ animate: false, restoreFocus: false });
      abortController.abort();
      dialog.remove();
    },
    close(closeOptions = {}) {
      close(closeOptions);
    },
    handleViewportChange() {
      if (!activeState) {
        syncDialogPosition();
        return;
      }

      if (getMode() !== activeState.mode) {
        close({ animate: false, restoreFocus: false });
        return;
      }

      syncDialogPosition();
      requestAnimationFrame(() => {
        if (!activeState || destroyed) return;
        goToIndex(activeState.activeIndex, true);
      });
    },
    isOpen() {
      return dialog.open || activeState !== null;
    },
    open(index: number, invoker: HTMLElement) {
      if (destroyed || !options.isEnabled()) return;

      const images = options.getImages();
      if (images.length === 0) return;

      if (closeTimer !== 0) {
        window.clearTimeout(closeTimer);
        closeTimer = 0;
      }
      dialog.removeAttribute('data-state');

      if (activeState?.invoker && activeState.invoker !== invoker) {
        setTriggerExpanded(activeState.invoker, false);
      }

      activeState = {
        activeIndex: clampIndex(index, images.length),
        figures: [],
        images,
        invoker,
        mode: getMode(),
        thumbButtons: [],
      };

      setTriggerExpanded(invoker, true);
      dialog.dataset.mode = activeState.mode;
      syncDialogPosition();
      lockScroll();
      applyInert();
      if (!dialog.open) {
        dialog.show();
      }

      render();

      requestAnimationFrame(() => {
        if (!activeState || destroyed) return;
        syncDialogPosition();
        dialog.dataset.state = 'open';
        closeButton.focus({ preventScroll: true });
      });
    },
  };
}
