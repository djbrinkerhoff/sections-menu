import { DEFAULT_PDP_BUY_BOX_PRODUCT_ID, getPdpBuyBoxProduct } from './pdp-buy-box.data';
import type { PdpBuyBoxImage } from './pdp-buy-box.data';
import { initSlideshow, type SlideshowHandle } from './gallery.slideshow';
import { initImageLightbox } from './image.lightbox';

const MAX_QUANTITY = 9;

interface PdpBuyBoxElements {
  galleryGrid: HTMLElement;
  mediaEl: HTMLElement;
  title: HTMLElement;
  price: HTMLElement;
  stock: HTMLElement;
  bnplMessage: HTMLElement;
  shippingNote: HTMLElement;
  selectLabel: HTMLElement;
  selectInput: HTMLSelectElement;
  chipLabel: HTMLElement;
  chipRow: HTMLElement;
  quantityValue: HTMLInputElement;
  ctaLabel: HTMLElement;
  descriptionTitle: HTMLElement;
  descriptionBody: HTMLElement;
  descriptionBullets: HTMLUListElement;
  shippingTitle: HTMLElement;
  shippingLead: HTMLElement;
  shippingBody: HTMLElement;
  returnsLead: HTMLElement;
  returnsBody: HTMLElement;
}

export interface PdpBuyBoxHandle {
  cleanup(): void;
  setProduct(productId: string): void;
  getCurrentProductId(): string;
  syncLayout(): void;
  syncStockLabel(): void;
  syncPrice(): void;
}

