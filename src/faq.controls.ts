import { createSegmentedGroup, createStepperGroup } from './control-builders';
import { createLabeledRangeGroup } from './range-control';
import { COLORS, COLOR_LABELS } from './colors';
import type { ColorName, ColorValue } from './colors';
import { FAQ_ITEMS } from './faq.data';
import type { FaqHandle } from './faq';
import { BG_WIDTHS, BG_WIDTH_LABELS, CONTENT_WIDTHS, CONTENT_WIDTH_LABELS } from './section-width';

const FAQ_RADIUS_STOPS = [
  { value: '0', label: 'Sharp', cardRadius: '0px', linkRadius: '0px' },
  { value: '4', label: 'Soft', cardRadius: '4px', linkRadius: '4px' },
  { value: '8', label: 'Rounded', cardRadius: '8px', linkRadius: '8px' },
  { value: '16', label: 'Very Round', cardRadius: '16px', linkRadius: '9999px' },
] as const;

type FaqRadiusStop = (typeof FAQ_RADIUS_STOPS)[number];

function getFaqRadiusStop(rawValue: string | undefined): FaqRadiusStop {
  return FAQ_RADIUS_STOPS.find((s) => s.value === rawValue) ?? FAQ_RADIUS_STOPS[2]!;
}

function getFaqRadiusIndex(rawValue: string | undefined): number {
  const stop = getFaqRadiusStop(rawValue);
  return FAQ_RADIUS_STOPS.findIndex((s) => s.value === stop.value);
}

function applyFaqRadius(root: HTMLElement, rawValue: string | undefined): void {
  const stop = getFaqRadiusStop(rawValue);
  root.dataset.radius = stop.value;
  root.style.setProperty('--faq-card-radius', stop.cardRadius);
  root.style.setProperty('--faq-link-radius', stop.linkRadius);
  root.style.setProperty('--image-radius', stop.cardRadius);
}

const LAYOUTS = ['list', 'cards'] as const;
const HEADING_PLACEMENTS = ['above', 'beside'] as const;
const INDICATORS = ['plus', 'chevrons'] as const;
const BOOLEAN_VALUES = ['false', 'true'] as const;

type LayoutValue = (typeof LAYOUTS)[number];

export interface FaqControlsHandle {
  cleanup(): void;
}

