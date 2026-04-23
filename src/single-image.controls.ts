import { createSegmentedGroup } from './control-builders';
import { COLORS, COLOR_LABELS } from './colors';
import type { ColorName, ColorValue } from './colors';
import { BG_WIDTHS, BG_WIDTH_LABELS, CONTENT_WIDTHS, CONTENT_WIDTH_LABELS } from './section-width';

// ─── Mask shape schema ───

const MASK_SHAPES = [
  { id: 'none', label: 'None', src: null, aspectRatio: null },
  { id: 'circle', label: 'Circle', src: '/masks/circle.svg', aspectRatio: '1 / 1' },
  { id: 'arch', label: 'Arch', src: '/masks/arch.svg', aspectRatio: '3 / 4' },
  { id: 'blob', label: 'Blob', src: '/masks/blob.svg', aspectRatio: '4 / 5' },
  { id: 'diamond', label: 'Diamond', src: '/masks/diamond.svg', aspectRatio: '1 / 1' },
  { id: 'star', label: 'Star', src: '/masks/star.svg', aspectRatio: '1 / 1' },
  { id: 'heart', label: 'Heart', src: '/masks/heart.svg', aspectRatio: '1 / 1' },
] as const;

const NONE_THUMBNAIL = `<svg viewBox="0 0 56 36" fill="none"><rect x="4" y="2" width="48" height="32" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`;

// ─── Unsplash image set ───