function queryRequired<T extends Element>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required PDP buy box element: ${selector}`);
  return element;
}

function getElements(root: HTMLElement): PdpBuyBoxElements {
  return {
    galleryGrid: queryRequired(root, '[data-pdp-slot="gallery-grid"]'),
    mediaEl: queryRequired(root, '.pdp-buy-box__media'),
    title: queryRequired(root, '[data-pdp-slot="title"]'),
    price: queryRequired(root, '[data-pdp-slot="price"]'),
    stock: queryRequired(root, '[data-pdp-slot="stock"]'),
    bnplMessage: queryRequired(root, '[data-pdp-slot="bnpl-message"]'),
    shippingNote: queryRequired(root, '[data-pdp-slot="shipping-note"]'),
    selectLabel: queryRequired(root, '[data-pdp-slot="select-label"]'),
    selectInput: queryRequired(root, '.pdp-buy-box__select'),
    chipLabel: queryRequired(root, '[data-pdp-slot="chip-label"]'),
    chipRow: queryRequired(root, '[data-pdp-slot="chip-row"]'),
    quantityValue: queryRequired(root, '[data-pdp-slot="quantity-value"]'),
    ctaLabel: queryRequired(root, '[data-pdp-slot="cta-label"]'),
    descriptionTitle: queryRequired(root, '[data-pdp-slot="description-title"]'),
    descriptionBody: queryRequired(root, '[data-pdp-slot="description-body"]'),
    descriptionBullets: queryRequired(root, '[data-pdp-slot="description-bullets"]'),
    shippingTitle: queryRequired(root, '[data-pdp-slot="shipping-title"]'),
    shippingLead: queryRequired(root, '[data-pdp-slot="shipping-lead"]'),
    shippingBody: queryRequired(root, '[data-pdp-slot="shipping-body"]'),
    returnsLead: queryRequired(root, '[data-pdp-slot="returns-lead"]'),
    returnsBody: queryRequired(root, '[data-pdp-slot="returns-body"]'),
  };
}

function buildGalleryItems(grid: HTMLElement, images: PdpBuyBoxImage[]): void {
  grid.innerHTML = '';
  for (const img of images) {
    const figure = document.createElement('figure');
    figure.className = 'gallery__item';

    const trigger = document.createElement('button');
    trigger.className = 'gallery__trigger image-lightbox__trigger';
    trigger.type = 'button';
    trigger.dataset.zoomTarget = 'true';
    trigger.dataset.zoomGroup = 'pdp';

    const image = document.createElement('img');
    image.className = 'gallery__image';
    image.src = img.src;
    image.alt = img.alt;
    image.width = img.width;
    image.height = img.height;
    image.loading = 'lazy';

    trigger.appendChild(image);
    figure.appendChild(trigger);
    grid.appendChild(figure);
  }
}

export function initPdpBuyBox(root: HTMLElement): PdpBuyBoxHandle {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = getElements(root);

  let slideshowHandle: SlideshowHandle | null = null;

  const lightbox = initImageLightbox(elements.mediaEl, {
    isEnabled: () => root.dataset.lightbox === 'true',
    onIndexChange(session) {
      slideshowHandle?.goToIndex(session.activeIndex, { immediate: true, resetAutoplay: false });
    },
    onOpen() { slideshowHandle?.pauseAutoplay(); },
    onClose(session) {
      slideshowHandle?.goToIndex(session.activeIndex, { immediate: true, resetAutoplay: false });
      slideshowHandle?.resumeAutoplay();
    },
  });

  function initGallery(): void {
    slideshowHandle?.cleanup();
    buildGalleryItems(elements.galleryGrid, currentProduct.images);
    slideshowHandle = initSlideshow(elements.mediaEl, signal);
  }

  let currentProduct = getPdpBuyBoxProduct(root.dataset.productId);
  let selectedSelectValue = currentProduct.selectGroup.defaultValue;
  let selectedChipValue = currentProduct.chipGroup.defaultValue;
  let quantity = currentProduct.quantityDefault;

  function renderSelectOptions(): void {
    elements.selectInput.replaceChildren();

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = currentProduct.selectGroup.placeholder;
    elements.selectInput.appendChild(placeholderOption);

    for (const option of currentProduct.selectGroup.options) {
      const optionElement = document.createElement('option');
      optionElement.value = option.label;
      optionElement.textContent = option.soldOut ? `${option.label} (Sold out)` : option.label;
      elements.selectInput.appendChild(optionElement);
    }

    elements.selectInput.value = selectedSelectValue;
  }

  function isSelectedVariantSoldOut(): boolean {
    if (!selectedSelectValue) return false;
    const match = currentProduct.selectGroup.options.find((o) => o.label === selectedSelectValue);
    return match?.soldOut === true;
  }

  function isChipSoldOut(option: { soldOut?: boolean | string[] }): boolean {
    if (option.soldOut === true) return true;
    if (Array.isArray(option.soldOut)) {
      return !!selectedSelectValue && option.soldOut.includes(selectedSelectValue);
    }
    return false;
  }

  function renderChipOptions(): void {
    elements.chipRow.replaceChildren();
    const variantSoldOut = isSelectedVariantSoldOut();

    for (const option of currentProduct.chipGroup.options) {
      const button = document.createElement('button');
      button.className = 'pdp-buy-box__chip';
      button.type = 'button';
      button.dataset.chipValue = option.label;
      button.textContent = option.label;
      const isSoldOut = isChipSoldOut(option) || variantSoldOut;
      if (isSoldOut) {
        button.dataset.soldOut = 'true';
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      const isSelected = !isSoldOut && selectedChipValue === option.label;
      button.dataset.selected = isSelected ? 'true' : 'false';
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      elements.chipRow.appendChild(button);
    }
  }

  function renderDescriptionBullets(): void {
    elements.descriptionBullets.replaceChildren();

    for (const bullet of currentProduct.description.bullets ?? []) {
      const item = document.createElement('li');
      item.textContent = bullet;
      elements.descriptionBullets.appendChild(item);
    }
  }

  function syncStockLabel(): void {
    const style = root.dataset.stockStyle ?? 'in-stock';
    switch (style) {
      case 'off':
        elements.stock.textContent = '';
        break;
      case 'in-stock':
        elements.stock.textContent = 'In stock';
        break;
      case 'limited':
        elements.stock.textContent = 'Limited quantities available';
        break;
      case 'count':
        elements.stock.textContent = `${3 + (currentProduct.id.length % 5)} left in stock`;
        break;
    }
  }

  function parsePriceCents(price: string): number {
    return Math.round(Number.parseFloat(price.replace(/[^0-9.]/g, '')) * 100);
  }

  function formatCents(cents: number): string {
    const notation = root.dataset.currencyNotation ?? 'sign';
    const fmt = root.dataset.priceFormat ?? 'decimal';
    const raw = cents / 100;
    const number = fmt === 'whole' ? String(Math.round(raw)) : raw.toFixed(2);
    if (notation === 'code') return `${number} USD`;
    if (notation === 'none') return number;
    return `$${number}`;
  }

  function syncPrice(): void {
    const chipPrices = currentProduct.chipGroup.options.map((o) => parsePriceCents(o.price));

    // If a chip is selected, show its exact price
    if (selectedChipValue) {
      const match = currentProduct.chipGroup.options.find((o) => o.label === selectedChipValue);
      if (match) {
        elements.price.textContent = formatCents(parsePriceCents(match.price));
        return;
      }
    }

    // No chip selected — use display mode
    const mode = root.dataset.priceDisplay ?? 'lowest';
    const min = Math.min(...chipPrices);
    const max = Math.max(...chipPrices);

    if (min === max || mode === 'lowest') {
      elements.price.textContent = formatCents(min);
    } else if (mode === 'highest') {
      elements.price.textContent = formatCents(max);
    } else {
      elements.price.textContent = `${formatCents(min)}–${formatCents(max)}`;
    }
  }

  function renderQuantity(): void {
    elements.quantityValue.value = String(quantity);
  }

  function renderProduct(): void {
    initGallery();
    root.dataset.productId = currentProduct.id || DEFAULT_PDP_BUY_BOX_PRODUCT_ID;

    elements.title.textContent = currentProduct.title;
    syncPrice();
    syncStockLabel();
    elements.bnplMessage.textContent = currentProduct.bnplMessage;
    elements.shippingNote.textContent = currentProduct.shippingNote;
    elements.selectLabel.textContent = currentProduct.selectGroup.label;
    elements.chipLabel.textContent = currentProduct.chipGroup.label;
    elements.ctaLabel.textContent = currentProduct.ctaLabel;
    elements.descriptionTitle.textContent = currentProduct.description.title;
    elements.descriptionBody.textContent = currentProduct.description.body;
    elements.shippingTitle.textContent = currentProduct.shipping.title;
    elements.shippingLead.textContent = currentProduct.shipping.lead ?? '';
    elements.shippingBody.textContent = currentProduct.shipping.body;
    elements.returnsLead.textContent = currentProduct.returns.title;
    elements.returnsBody.textContent = currentProduct.returns.body;

    renderSelectOptions();
    renderChipOptions();
    renderDescriptionBullets();
    renderQuantity();
  }

  function resetPreviewState(): void {
    selectedSelectValue = currentProduct.selectGroup.defaultValue;
    selectedChipValue = currentProduct.chipGroup.defaultValue;
    quantity = currentProduct.quantityDefault;
  }

  function setProduct(productId: string): void {
    currentProduct = getPdpBuyBoxProduct(productId);
    resetPreviewState();
    renderProduct();
  }

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target !== elements.selectInput) return;
    selectedSelectValue = target.value;
    renderChipOptions();
    syncPrice();
  }, { signal });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const quantityAction = target.closest<HTMLElement>('[data-quantity-action]')?.dataset.quantityAction;
    if (quantityAction === 'increment') {
      quantity = Math.min(MAX_QUANTITY, quantity + 1);
      renderQuantity();
      return;
    }

    if (quantityAction === 'decrement') {
      quantity = Math.max(1, quantity - 1);
      renderQuantity();
      return;
    }

    const chipButton = target.closest<HTMLButtonElement>('[data-chip-value]');
    if (!chipButton) return;
    const nextValue = chipButton.dataset.chipValue;
    if (!nextValue) return;
    selectedChipValue = selectedChipValue === nextValue ? null : nextValue;
    renderChipOptions();
    syncPrice();
  }, { signal });

  elements.quantityValue.addEventListener('change', () => {
    const parsed = Number.parseInt(elements.quantityValue.value, 10);
    quantity = Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_QUANTITY, parsed)) : 1;
    renderQuantity();
  }, { signal });

  elements.quantityValue.addEventListener('blur', () => {
    renderQuantity();
  }, { signal });

  setProduct(root.dataset.productId ?? DEFAULT_PDP_BUY_BOX_PRODUCT_ID);

  return {
    cleanup() {
      slideshowHandle?.cleanup();
      lightbox.cleanup();
      abortController.abort();
    },
    setProduct,
    getCurrentProductId() {
      return currentProduct.id;
    },
    syncLayout() {
      slideshowHandle?.syncLayout();
    },
    syncStockLabel,
    syncPrice,
  };
}
