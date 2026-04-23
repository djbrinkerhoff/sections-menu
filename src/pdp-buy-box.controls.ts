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

  // ─── Layout picker (thumbnail grid) ───

  function createLayoutGroup(): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group control-group--style';
    fieldset.dataset.control = 'pdpLayout';
    fieldset.innerHTML = `<legend class="control-group__label">Layout</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options control-group__options--layout';

    const layouts = ['carousel', 'column', 'split'] as const;
    const previews: Record<string, string> = {
      carousel: `<svg viewBox="0 0 56 36" fill="none"><rect x="2" y="2" width="30" height="32" rx="1.5" fill="currentColor" opacity=".2"/><path d="M5 18l3-2.5v5z" fill="currentColor" opacity=".3"/><path d="M29 18l-3-2.5v5z" fill="currentColor" opacity=".3"/><circle cx="14" cy="31" r="1.2" fill="currentColor" opacity=".3"/><circle cx="17" cy="31" r="1.2" fill="currentColor" opacity=".5"/><circle cx="20" cy="31" r="1.2" fill="currentColor" opacity=".3"/><rect x="35" y="2" width="19" height="3" rx=".5" fill="currentColor" opacity=".25"/><rect x="35" y="7" width="12" height="2" rx=".5" fill="currentColor" opacity=".18"/><rect x="35" y="13" width="19" height="6" rx="1" fill="currentColor" opacity=".15"/><rect x="35" y="22" width="14" height="2" rx=".5" fill="currentColor" opacity=".12"/><rect x="35" y="26" width="10" height="2" rx=".5" fill="currentColor" opacity=".12"/></svg>`,
      column: `<svg viewBox="0 0 56 36" fill="none"><rect x="2" y="2" width="30" height="16" rx="1" fill="currentColor" opacity=".25"/><rect x="2" y="20" width="14.5" height="14" rx="1" fill="currentColor" opacity=".18"/><rect x="17.5" y="20" width="14.5" height="14" rx="1" fill="currentColor" opacity=".18"/><rect x="35" y="2" width="19" height="3" rx=".5" fill="currentColor" opacity=".25"/><rect x="35" y="7" width="12" height="2" rx=".5" fill="currentColor" opacity=".18"/><rect x="35" y="13" width="19" height="6" rx="1" fill="currentColor" opacity=".15"/><rect x="35" y="22" width="14" height="2" rx=".5" fill="currentColor" opacity=".12"/><rect x="35" y="26" width="10" height="2" rx=".5" fill="currentColor" opacity=".12"/></svg>`,
      split: `<svg viewBox="0 0 56 36" fill="none"><rect x="15" y="2" width="26" height="14" rx="1" fill="currentColor" opacity=".25"/><rect x="15" y="18" width="26" height="14" rx="1" fill="currentColor" opacity=".18"/><rect x="1" y="10" width="12" height="3" rx=".5" fill="currentColor" opacity=".22"/><rect x="1" y="15" width="9" height="2" rx=".5" fill="currentColor" opacity=".15"/><rect x="1" y="19" width="11" height="2" rx=".5" fill="currentColor" opacity=".12"/><rect x="43" y="10" width="12" height="6" rx="1" fill="currentColor" opacity=".18"/><rect x="43" y="18" width="8" height="2" rx=".5" fill="currentColor" opacity=".12"/><rect x="43" y="22" width="10" height="2" rx=".5" fill="currentColor" opacity=".12"/></svg>`,
    };

    for (const v of layouts) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'pdpLayout';
      input.value = v;
      input.checked = v === (root.dataset.pdpLayout ?? 'column');
      input.addEventListener('change', () => {
        root.dataset.pdpLayout = v;
        preview.syncLayout();
        onStateChange();
      }, { signal });

      const thumb = document.createElement('span');
      thumb.className = 'variant-thumb__preview';
      thumb.innerHTML = previews[v] ?? '';

      const text = document.createElement('span');
      text.className = 'variant-thumb__label';
      text.textContent = v;

      label.appendChild(input);
      label.appendChild(thumb);
      label.appendChild(text);
      options.appendChild(label);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  wrapper.appendChild(createLayoutGroup());

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

  wrapper.appendChild(createSegmentedGroup({
    name: 'infoDisplay',
    label: 'Product info',
    values: ['accordion', 'tabs'],
    labels: { accordion: 'Accordion', tabs: 'Tabs' },
    initialValue: root.dataset.infoDisplay ?? 'accordion',
    onChange: (v) => {
      root.dataset.infoDisplay = v;
      preview.syncInfoDisplay();
      onStateChange();
    },
    signal,
  }));

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
