/** Slideshow behavior: scroll-snap navigation, auto-play, pagination, keyboard. */

export interface SlideshowHandle {
  cleanup(): void;
  goToIndex(index: number, options?: { immediate?: boolean; resetAutoplay?: boolean }): void;
  pauseAutoplay(): void;
  resumeAutoplay(): void;
  syncPagination(): void;
  syncLayout(): void;
}

export function initSlideshow(galleryRoot: HTMLElement, signal: AbortSignal): SlideshowHandle {
  const gridEl = galleryRoot.querySelector<HTMLElement>('.gallery__grid');
  if (!gridEl) throw new Error('Slideshow: .gallery__grid not found');
  const grid: HTMLElement = gridEl;
  const viewportEl = galleryRoot.querySelector<HTMLElement>('.gallery__viewport');
  const prevBtn = galleryRoot.querySelector<HTMLButtonElement>('.gallery__prev');
  const nextBtn = galleryRoot.querySelector<HTMLButtonElement>('.gallery__next');
  const paginationEl = galleryRoot.querySelector<HTMLElement>('.gallery__pagination');
  const counterEl = galleryRoot.querySelector<HTMLElement>('.gallery__counter');

  for (const clone of grid.querySelectorAll<HTMLElement>('[data-gallery-clone]')) {
    clone.remove();
  }

  const items = Array.from(grid.querySelectorAll<HTMLElement>('.gallery__item:not([hidden]):not([data-gallery-clone])'));
  const totalSlides = items.length;
  if (totalSlides === 0) {
    return {
      cleanup() {},
      goToIndex() {},
      pauseAutoplay() {},
      resumeAutoplay() {},
      syncPagination() {},
      syncLayout() {},
    };
  }

  let activeIndex = 0;
  let autoplayId: number | undefined;
  let scrollSettleId: number | undefined;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver(() => {
      updateArrowPosition();
    });
  const slideIndexByNode = new Map<HTMLElement, number>();
  const cloneWrapTargets = new Map<HTMLElement, HTMLElement>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item) slideIndexByNode.set(item, i);
  }

  function createLoopClone(
    source: HTMLElement,
    position: 'prepend' | 'append',
  ): HTMLElement {
    const clone = source.cloneNode(true);
    if (!(clone instanceof HTMLElement)) {
      throw new Error('Slideshow: failed to create loop clone');
    }

    clone.dataset.galleryClone = position;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');

    for (const focusable of clone.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]')) {
      focusable.tabIndex = -1;
    }

    for (const zoomTrigger of clone.querySelectorAll<HTMLElement>('[data-zoom-target]')) {
      zoomTrigger.removeAttribute('data-zoom-target');
      zoomTrigger.removeAttribute('data-zoom-group');
      zoomTrigger.setAttribute('aria-hidden', 'true');
    }

    return clone;
  }

  const firstItem = items[0] ?? null;
  const lastItem = items[totalSlides - 1] ?? null;
  const prependClone = totalSlides > 1 && lastItem
    ? createLoopClone(lastItem, 'prepend')
    : null;
  const appendClone = totalSlides > 1 && firstItem
    ? createLoopClone(firstItem, 'append')
    : null;

  if (prependClone) {
    grid.insertBefore(prependClone, items[0] ?? null);
    slideIndexByNode.set(prependClone, totalSlides - 1);
    if (lastItem) cloneWrapTargets.set(prependClone, lastItem);
  }

  if (appendClone) {
    grid.appendChild(appendClone);
    slideIndexByNode.set(appendClone, 0);
    if (firstItem) cloneWrapTargets.set(appendClone, firstItem);
  }

  const renderedSlides = [
    ...(prependClone ? [prependClone] : []),
    ...items,
    ...(appendClone ? [appendClone] : []),
  ];

  function updateArrowPosition(): void {
    if (!viewportEl) return;
    const images = items
      .map((item) => item.querySelector<HTMLImageElement>('.gallery__image'))
      .filter((image): image is HTMLImageElement => image instanceof HTMLImageElement);
    const referenceItem = items[activeIndex] ?? items[0];
    const referenceImage = referenceItem?.querySelector<HTMLImageElement>('.gallery__image') ?? images[0];
    if (!referenceItem || !referenceImage) return;

    const viewportRect = viewportEl.getBoundingClientRect();
    const referenceItemRect = referenceItem.getBoundingClientRect();
    const referenceRect = referenceImage.getBoundingClientRect();
    const bandTop = referenceItemRect.top;

    let anchorHeight = referenceRect.height;

    if (galleryRoot.dataset.aspect === 'auto') {
      const renderedWidth = referenceRect.width;
      const expectedHeights = images.map((image) => {
        const intrinsicWidth = Number(image.getAttribute('width') ?? '');
        const intrinsicHeight = Number(image.getAttribute('height') ?? '');
        if (intrinsicWidth > 0 && intrinsicHeight > 0) {
          return renderedWidth * (intrinsicHeight / intrinsicWidth);
        }
        return image.getBoundingClientRect().height;
      });
      anchorHeight = Math.max(...expectedHeights);
      viewportEl.style.setProperty('--gallery-image-band-height', `${anchorHeight}px`);
    } else {
      viewportEl.style.removeProperty('--gallery-image-band-height');
    }

    const arrowTop = bandTop - viewportRect.top + anchorHeight / 2;
    viewportEl.style.setProperty('--gallery-arrow-top', `${arrowTop}px`);
  }

  // ─── Pagination indicators ───

  function buildPagination(): void {
    if (!paginationEl) return;
    paginationEl.innerHTML = '';
    const usesThumbnailIndicators = galleryRoot.dataset.pagination === 'thumbnails';
    paginationEl.style.setProperty('--pagination-count', String(totalSlides));

    for (let i = 0; i < totalSlides; i++) {
      const btn = document.createElement('button');
      btn.className = 'gallery__indicator-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', `Slide ${i + 1}`);

      const indicator = document.createElement('span');
      indicator.className = 'gallery__indicator';

      // For thumbnails, use the image src as background
      const img = items[i]?.querySelector<HTMLImageElement>('img.gallery__image');
      if (usesThumbnailIndicators && img) {
        indicator.style.backgroundImage = `url(${img.src})`;
      }

      btn.appendChild(indicator);
      btn.addEventListener('click', () => goToSlide(i), { signal });
      paginationEl.appendChild(btn);
    }
  }

  function updateActiveState(index: number): void {
    if (index === activeIndex && index !== 0) return;
    activeIndex = index;

    // Update pagination buttons
    if (paginationEl) {
      const buttons = paginationEl.querySelectorAll<HTMLElement>('[role="tab"]');
      buttons.forEach((btn, i) => {
        btn.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    // Update counter
    if (counterEl) {
      counterEl.textContent = `${index + 1} of ${totalSlides}`;
    }

    // Update inert state on slides
    items.forEach((item, i) => {
      if (i === index) {
        item.removeAttribute('inert');
        item.removeAttribute('aria-hidden');
      } else {
        item.setAttribute('inert', '');
        item.setAttribute('aria-hidden', 'true');
      }
    });

    updateArrowPosition();
  }

  // ─── Navigation ───

  function moveToSlide(
    target: HTMLElement,
    index: number,
    options?: { immediate?: boolean; resetAutoplay?: boolean },
  ): void {
    const left = target.offsetLeft;
    if (!target) return;

    if (options?.immediate) {
      const previousScrollBehavior = grid.style.scrollBehavior;
      grid.style.scrollBehavior = 'auto';
      grid.scrollLeft = left;
      updateActiveState(index);
      requestAnimationFrame(() => {
        grid.style.scrollBehavior = previousScrollBehavior;
      });
      if (options.resetAutoplay !== false) {
        resetAutoplay();
      }
      return;
    }

    const behavior = prefersReducedMotion.matches ? 'auto' as const : 'smooth' as const;
    grid.scrollTo({ left, behavior });
    if (options?.resetAutoplay !== false) {
      resetAutoplay();
    }
  }

  function goToSlide(index: number, options?: { immediate?: boolean; resetAutoplay?: boolean }): void {
    const clamped = Math.max(0, Math.min(totalSlides - 1, index));
    const target = items[clamped];
    if (!target) return;
    moveToSlide(target, clamped, options);
  }

  function goNext(): void {
    const nextIndex = activeIndex + 1 >= totalSlides ? 0 : activeIndex + 1;
    const shouldWrap = activeIndex + 1 >= totalSlides;
    if (shouldWrap && appendClone && !prefersReducedMotion.matches) {
      moveToSlide(appendClone, nextIndex);
      return;
    }
    goToSlide(nextIndex, { immediate: shouldWrap });
  }

  function goPrev(): void {
    const prevIndex = activeIndex - 1 < 0 ? totalSlides - 1 : activeIndex - 1;
    const shouldWrap = activeIndex - 1 < 0;
    if (shouldWrap && prependClone && !prefersReducedMotion.matches) {
      moveToSlide(prependClone, prevIndex);
      return;
    }
    goToSlide(prevIndex, { immediate: shouldWrap });
  }

  function currentRenderedSlide(): HTMLElement | null {
    const currentLeft = grid.scrollLeft;
    let closest: HTMLElement | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const slide of renderedSlides) {
      const distance = Math.abs(slide.offsetLeft - currentLeft);
      if (distance < closestDistance) {
        closest = slide;
        closestDistance = distance;
      }
    }

    return closest;
  }

  function normalizeLoopPosition(): void {
    const currentSlide = currentRenderedSlide();
    if (!currentSlide) return;

    const wrapTarget = cloneWrapTargets.get(currentSlide);
    if (!wrapTarget) return;

    const targetIndex = slideIndexByNode.get(wrapTarget);
    if (targetIndex === undefined) return;

    moveToSlide(wrapTarget, targetIndex, { immediate: true, resetAutoplay: false });
  }

  function queueLoopNormalization(): void {
    if (scrollSettleId !== undefined) {
      window.clearTimeout(scrollSettleId);
    }

    scrollSettleId = window.setTimeout(() => {
      scrollSettleId = undefined;
      normalizeLoopPosition();
    }, 80);
  }

  // ─── Active slide tracking via IntersectionObserver ───

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = slideIndexByNode.get(entry.target as HTMLElement);
          if (idx !== undefined) {
            updateActiveState(idx);
          }
        }
      }
    },
    { root: grid, threshold: 0.5 },
  );

  for (const slide of renderedSlides) {
    observer.observe(slide);
  }

  // ─── Auto-play ───

  function startAutoplay(): void {
    stopAutoplay();
    if (prefersReducedMotion.matches) return;
    if (galleryRoot.dataset.autoplay !== 'true') return;

    const seconds = Number(galleryRoot.dataset.timing) || 4;
    grid.setAttribute('aria-live', 'off');
    autoplayId = window.setInterval(goNext, seconds * 1000);
  }

  function stopAutoplay(): void {
    if (autoplayId !== undefined) {
      window.clearInterval(autoplayId);
      autoplayId = undefined;
    }
    grid.setAttribute('aria-live', 'polite');
  }

  function resetAutoplay(): void {
    if (galleryRoot.dataset.autoplay === 'true') {
      startAutoplay();
    }
  }

  // ─── Event listeners ───

  prevBtn?.addEventListener('click', goPrev, { signal });
  nextBtn?.addEventListener('click', goNext, { signal });

  // Keyboard nav (scoped to gallery)
  galleryRoot.addEventListener('keydown', (e: KeyboardEvent) => {
    if (galleryRoot.dataset.layout !== 'slideshow') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  }, { signal });

  // Pause auto-play on hover and focus
  grid.addEventListener('pointerenter', stopAutoplay, { signal });
  grid.addEventListener('pointerleave', resetAutoplay, { signal });
  grid.addEventListener('focusin', stopAutoplay, { signal });
  grid.addEventListener('focusout', resetAutoplay, { signal });
  grid.addEventListener('scroll', queueLoopNormalization, { signal, passive: true });

  // Respect reduced-motion changes
  prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches) {
      stopAutoplay();
    } else {
      resetAutoplay();
    }
  }, { signal });

  // ─── Init ───

  for (const item of items) {
    const image = item.querySelector<HTMLElement>('.gallery__image');
    if (image) resizeObserver?.observe(image);
  }

  buildPagination();
  updateActiveState(0);
  goToSlide(0, { immediate: true, resetAutoplay: false });
  requestAnimationFrame(() => {
    updateArrowPosition();
  });

  // Start auto-play if preference is on
  if (galleryRoot.dataset.autoplay === 'true') {
    startAutoplay();
  }

  // ─── Cleanup ───

  signal.addEventListener('abort', () => {
    stopAutoplay();
    if (scrollSettleId !== undefined) {
      window.clearTimeout(scrollSettleId);
      scrollSettleId = undefined;
    }
    observer.disconnect();
    resizeObserver?.disconnect();
    prependClone?.remove();
    appendClone?.remove();
    // Remove inert from all items on teardown
    for (const item of items) {
      item.removeAttribute('inert');
      item.removeAttribute('aria-hidden');
    }
  });

  return {
    cleanup() {
      stopAutoplay();
      if (scrollSettleId !== undefined) {
        window.clearTimeout(scrollSettleId);
        scrollSettleId = undefined;
      }
      observer.disconnect();
      resizeObserver?.disconnect();
      prependClone?.remove();
      appendClone?.remove();
      for (const item of items) {
        item.removeAttribute('inert');
        item.removeAttribute('aria-hidden');
      }
    },
    goToIndex(index: number, options?: { immediate?: boolean }) {
      goToSlide(index, options);
    },
    pauseAutoplay() {
      stopAutoplay();
    },
    resumeAutoplay() {
      resetAutoplay();
    },
    syncPagination() {
      buildPagination();
      updateActiveState(activeIndex);
      requestAnimationFrame(() => {
        updateArrowPosition();
      });
    },
    syncLayout() {
      requestAnimationFrame(() => {
        updateArrowPosition();
      });
    },
  };
}