export function initFaqControls(
  root: HTMLElement,
  container: HTMLElement,
  preview: FaqHandle,
  onStateChange: () => void = () => {},
): FaqControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;
  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  let savedHeadingPlacement: string | undefined;

  function syncControlVisibility(): void {
    const showLinkControls = root.dataset.linkEnabled === 'true';
    for (const name of ['linkLabel']) {
      const fieldset = wrapper.querySelector<HTMLFieldSetElement>(`[data-control="${name}"]`);
      if (fieldset) fieldset.hidden = !showLinkControls;
    }

    const isNarrow = root.dataset.contentWidth === 'narrow';
    const placementFieldset = wrapper.querySelector<HTMLFieldSetElement>(`[data-control="headingPlacement"]`);
    if (placementFieldset) placementFieldset.hidden = isNarrow;
    if (isNarrow) {
      if (savedHeadingPlacement === undefined) {
        savedHeadingPlacement = root.dataset.headingPlacement;
      }
      if (root.dataset.headingPlacement !== 'beside') {
        root.dataset.headingPlacement = 'beside';
        const radio = wrapper.querySelector<HTMLInputElement>('input[name="headingPlacement"][value="beside"]');
        if (radio) radio.checked = true;
        preview.sync();
      }
    } else if (savedHeadingPlacement !== undefined) {
      root.dataset.headingPlacement = savedHeadingPlacement;
      const radio = wrapper.querySelector<HTMLInputElement>(`input[name="headingPlacement"][value="${savedHeadingPlacement}"]`);
      if (radio) radio.checked = true;
      savedHeadingPlacement = undefined;
      preview.sync();
    }
  }

  function syncStepperDisplay(controlName: string): void {
    const input = wrapper.querySelector<HTMLInputElement>(`[data-control="${controlName}"] .control-stepper__value`);
    if (input) input.value = root.dataset[controlName] ?? '';
  }

  function setDatasetControl(key: string, value: string): void {
    root.dataset[key] = value;
    preview.sync();
    syncControlVisibility();
    syncStepperDisplay('count');
    onStateChange();
  }

  function createThumbnailGroup(opts: {
    name: string;
    label: string;
    values: readonly LayoutValue[];
    labels: Record<string, string>;
    previews: Record<string, string>;
  }): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group control-group--style';
    fieldset.dataset.control = opts.name;
    fieldset.innerHTML = `<legend class="control-group__label">${opts.label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options';

    for (const value of opts.values) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = opts.name;
      input.value = value;
      input.checked = value === (root.dataset[opts.name] ?? opts.values[0]);
      input.addEventListener('change', () => setDatasetControl(opts.name, value), { signal });

      const previewEl = document.createElement('span');
      previewEl.className = 'variant-thumb__preview';
      previewEl.innerHTML = opts.previews[value] ?? '';

      const text = document.createElement('span');
      text.className = 'variant-thumb__label';
      text.textContent = opts.labels[value] ?? value;

      label.appendChild(input);
      label.appendChild(previewEl);
      label.appendChild(text);
      options.appendChild(label);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  function createTextGroup(name: string, label: string, placeholder: string): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const input = document.createElement('input');
    input.className = 'control-group__input';
    input.type = 'text';
    input.name = name;
    input.ariaLabel = label;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.value = root.dataset[name] ?? '';
    input.addEventListener('input', () => setDatasetControl(name, input.value), { signal });

    fieldset.appendChild(input);
    return fieldset;
  }

  function createColorGroup(opts: {
    name: string;
    label: string;
    cssProperty: string;
    fallback: string;
  }): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = opts.name;
    fieldset.innerHTML = `<legend class="control-group__label">${opts.label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--swatches';

    const currentValue = root.style.getPropertyValue(opts.cssProperty).trim().toUpperCase() || opts.fallback;
    const colorEntries = (Object.entries(COLORS) as [ColorName, ColorValue][]).filter(
      ([colorName]) => colorName !== 'transparent',
    );

    for (const [colorName, colorValue] of colorEntries) {
      const label = document.createElement('label');
      label.className = 'swatch';
      label.style.backgroundColor = colorValue;
      label.title = COLOR_LABELS[colorName];

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = opts.name;
      input.value = colorValue;
      input.checked = colorValue.toUpperCase() === currentValue;
      input.ariaLabel = COLOR_LABELS[colorName];
      input.addEventListener('change', () => {
        root.style.setProperty(opts.cssProperty, colorValue);
        preview.sync();
        onStateChange();
      }, { signal });

      label.appendChild(input);
      options.appendChild(label);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  function plusIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  }

  function chevronIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
  }

  wrapper.appendChild(createThumbnailGroup({
    name: 'layout',
    label: 'Layout',
    values: LAYOUTS,
    labels: { list: 'List', cards: 'Cards' },
    previews: {
      list: `<svg viewBox="0 0 56 36" fill="none"><rect x="2" y="7" width="14" height="3" rx=".5" fill="currentColor" opacity=".25"/><rect x="22" y="5" width="30" height="1" fill="currentColor" opacity=".2"/><rect x="22" y="11" width="26" height="2" rx=".5" fill="currentColor" opacity=".32"/><rect x="22" y="17" width="30" height="1" fill="currentColor" opacity=".2"/><rect x="22" y="23" width="23" height="2" rx=".5" fill="currentColor" opacity=".32"/><rect x="22" y="29" width="30" height="1" fill="currentColor" opacity=".2"/></svg>`,
      cards: `<svg viewBox="0 0 56 36" fill="none"><rect x="3" y="4" width="23" height="12" rx="2" fill="currentColor" opacity=".22"/><rect x="30" y="4" width="23" height="12" rx="2" fill="currentColor" opacity=".18"/><rect x="3" y="20" width="23" height="12" rx="2" fill="currentColor" opacity=".18"/><rect x="30" y="20" width="23" height="12" rx="2" fill="currentColor" opacity=".22"/></svg>`,
    },
  }));

  wrapper.appendChild(createStepperGroup({
    name: 'count',
    label: 'Questions',
    initialValue: Number.parseInt(root.dataset.count ?? '3', 10) || 3,
    min: 1,
    max: FAQ_ITEMS.length,
    onStep: (value) => setDatasetControl('count', String(value)),
    getDisplayValue: () => root.dataset.count ?? '3',
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'bgWidth',
    label: 'Background width',
    values: BG_WIDTHS,
    labels: BG_WIDTH_LABELS,
    initialValue: root.dataset.bgWidth,
    onChange: (value) => setDatasetControl('bgWidth', value),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'contentWidth',
    label: 'Content width',
    values: CONTENT_WIDTHS,
    labels: CONTENT_WIDTH_LABELS,
    initialValue: root.dataset.contentWidth,
    onChange: (value) => setDatasetControl('contentWidth', value),
    signal,
    description: 'Visible at wider viewports.',
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'headingPlacement',
    label: 'Heading position',
    values: HEADING_PLACEMENTS,
    labels: { above: 'Above', beside: 'Beside' },
    initialValue: root.dataset.headingPlacement,
    onChange: (value) => setDatasetControl('headingPlacement', value),
    signal,
  }));

  wrapper.appendChild(createTextGroup('heading', 'Heading', 'Enter a heading...'));
  wrapper.appendChild(createTextGroup('subheading', 'Subheading', 'Enter a subheading...'));

  wrapper.appendChild(createSegmentedGroup({
    name: 'accordion',
    label: 'Accordion',
    values: BOOLEAN_VALUES,
    labels: { false: 'Off', true: 'On' },
    initialValue: root.dataset.accordion,
    onChange: (value) => setDatasetControl('accordion', value),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'indicator',
    label: 'Indicator',
    values: INDICATORS,
    labels: { plus: plusIcon(), chevrons: chevronIcon() },
    initialValue: root.dataset.indicator,
    onChange: (value) => setDatasetControl('indicator', value),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'linkEnabled',
    label: 'More link',
    values: BOOLEAN_VALUES,
    labels: { false: 'Off', true: 'On' },
    initialValue: root.dataset.linkEnabled,
    onChange: (value) => setDatasetControl('linkEnabled', value),
    signal,
  }));

  wrapper.appendChild(createTextGroup('linkLabel', 'Link label', 'See More FAQs'));

  applyFaqRadius(root, root.dataset.radius);

  wrapper.appendChild(createLabeledRangeGroup({
    name: 'radius',
    label: 'Border radius',
    steps: FAQ_RADIUS_STOPS.map((s) => s.label),
    initialIndex: getFaqRadiusIndex(root.dataset.radius),
    onInput: (index) => {
      const stop = FAQ_RADIUS_STOPS[index];
      if (!stop) return;
      applyFaqRadius(root, stop.value);
      preview.sync();
      onStateChange();
    },
    signal,
  }));
  wrapper.appendChild(createColorGroup({
    name: 'background-color',
    label: 'Background',
    cssProperty: '--faq-color',
    fallback: '#FFFFFF',
  }));
  wrapper.appendChild(createColorGroup({
    name: 'text-color',
    label: 'Text color',
    cssProperty: '--faq-text-color',
    fallback: '#000000',
  }));
  wrapper.appendChild(createColorGroup({
    name: 'highlight-color',
    label: 'Highlight',
    cssProperty: '--faq-highlight-color',
    fallback: '#ED1818',
  }));

  container.appendChild(wrapper);
  syncControlVisibility();

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
