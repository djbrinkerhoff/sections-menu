import { PDP_BUY_BOX_PRODUCTS } from './pdp-buy-box.data';

export interface PdpBuyBoxControlsHandle {
  cleanup(): void;
}

export function initPdpBuyBoxControls(
  root: HTMLElement,
  container: HTMLElement,
  setProduct: (productId: string) => void,
  onStateChange: () => void = () => {},
): PdpBuyBoxControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  const group = document.createElement('fieldset');
  group.className = 'control-group';
  group.innerHTML = '<legend class="control-group__label">Product</legend>';

  const description = document.createElement('p');
  description.className = 'control-group__desc';
  description.textContent = 'Swaps the seeded product copy and generated art. In-preview options reset when the product changes.';

  const select = document.createElement('select');
  select.className = 'control-group__input';
  select.name = 'productId';
  select.ariaLabel = 'Select product';

  for (const product of PDP_BUY_BOX_PRODUCTS) {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = product.label;
    select.appendChild(option);
  }

  select.value = root.dataset.productId ?? PDP_BUY_BOX_PRODUCTS[0]?.id ?? '';
  select.addEventListener('change', () => {
    setProduct(select.value);
    onStateChange();
  }, { signal });

  group.appendChild(description);
  group.appendChild(select);
  wrapper.appendChild(group);
  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
