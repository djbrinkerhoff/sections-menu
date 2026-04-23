import { PDP_BUY_BOX_PRODUCTS } from './pdp-buy-box.data';
import { createSegmentedGroup } from './control-builders';
import { createLabeledRangeGroup } from './range-control';
import { applyImageRadius, getImageRadiusIndex, IMAGE_RADIUS_STOPS } from './image-radius';
import type { PdpBuyBoxHandle } from './pdp-buy-box';

export interface PdpBuyBoxControlsHandle {
  cleanup(): void;
}

export function initPdpBuyBoxControls(
  root: HTMLElement,
  container: HTMLElement,
  preview: PdpBuyBoxHandle,
  onStateChange: () => void = () => {},
): PdpBuyBoxControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';
  applyImageRadius(root, root.dataset.radius);

  // ─── Layout picker ───

  wrapper.appendChild(createSegmentedGroup({
    name: 'pdpLayout',
    label: 'Layout',
    values: ['carousel', 'column', 'split'],
    labels: { carousel: 'Carousel', column: 'Column', split: 'Split' },
    initialValue: root.dataset.pdpLayout ?? 'column',
    onChange: (v) => {
      root.dataset.pdpLayout = v;
      preview.syncLayout();
      onStateChange();
    },
    signal,
  }));

  // ─── Product picker ───

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
    preview.setProduct(select.value);
    onStateChange();
  }, { signal });

  group.appendChild(description);
  group.appendChild(select);
  wrapper.appendChild(group);

  // ─── Toggle helpers ───

  function addToggle(name: string, label: string, dataAttr: string, onPreviewChange: (() => void) | null = null): void {
    wrapper.appendChild(createSegmentedGroup({
      name,
      label,
      values: ['false', 'true'],
      labels: { false: 'Off', true: 'On' },
      initialValue: root.dataset[dataAttr] ?? 'true',
      onChange: (v) => {
        root.dataset[dataAttr] = v;
        onPreviewChange?.();
        onStateChange();
      },
      signal,
    }));
  }

  wrapper.appendChild(createSegmentedGroup({
    name: 'stockStyle',
    label: 'Stock label',
    values: ['off', 'limited', 'count'],
    labels: { off: 'Off', limited: 'Low', count: 'X left' },
    initialValue: root.dataset.stockStyle ?? 'off',
    onChange: (v) => {
      root.dataset.stockStyle = v;
      preview.syncStockLabel();
      onStateChange();
    },
    signal,
  }));
  wrapper.appendChild(createSegmentedGroup({
    name: 'priceDisplay',
    label: 'Price display',
    values: ['lowest', 'highest', 'range'],
    labels: { lowest: 'Lowest', highest: 'Highest', range: 'Range' },
    initialValue: root.dataset.priceDisplay ?? 'lowest',
    onChange: (v) => {
      root.dataset.priceDisplay = v;
      preview.syncPrice();
      onStateChange();
    },
    signal,
  }));
  wrapper.appendChild(createSegmentedGroup({
    name: 'currencyNotation',
    label: 'Currency notation',
    values: ['sign', 'code', 'none'],
    labels: { sign: '$', code: 'USD', none: 'None' },
    initialValue: root.dataset.currencyNotation ?? 'sign',
    onChange: (v) => {
      root.dataset.currencyNotation = v;
      preview.syncPrice();
      onStateChange();
    },
    signal,
  }));
  wrapper.appendChild(createSegmentedGroup({
    name: 'priceFormat',
    label: 'Price format',
    values: ['decimal', 'whole'],
    labels: { decimal: '100.00', whole: '100' },
    initialValue: root.dataset.priceFormat ?? 'decimal',
    onChange: (v) => {
      root.dataset.priceFormat = v;
      preview.syncPrice();
      onStateChange();
    },
    signal,
  }));
  addToggle('showBnpl', 'Buy now, pay later', 'showBnpl');

  // ─── Gallery controls ───

  wrapper.appendChild(createSegmentedGroup({
    name: 'aspect',
    label: 'Aspect ratio',
    values: ['square', 'landscape', 'portrait', 'auto'],
    labels: { square: 'Square', landscape: 'Landscape', portrait: 'Portrait', auto: 'Auto' },
    initialValue: root.dataset.aspect ?? 'square',
    onChange: (v) => {
      root.dataset.aspect = v;
      preview.syncLayout();
      onStateChange();
    },
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'fit',
    label: 'Fill',
    values: ['cover', 'contain'],
    labels: { cover: 'Cover', contain: 'Contain' },
    initialValue: root.dataset.fit ?? 'cover',
    onChange: (v) => {
      root.dataset.fit = v;
      preview.syncLayout();
      onStateChange();
    },
    signal,
  }));

  wrapper.appendChild(createLabeledRangeGroup({
    name: 'radius',
    label: 'Border radius',
    steps: IMAGE_RADIUS_STOPS.map((s) => s.label),
    initialIndex: getImageRadiusIndex(root.dataset.radius),
    onInput: (index) => {
      const stop = IMAGE_RADIUS_STOPS[index];
      if (!stop) return;
      applyImageRadius(root, stop.value);
      preview.syncLayout();
      onStateChange();
    },
    signal,
  }));

  addToggle('lightbox', 'Lightbox', 'lightbox');

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
