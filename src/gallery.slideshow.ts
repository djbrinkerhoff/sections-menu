/** Slideshow behavior: scroll-snap navigation, auto-play, pagination, keyboard. */

export interface SlideshowHandle {
  cleanup(): void;
  syncPagination(): void;
}

export function initSlideshow(galleryRoot: HTMLElement, signal: AbortSignal): SlideshowHandle {
  const gridEl = galleryRoot.querySelector<HTMLElement>('.gallery__grid');
  if (!gridEl) throw new Error('Slideshow: .gallery__grid not found');
  const grid: HTMLElement = gridEl;
  const prevBtn = galleryRoot.querySelector<HTMLButtonElement>('.gallery__prev');
  const nextBtn = galleryRoot.querySelector<HTMLButtonElement>('.gallery__next');
  const paginationEl = galleryRoot.querySelector<HTMLElement>('.gallery__pagination');
  const counterEl = galleryRoot.querySelector<HTMLElement>('.gallery__counter');

  const items = Array.from(grid.querySelectorAll<HTMLElement>('.gallery__item:not([hidden])'));
  const totalSlides = items.length;
  if (totalSlides === 0) return { cleanup() {}, syncPagination() {} };

  let activeIndex = 0;
  let autoplayId: number | undefined;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  }

  // ─── Navigation ───

  function goToSlide(index: number, options?: { immediate?: boolean }): void {
    const clamped = Math.max(0, Math.min(totalSlides - 1, index));
    const target = items[clamped];
    if (!target) return;

    if (options?.immediate) {
      const previousScrollBehavior = grid.style.scrollBehavior;
      grid.style.scrollBehavior = 'auto';
      grid.scrollLeft = target.offsetLeft;
      updateActiveState(clamped);
      requestAnimationFrame(() => {
        grid.style.scrollBehavior = previousScrollBehavior;
      });
      resetAutoplay();
      return;
    }

    const behavior = prefersReducedMotion.matches ? 'auto' as const : 'smooth' as const;
    target.scrollIntoView({ behavior, block: 'nearest', inline: 'start' });
    resetAutoplay();
  }

  function goNext(): void {
    const nextIndex = activeIndex + 1 >= totalSlides ? 0 : activeIndex + 1;
    goToSlide(nextIndex, { immediate: nextIndex === 0 });
  }

  function goPrev(): void {
    const prevIndex = activeIndex - 1 < 0 ? totalSlides - 1 : activeIndex - 1;
    goToSlide(prevIndex, { immediate: prevIndex === totalSlides - 1 });
  }

  // ─── Active slide tracking via IntersectionObserver ───

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = items.indexOf(entry.target as HTMLElement);
          if (idx !== -1) {
            updateActiveState(idx);
          }
        }
      }
    },
    { root: grid, threshold: 0.5 },
  );

  for (const item of items) {
    observer.observe(item);
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

  // Respect reduced-motion changes
  prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches) {
      stopAutoplay();
    } else {
      resetAutoplay();
    }
  }, { signal });

  // ─── Init ───

  buildPagination();
  updateActiveState(0);

  // Start auto-play if preference is on
  if (galleryRoot.dataset.autoplay === 'true') {
    startAutoplay();
  }

  // ─── Cleanup ───

  signal.addEventListener('abort', () => {
    stopAutoplay();
    observer.disconnect();
    // Remove inert from all items on teardown
    for (const item of items) {
      item.removeAttribute('inert');
      item.removeAttribute('aria-hidden');
    }
  });

  return {
    cleanup() {
      stopAutoplay();
      observer.disconnect();
      for (const item of items) {
        item.removeAttribute('inert');
        item.removeAttribute('aria-hidden');
      }
    },
    syncPagination() {
      buildPagination();
      updateActiveState(activeIndex);
    },
  };
}
