import type { PdpBuyBoxImage } from './pdp-buy-box.data';

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

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}

export function initPdpBuyBoxMedia(
  root: HTMLElement,
  options: PdpBuyBoxMediaOptions,
): PdpBuyBoxMediaHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const heroButton = queryRequired<HTMLButtonElement>(root, '[data-pdp-slot="media-hero"]');
  const heroImage = queryRequired<HTMLImageElement>(root, '[data-pdp-slot="media-hero-image"]');
  const strip = queryRequired<HTMLElement>(root, '[data-pdp-slot="media-strip"]');

  let images: readonly PdpBuyBoxImage[] = [];
  let activeIndex = 0;

  function syncHero(): void {
    const activeImage = images[activeIndex];
    if (!activeImage) {
      heroImage.removeAttribute('src');
      heroImage.removeAttribute('alt');
      heroImage.removeAttribute('width');
      heroImage.removeAttribute('height');
      heroButton.removeAttribute('aria-label');
      heroButton.removeAttribute('aria-haspopup');
      heroButton.removeAttribute('aria-expanded');
      return;
    }

    heroImage.src = activeImage.src;
    heroImage.alt = activeImage.alt;
    heroImage.width = activeImage.width;
    heroImage.height = activeImage.height;
    heroImage.loading = 'eager';

    if (options.isLightboxEnabled()) {
      heroButton.setAttribute('aria-label', `Open image ${activeIndex + 1} of ${images.length}`);
      heroButton.setAttribute('aria-haspopup', 'dialog');
      heroButton.setAttribute('aria-expanded', 'false');
    } else {
      heroButton.setAttribute('aria-label', `Selected image ${activeIndex + 1} of ${images.length}`);
      heroButton.removeAttribute('aria-haspopup');
      heroButton.removeAttribute('aria-expanded');
    }
  }

  function syncThumbs(): void {
    const thumbButtons = strip.querySelectorAll<HTMLButtonElement>('.pdp-buy-box__media-thumb');
    thumbButtons.forEach((button, index) => {
      const selected = index === activeIndex;
      button.dataset.selected = selected ? 'true' : 'false';
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('aria-current', selected ? 'true' : 'false');
      if (selected) {
        button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }

  function syncSelection(): void {
    syncHero();
    syncThumbs();
  }

  function renderStrip(): void {
    strip.replaceChildren();

    for (const [index, image] of images.entries()) {
      const button = document.createElement('button');
      button.className = 'pdp-buy-box__media-thumb';
      button.type = 'button';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Show image ${index + 1} of ${images.length}`);

      const thumb = document.createElement('img');
      thumb.className = 'pdp-buy-box__media-thumb-image';
      thumb.src = image.src;
      thumb.alt = image.alt;
      thumb.width = image.width;
      thumb.height = image.height;
      thumb.loading = 'lazy';

      button.appendChild(thumb);
      strip.appendChild(button);
    }

    syncThumbs();
  }

  function setActiveIndex(index: number): void {
    if (images.length === 0) return;
    activeIndex = clampIndex(index, images.length);
    syncSelection();
  }

  function setImages(nextImages: readonly PdpBuyBoxImage[]): void {
    images = nextImages.slice();
    activeIndex = 0;
    renderStrip();
    syncSelection();
  }

  heroButton.addEventListener('click', () => {
    if (!options.isLightboxEnabled() || images.length === 0) return;
    options.onOpen(activeIndex, heroButton);
  }, { signal });

  strip.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>('.pdp-buy-box__media-thumb');
    if (!button) return;

    const index = Number.parseInt(button.dataset.index ?? '', 10);
    if (!Number.isFinite(index)) return;

    setActiveIndex(index);
  }, { signal });

  return {
    cleanup() {
      abortController.abort();
    },
    getActiveIndex() {
      return activeIndex;
    },
    getImages() {
      return images;
    },
    refresh() {
      syncSelection();
    },
    setActiveIndex,
    setImages,
  };
}
