import { initSlideshow, type SlideshowHandle } from './gallery.slideshow';
import type { PdpBuyBoxImage } from './pdp-buy-box.data';
import { clampIndex } from './lightbox.shared';

export interface PdpBuyBoxMediaHandle {
  cleanup(): void;
  getActiveIndex(): number;
  getImages(): readonly PdpBuyBoxImage[];
  refresh(): void;
  setActiveIndex(index: number): void;
  setImages(images: readonly PdpBuyBoxImage[]): void;
}

interface PdpBuyBoxMediaOptions {
  isLightboxEnabled(): boolean;
  onOpen(index: number, invoker: HTMLElement): void;
}

function queryRequired<T extends Element>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required PDP buy box media element: ${selector}`);
  return element;
}

export function initPdpBuyBoxMedia(
  root: HTMLElement,
  options: PdpBuyBoxMediaOptions,
): PdpBuyBoxMediaHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const mediaRoot = queryRequired<HTMLElement>(root, '.pdp-buy-box__media');
  const grid = queryRequired<HTMLElement>(mediaRoot, '[data-pdp-slot="media-grid"]');

  let images: readonly PdpBuyBoxImage[] = [];
  let slideshowHandle: SlideshowHandle | null = null;
  let currentMode: 'slideshow' | 'static' = 'slideshow';

  function isCarouselLayout(): boolean {
    if (root.dataset.pdpLayout === 'carousel' || !root.dataset.pdpLayout) return true;
    // Mobile: always use slideshow regardless of layout setting
    return root.offsetWidth < 736;
  }

  function cleanupSlideshow(): void {
    slideshowHandle?.cleanup();
    slideshowHandle = null;
  }

  function getTriggerSelector(index: number): string {
    return `.gallery__item:not([data-gallery-clone]) .gallery__trigger[data-index="${index}"]`;
  }

  function syncTriggerAttributes(): void {
    const triggers = grid.querySelectorAll<HTMLButtonElement>('.gallery__trigger');
    const lightboxEnabled = options.isLightboxEnabled();

    triggers.forEach((button, index) => {
      const imageIndex = Number.parseInt(button.dataset.index ?? String(index), 10);
      const displayIndex = Number.isFinite(imageIndex) ? imageIndex : index;
      if (lightboxEnabled) {
        button.setAttribute('aria-label', `Open image ${displayIndex + 1} of ${images.length}`);
        button.setAttribute('aria-haspopup', 'dialog');
        if (button.getAttribute('aria-expanded') !== 'true') {
          button.setAttribute('aria-expanded', 'false');
        }
      } else {
        button.setAttribute('aria-label', `Image ${displayIndex + 1} of ${images.length}`);
        button.removeAttribute('aria-haspopup');
        button.removeAttribute('aria-expanded');
      }
    });
  }

  function buildSlides(): void {
    grid.replaceChildren();

    for (const [index, image] of images.entries()) {
      const figure = document.createElement('figure');
      figure.className = 'gallery__item';

      const trigger = document.createElement('button');
      trigger.className = 'gallery__trigger';
      trigger.type = 'button';
      trigger.dataset.index = String(index);

      const slideImage = document.createElement('img');
      slideImage.className = 'gallery__image';
      slideImage.src = image.src;
      slideImage.alt = image.alt;
      slideImage.width = image.width;
      slideImage.height = image.height;
      slideImage.loading = index === 0 ? 'eager' : 'lazy';

      trigger.appendChild(slideImage);
      figure.appendChild(trigger);
      grid.appendChild(figure);
    }
  }

  const prevBtn = mediaRoot.querySelector<HTMLElement>('.gallery__prev');
  const nextBtn = mediaRoot.querySelector<HTMLElement>('.gallery__next');
  const paginationEl = mediaRoot.querySelector<HTMLElement>('.gallery__pagination');

  function setSlideshowChromeHidden(hidden: boolean): void {
    if (prevBtn) prevBtn.hidden = hidden;
    if (nextBtn) nextBtn.hidden = hidden;
    if (paginationEl) paginationEl.hidden = hidden;
  }

  function enterSlideshowMode(activeIndex = 0): void {
    cleanupSlideshow();
    mediaRoot.dataset.layout = 'slideshow';
    setSlideshowChromeHidden(false);
    buildSlides();
    slideshowHandle = initSlideshow(mediaRoot, signal);
    slideshowHandle.goToIndex(clampIndex(activeIndex, images.length), {
      immediate: true,
      resetAutoplay: false,
    });
    currentMode = 'slideshow';
    syncTriggerAttributes();
  }

  function enterStaticMode(): void {
    cleanupSlideshow();
    delete mediaRoot.dataset.layout;
    setSlideshowChromeHidden(true);
    buildSlides();
    currentMode = 'static';
    syncTriggerAttributes();
  }

  function initOrReinitSlideshow(activeIndex = 0): void {
    if (isCarouselLayout()) {
      enterSlideshowMode(activeIndex);
    } else {
      enterStaticMode();
    }
  }

  function resolveInvoker(button: HTMLButtonElement, index: number): HTMLElement {
    const isCloneTrigger = button.closest<HTMLElement>('[data-gallery-clone]') !== null;
    if (!isCloneTrigger) return button;

    return grid.querySelector<HTMLElement>(getTriggerSelector(index)) ?? button;
  }

  function getActiveIndex(): number {
    return clampIndex(slideshowHandle?.activeIndex ?? 0, images.length);
  }

  function setActiveIndex(index: number): void {
    if (!slideshowHandle || images.length === 0) return;
    slideshowHandle.goToIndex(clampIndex(index, images.length), {
      immediate: true,
      resetAutoplay: false,
    });
  }

  function setImages(nextImages: readonly PdpBuyBoxImage[]): void {
    images = nextImages.slice();
    initOrReinitSlideshow(0);
  }

  grid.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>('.gallery__trigger');
    if (!button || !options.isLightboxEnabled()) return;

    const index = Number.parseInt(button.dataset.index ?? '', 10);
    if (!Number.isFinite(index)) return;

    options.onOpen(index, resolveInvoker(button, index));
  }, { signal });

  return {
    cleanup() {
      cleanupSlideshow();
      abortController.abort();
    },
    getActiveIndex,
    getImages() {
      return images;
    },
    refresh() {
      const wantSlideshow = isCarouselLayout();
      if (wantSlideshow && currentMode !== 'slideshow') {
        enterSlideshowMode(0);
      } else if (!wantSlideshow && currentMode !== 'static') {
        enterStaticMode();
      } else if (slideshowHandle) {
        slideshowHandle.syncLayout();
      }
      syncTriggerAttributes();
    },
    setActiveIndex,
    setImages,
  };
}