interface ImageDef {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const UNSPLASH_IMAGES: ImageDef[] = [
  { src: '/images/alexander-korte-Oj0ykWKf5To-unsplash.jpg', alt: 'Film photograph by Alexander Korte', width: 1200, height: 795 },
  { src: '/images/brave-sneakers-HPW_Hjzw6ZA-unsplash.jpg', alt: 'Film photograph by Brave Sneakers', width: 1200, height: 800 },
  { src: '/images/bruce-barrow-9dmb89VrlsQ-unsplash.jpg', alt: 'Film photograph by Bruce Barrow', width: 1200, height: 860 },
  { src: '/images/bruce-barrow-n-CpmMFXj9s-unsplash.jpg', alt: 'Film photograph by Bruce Barrow', width: 1200, height: 1673 },
  { src: '/images/john-zhou-KTPoP4cyAdw-unsplash.jpg', alt: 'Film photograph by John Zhou', width: 1200, height: 1810 },
  { src: '/images/lei-hwang-K59VVouNOaE-unsplash.jpg', alt: 'Film photograph by Lei Hwang', width: 1200, height: 783 },
  { src: '/images/maximilian-bungart-QzlQHPG7cUY-unsplash.jpg', alt: 'Film photograph by Maximilian Bungart', width: 1200, height: 1790 },
  { src: '/images/severin-demchuk-jllQYsBvFnA-unsplash.jpg', alt: 'Film photograph by Severin Demchuk', width: 1200, height: 1771 },
  { src: '/images/tanya-barrow-4fmlPygqRmo-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 1794 },
  { src: '/images/tanya-barrow-bXXEC99WyI8-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 1794 },
  { src: '/images/tanya-barrow-O90NM4fkFg8-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 802 },
  { src: '/images/tom-caillarec-lv6Z1Ae4Jhg-unsplash.jpg', alt: 'Film photograph by Tom Caillarec', width: 1200, height: 800 },
];

// ─── Helpers ───

function applyMask(root: HTMLElement, maskId: string): void {
  const shape = MASK_SHAPES.find((s) => s.id === maskId);
  if (!shape || !shape.src) {
    root.style.removeProperty('--mask-src');
    root.style.removeProperty('--mask-aspect-ratio');
    return;
  }
  root.style.setProperty('--mask-src', `url('${shape.src}')`);
  root.style.setProperty('--mask-aspect-ratio', shape.aspectRatio);
}

function applyImage(root: HTMLElement, img: ImageDef): void {
  const el = root.querySelector<HTMLImageElement>('.single-image__image');
  if (!el) return;
  el.src = img.src;
  el.alt = img.alt;
  el.width = img.width;
  el.height = img.height;
  root.dataset.imageSrc = img.src;
}

function pickRandomImage(currentSrc: string): ImageDef {
  const others = UNSPLASH_IMAGES.filter((img) => !currentSrc.endsWith(img.src));
  const pool = others.length > 0 ? others : UNSPLASH_IMAGES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export interface SingleImageControlsHandle {
  cleanup(): void;
}

export function initSingleImageControls(
  singleImageRoot: HTMLElement,
  container: HTMLElement,
  onStateChange: () => void = () => {},
): SingleImageControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  // Apply mask from restored state (data-mask is on DOM before init)
  const restoredMask = singleImageRoot.dataset.mask ?? 'none';
  applyMask(singleImageRoot, restoredMask);

  // Restore image from saved state
  const restoredSrc = singleImageRoot.dataset.imageSrc;
  if (restoredSrc) {
    const match = UNSPLASH_IMAGES.find((img) => img.src === restoredSrc);
    if (match) applyImage(singleImageRoot, match);
  }

  function syncControlVisibility(): void {
    const maskActive = (singleImageRoot.dataset.mask ?? 'none') !== 'none';
    for (const name of ['aspect']) {
      const el = wrapper.querySelector<HTMLFieldSetElement>(`[data-control="${name}"]`);
      if (el) el.hidden = maskActive;
    }
  }

  // Restore heading/subheading text from data attributes
  const headingEl = singleImageRoot.querySelector<HTMLElement>('.single-image__heading');
  const subheadingEl = singleImageRoot.querySelector<HTMLElement>('.single-image__subheading');
  if (headingEl) headingEl.textContent = singleImageRoot.dataset.heading ?? '';
  if (subheadingEl) subheadingEl.textContent = singleImageRoot.dataset.subheading ?? '';

  // ─── Shape picker (hero control) ───

  function createShapeGroup(): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group control-group--style';
    fieldset.dataset.control = 'mask';
    fieldset.innerHTML = `<legend class="control-group__label">Shape</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options control-group__options--shapes';

    for (const shape of MASK_SHAPES) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'mask';
      input.value = shape.id;
      input.checked = shape.id === restoredMask;
      input.addEventListener('change', () => {
        singleImageRoot.dataset.mask = shape.id;
        applyMask(singleImageRoot, shape.id);
        syncControlVisibility();
        onStateChange();
      }, { signal });

      const preview = document.createElement('span');
      preview.className = 'variant-thumb__preview';
      if (shape.src) {
        const swatch = document.createElement('span');
        swatch.className = 'variant-thumb__shape';
        swatch.style.setProperty('-webkit-mask-image', `url('${shape.src}')`);
        swatch.style.setProperty('mask-image', `url('${shape.src}')`);
        preview.appendChild(swatch);
      } else {
        preview.innerHTML = NONE_THUMBNAIL;
      }

      const text = document.createElement('span');
      text.className = 'variant-thumb__label';
      text.textContent = shape.label;

      label.appendChild(input);
      label.appendChild(preview);
      label.appendChild(text);
      options.appendChild(label);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  wrapper.appendChild(createShapeGroup());

  // ─── Random image button ───

  {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = 'randomImage';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'control-group__input';
    btn.textContent = 'Random image';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'center';
    btn.addEventListener('click', () => {
      const currentSrc = singleImageRoot.querySelector<HTMLImageElement>('.single-image__image')?.src ?? '';
      const img = pickRandomImage(currentSrc);
      applyImage(singleImageRoot, img);
      onStateChange();
    }, { signal });

    fieldset.appendChild(btn);
    wrapper.appendChild(fieldset);
  }

  // Content width
  wrapper.appendChild(createSegmentedGroup({
    name: 'contentWidth', label: 'Content width', values: CONTENT_WIDTHS,
    labels: CONTENT_WIDTH_LABELS,
    initialValue: singleImageRoot.dataset.contentWidth,
    onChange(v) {
      singleImageRoot.dataset.contentWidth = v;
      onStateChange();
    },
    signal, description: 'Visible at wider viewports.',
  }));

  // Background width
  wrapper.appendChild(createSegmentedGroup({
    name: 'bgWidth', label: 'Background width', values: BG_WIDTHS,
    labels: BG_WIDTH_LABELS,
    initialValue: singleImageRoot.dataset.bgWidth,
    onChange(v) {
      singleImageRoot.dataset.bgWidth = v;
      onStateChange();
    },
    signal,
  }));

  // Aspect ratio (hidden when mask is active)
  const ASPECTS = ['auto', 'square', 'landscape', 'portrait'] as const;
  wrapper.appendChild(createSegmentedGroup({
    name: 'aspect', label: 'Aspect ratio', values: ASPECTS,
    labels: { auto: 'Auto', square: 'Square', landscape: 'Landscape', portrait: 'Portrait' },
    initialValue: singleImageRoot.dataset.aspect ?? 'auto',
    onChange(v) {
      singleImageRoot.dataset.aspect = v;
      onStateChange();
    },
    signal,
  }));

  // ─── Heading input ───
  {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = 'heading';
    fieldset.innerHTML = `<legend class="control-group__label">Heading</legend>`;

    const input = document.createElement('input');
    input.className = 'control-group__input';
    input.type = 'text';
    input.name = 'heading';
    input.ariaLabel = 'Heading';
    input.placeholder = 'Enter a heading…';
    input.autocomplete = 'off';
    input.value = singleImageRoot.dataset.heading ?? '';

    input.addEventListener('input', () => {
      singleImageRoot.dataset.heading = input.value;
      if (headingEl) headingEl.textContent = input.value;
      onStateChange();
    }, { signal });

    fieldset.appendChild(input);
    wrapper.appendChild(fieldset);
  }

  // ─── Subheading input ───
  {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = 'subheading';
    fieldset.innerHTML = `<legend class="control-group__label">Subheading</legend>`;

    const input = document.createElement('input');
    input.className = 'control-group__input';
    input.type = 'text';
    input.name = 'subheading';
    input.ariaLabel = 'Subheading';
    input.placeholder = 'Enter a subheading…';
    input.autocomplete = 'off';
    input.value = singleImageRoot.dataset.subheading ?? '';

    input.addEventListener('input', () => {
      singleImageRoot.dataset.subheading = input.value;
      if (subheadingEl) subheadingEl.textContent = input.value;
      onStateChange();
    }, { signal });

    fieldset.appendChild(input);
    wrapper.appendChild(fieldset);
  }

  // Caption toggle
  const CAPTION_VALUES = ['true', 'false'] as const;
  const CAPTION_LABELS: Record<string, string> = { true: 'Show', false: 'Hide' };
  wrapper.appendChild(createSegmentedGroup({
    name: 'caption', label: 'Caption', values: CAPTION_VALUES,
    labels: CAPTION_LABELS,
    initialValue: singleImageRoot.dataset.caption ?? 'false',
    onChange(v) {
      singleImageRoot.dataset.caption = v;
      onStateChange();
    },
    signal,
  }));

  // ─── Background color ───
  wrapper.appendChild(createColorGroup({
    root: singleImageRoot,
    name: 'background-color',
    label: 'Background',
    cssProp: '--single-image-color',
    defaultValue: '#FFFFFF',
    onStateChange,
    signal,
  }));

  // ─── Text color ───
  wrapper.appendChild(createColorGroup({
    root: singleImageRoot,
    name: 'text-color',
    label: 'Text color',
    cssProp: '--single-image-accent',
    defaultValue: '#000000',
    onStateChange,
    signal,
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

// ─── Color swatch builder (mirrors gallery pattern) ───

function createColorGroup(opts: {
  root: HTMLElement;
  name: string;
  label: string;
  cssProp: string;
  defaultValue: string;
  onStateChange: () => void;
  signal: AbortSignal;
}): HTMLFieldSetElement {
  const { root, name, label, cssProp, defaultValue, onStateChange, signal } = opts;

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'control-group';
  fieldset.dataset.control = name;
  fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

  const options = document.createElement('div');
  options.className = 'control-group__options--swatches';

  const currentValue = root.style.getPropertyValue(cssProp).trim().toUpperCase() || defaultValue;
  const colorEntries = (Object.entries(COLORS) as [ColorName, ColorValue][]).filter(
    ([colorName]) => colorName !== 'transparent',
  );

  for (const [colorName, colorValue] of colorEntries) {
    const labelEl = document.createElement('label');
    labelEl.className = 'swatch';
    labelEl.style.backgroundColor = colorValue;
    labelEl.title = COLOR_LABELS[colorName];

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = colorValue;
    input.checked = colorValue.toUpperCase() === currentValue;
    input.ariaLabel = COLOR_LABELS[colorName];
    input.addEventListener('change', () => {
      root.style.setProperty(cssProp, colorValue);
      onStateChange();
    }, { signal });

    labelEl.appendChild(input);
    options.appendChild(labelEl);
  }

  fieldset.appendChild(options);
  return fieldset;
}
