import { DEFAULT_PDP_BUY_BOX_PRODUCT_ID, getPdpBuyBoxProduct } from './pdp-buy-box.data';
import { initPdpBuyBoxLightbox } from './pdp-buy-box.lightbox';
import { initPdpBuyBoxMedia, type PdpBuyBoxMediaHandle } from './pdp-buy-box.media';

const MAX_QUANTITY = 9;

interface PdpBuyBoxElements {
  title: HTMLElement;
  price: HTMLElement;
  headerStock: HTMLElement;
  variantStock: HTMLElement;
  bnplMessage: HTMLElement;
  shippingNote: HTMLElement;
  selectGroup: HTMLElement;
  selectLabel: HTMLElement;
  selectInput: HTMLSelectElement;
  chipGroup: HTMLElement;
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
  tabLabels: HTMLButtonElement[];
  infoSections: HTMLDetailsElement[];
}

export interface PdpBuyBoxHandle {
  cleanup(): void;
  setProduct(productId: string): void;
  getCurrentProductId(): string;
  handleViewportChange(): void;
  syncLayout(): void;
  syncStockLabel(): void;
  syncPrice(): void;
  syncInfoDisplay(): void;
}

function queryRequired<T extends Element>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required PDP buy box element: ${selector}`);
  return element;
}

function getElements(root: HTMLElement): PdpBuyBoxElements {
  const selectInput = queryRequired<HTMLSelectElement>(root, '.pdp-buy-box__select');
  const selectGroup = selectInput.closest<HTMLElement>('.pdp-buy-box__option-group');
  if (!selectGroup) throw new Error('Missing required PDP buy box select group');

  const chipRow = queryRequired<HTMLElement>(root, '[data-pdp-slot="chip-row"]');
  const chipGroup = chipRow.closest<HTMLElement>('.pdp-buy-box__option-group');
  if (!chipGroup) throw new Error('Missing required PDP buy box chip group');

  return {
    title: queryRequired(root, '[data-pdp-slot="title"]'),
    price: queryRequired(root, '[data-pdp-slot="price"]'),
    headerStock: queryRequired(root, '[data-pdp-slot="stock-header"]'),
    variantStock: queryRequired(root, '[data-pdp-slot="stock-variant"]'),
    bnplMessage: queryRequired(root, '[data-pdp-slot="bnpl-message"]'),
    shippingNote: queryRequired(root, '[data-pdp-slot="shipping-note"]'),
    selectGroup,
    selectLabel: queryRequired(root, '[data-pdp-slot="select-label"]'),
    selectInput,
    chipGroup,
    chipLabel: queryRequired(root, '[data-pdp-slot="chip-label"]'),
    chipRow,
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
    tabLabels: Array.from(root.querySelectorAll<HTMLButtonElement>('.pdp-buy-box__tab')),
    infoSections: Array.from(root.querySelectorAll<HTMLDetailsElement>('.pdp-buy-box__info')),
  };
}

export function initPdpBuyBox(root: HTMLElement): PdpBuyBoxHandle {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = getElements(root);

  function syncScrollViewportHeight(): void {
    const scrollParent = root.parentElement;
    if (scrollParent) {
      root.style.setProperty('--pdp-scroll-vh', `${scrollParent.clientHeight}px`);
    }
  }
  syncScrollViewportHeight();

  let media: PdpBuyBoxMediaHandle | null = null;

  const lightbox = initPdpBuyBoxLightbox(root, {
    getActiveIndex: () => media?.getActiveIndex() ?? 0,
    getImages: () => media?.getImages() ?? [],
    isEnabled: () => root.dataset.lightbox === 'true',
    onActiveIndexChange(index) {
      media?.setActiveIndex(index);
    },
  });

  media = initPdpBuyBoxMedia(root, {
    isLightboxEnabled: () => root.dataset.lightbox === 'true',
    onOpen(index, invoker) {
      lightbox.open(index, invoker);
    },
  });

  let currentProduct = getPdpBuyBoxProduct(root.dataset.productId);
  let selectedSelectValue = currentProduct.selectGroup.defaultValue;
  let selectedChipValue = currentProduct.chipGroup.defaultValue;
  let quantity = currentProduct.quantityDefault;

  function renderSelectOptions(): void {
    elements.selectInput.replaceChildren();
    elements.selectInput.value = '';

    if (currentProduct.selectGroup.options.length === 0) return;

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
    if (currentProduct.chipGroup.options.length === 0) return;

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

  function activateTab(index: number): void {
    for (const btn of elements.tabLabels) {
      btn.setAttribute('aria-selected', btn.dataset.tabIndex === String(index) ? 'true' : 'false');
    }
    for (const section of elements.infoSections) {
      if (section.dataset.infoIndex === String(index)) {
        section.dataset.tabActive = '';
        section.open = true;
      } else {
        delete section.dataset.tabActive;
      }
    }
  }

  function hasSelectOptions(): boolean {
    return currentProduct.selectGroup.options.length > 0;
  }

  function hasChipOptions(): boolean {
    return currentProduct.chipGroup.options.length > 0;
  }

  function hasVariantOptions(): boolean {
    return hasSelectOptions() || hasChipOptions();
  }

  function getSelectedChipOption(): { label: string; price: string; soldOut?: boolean | string[] } | null {
    if (!selectedChipValue) return null;
    return currentProduct.chipGroup.options.find((option) => option.label === selectedChipValue) ?? null;
  }

  function hasResolvedVariantSelection(): boolean {
    if (!hasVariantOptions()) return false;
    if (hasSelectOptions() && !selectedSelectValue) return false;
    if (hasChipOptions() && !selectedChipValue) return false;
    if (hasSelectOptions() && isSelectedVariantSoldOut()) return false;

    const selectedChipOption = getSelectedChipOption();
    if (hasChipOptions() && (!selectedChipOption || isChipSoldOut(selectedChipOption))) {
      return false;
    }

    return true;
  }

  function getSelectedVariantStockKey(): string | null {
    const parts: string[] = [];

    if (hasSelectOptions()) {
      if (!selectedSelectValue) return null;
      parts.push(`select:${selectedSelectValue}`);
    }

    if (hasChipOptions()) {
      if (!selectedChipValue) return null;
      parts.push(`chip:${selectedChipValue}`);
    }

    return parts.length > 0 ? parts.join('|') : null;
  }

  function resolveActiveStockCount(): number | null {
    if (!hasVariantOptions()) {
      return currentProduct.stockCount ?? null;
    }

    if (!hasResolvedVariantSelection()) {
      return null;
    }

    const variantKey = getSelectedVariantStockKey();
    if (!variantKey) return null;
    return currentProduct.variantStockCounts?.[variantKey] ?? null;
  }

  function formatStockText(style: string, stockCount: number | null): string {
    if (style === 'count') {
      return stockCount == null ? '' : `${stockCount} left in stock`;
    }

    if (style === 'limited') {
      if (stockCount != null) {
        return stockCount <= 3 ? 'Low stock' : 'In stock';
      }
      return currentProduct.stockLabel;
    }

    return '';
  }

  function setStockContent(element: HTMLElement, text: string): void {
    element.textContent = text;
    element.hidden = text.length === 0;
  }

  function syncStockLabel(): void {
    const style = root.dataset.stockStyle ?? 'off';
    if (style === 'off') {
      setStockContent(elements.headerStock, '');
      setStockContent(elements.variantStock, '');
      return;
    }

    const stockCount = resolveActiveStockCount();
    if (!hasVariantOptions()) {
      setStockContent(elements.headerStock, formatStockText(style, stockCount));
      setStockContent(elements.variantStock, '');
      return;
    }

    setStockContent(elements.headerStock, '');
    setStockContent(elements.variantStock, hasResolvedVariantSelection() ? formatStockText(style, stockCount) : '');
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
    if (currentProduct.chipGroup.options.length === 0) {
      elements.price.textContent = formatCents(parsePriceCents(currentProduct.price));
      return;
    }

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
    lightbox.close({ animate: false, restoreFocus: false });
    media?.setImages(currentProduct.images);
    root.dataset.productId = currentProduct.id || DEFAULT_PDP_BUY_BOX_PRODUCT_ID;

    elements.selectGroup.hidden = currentProduct.selectGroup.options.length === 0;
    elements.selectInput.disabled = currentProduct.selectGroup.options.length === 0;
    elements.chipGroup.hidden = currentProduct.chipGroup.options.length === 0;

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

    const tabLabel0 = elements.tabLabels[0];
    const tabLabel1 = elements.tabLabels[1];
    if (tabLabel0) tabLabel0.textContent = currentProduct.description.title;
    if (tabLabel1) tabLabel1.textContent = currentProduct.shipping.title;

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
    const selectedChipOption = getSelectedChipOption();
    if (selectedChipOption && isChipSoldOut(selectedChipOption)) {
      selectedChipValue = null;
    }
    renderChipOptions();
    syncPrice();
    syncStockLabel();
  }, { signal });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const tabButton = target.closest<HTMLButtonElement>('.pdp-buy-box__tab');
    if (tabButton && tabButton.dataset.tabIndex !== undefined) {
      activateTab(Number(tabButton.dataset.tabIndex));
      return;
    }

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
    syncStockLabel();
  }, { signal });

  elements.quantityValue.addEventListener('change', () => {
    const parsed = Number.parseInt(elements.quantityValue.value, 10);
    quantity = Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_QUANTITY, parsed)) : 1;
    renderQuantity();
  }, { signal });

  elements.quantityValue.addEventListener('blur', () => {
    renderQuantity();
  }, { signal });

  const tabBar = root.querySelector<HTMLElement>('.pdp-buy-box__tab-bar');
  if (tabBar) {
    tabBar.addEventListener('keydown', (event) => {
      const tabs = elements.tabLabels;
      const current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      let next: number | undefined;

      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;

      if (next !== undefined) {
        event.preventDefault();
        activateTab(next);
        tabs[next]?.focus();
      }
    }, { signal });
  }

  function syncInfoDisplay(): void {
    if (root.dataset.infoDisplay === 'tabs') {
      activateTab(0);
    } else {
      for (const section of elements.infoSections) {
        delete section.dataset.tabActive;
      }
    }
  }

  setProduct(root.dataset.productId ?? DEFAULT_PDP_BUY_BOX_PRODUCT_ID);
  syncInfoDisplay();

  return {
    cleanup() {
      media?.cleanup();
      lightbox.cleanup();
      abortController.abort();
    },
    setProduct,
    getCurrentProductId() {
      return currentProduct.id;
    },
    handleViewportChange() {
      syncScrollViewportHeight();
      lightbox.handleViewportChange();
      media?.refresh();
    },
    syncLayout() {
      if (lightbox.isOpen()) {
        lightbox.close({ animate: false, restoreFocus: false });
      }
      media?.refresh();
    },
    syncStockLabel,
    syncPrice,
    syncInfoDisplay,
  };
}
