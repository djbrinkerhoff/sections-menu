import { DEFAULT_PDP_BUY_BOX_PRODUCT_ID, getPdpBuyBoxProduct } from './pdp-buy-box.data';

const MAX_QUANTITY = 9;

interface PdpBuyBoxElements {
  heroImage: HTMLImageElement;
  title: HTMLElement;
  price: HTMLElement;
  stock: HTMLElement;
  bnplMessage: HTMLElement;
  shippingNote: HTMLElement;
  selectLabel: HTMLElement;
  selectInput: HTMLSelectElement;
  chipLabel: HTMLElement;
  chipRow: HTMLElement;
  quantityValue: HTMLElement;
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
}

function queryRequired<T extends Element>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required PDP buy box element: ${selector}`);
  return element;
}

function getElements(root: HTMLElement): PdpBuyBoxElements {
  return {
    heroImage: queryRequired(root, '[data-pdp-slot="hero-image"]'),
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

export function initPdpBuyBox(root: HTMLElement): PdpBuyBoxHandle {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = getElements(root);

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
      optionElement.value = option;
      optionElement.textContent = option;
      elements.selectInput.appendChild(optionElement);
    }

    elements.selectInput.value = selectedSelectValue;
  }

  function renderChipOptions(): void {
    elements.chipRow.replaceChildren();

    for (const option of currentProduct.chipGroup.options) {
      const button = document.createElement('button');
      button.className = 'pdp-buy-box__chip';
      button.type = 'button';
      button.dataset.chipValue = option;
      button.textContent = option;
      const isSelected = selectedChipValue === option;
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

  function renderQuantity(): void {
    elements.quantityValue.textContent = String(quantity);
  }

  function renderProduct(): void {
    const heroImage = currentProduct.images[0];
    if (heroImage) {
      elements.heroImage.src = heroImage.src;
      elements.heroImage.alt = heroImage.alt;
      elements.heroImage.width = heroImage.width;
      elements.heroImage.height = heroImage.height;
    }

    root.dataset.productId = currentProduct.id || DEFAULT_PDP_BUY_BOX_PRODUCT_ID;

    elements.title.textContent = currentProduct.title;
    elements.price.textContent = currentProduct.price;
    elements.stock.textContent = currentProduct.stockLabel;
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
  }, { signal });

  setProduct(root.dataset.productId ?? DEFAULT_PDP_BUY_BOX_PRODUCT_ID);

  return {
    cleanup() {
      abortController.abort();
    },
    setProduct,
    getCurrentProductId() {
      return currentProduct.id;
    },
  };
}
