import { createSegmentedGroup } from './control-builders';
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

// Swatch thumbnail SVGs (viewBox 0 0 56 36)
const MASK_THUMBNAILS: Record<string, string> = {
  none: `<svg viewBox="0 0 56 36" fill="none"><rect x="4" y="2" width="48" height="32" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`,
  circle: `<svg viewBox="0 0 56 36" fill="none"><circle cx="28" cy="18" r="15" fill="currentColor"/></svg>`,
  arch: `<svg viewBox="0 0 56 36" fill="none"><path d="M16 33V15c0-6.627 5.373-12 12-12s12 5.627 12 15v15H16z" fill="currentColor"/></svg>`,
  blob: `<svg viewBox="0 0 56 36" fill="none"><path d="M38 5c4.5 3.3 6.5 8.8 6.5 14.5s-2.1 11.6-6 15.8c-1.4.5-5.7.4-10.7.2-5-.2-10.1-1.8-13.4-5s-5-8.5-3.7-13.8S16.2 6 20.5 4c4.2-2 13-2.3 17.5 1z" fill="currentColor"/></svg>`,
  diamond: `<svg viewBox="0 0 56 36" fill="none"><polygon points="28,2 46,18 28,34 10,18" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 56 36" fill="none"><polygon points="28,3 32.5,14.5 45,15.5 35.5,23 38.5,35 28,28.5 17.5,35 20.5,23 11,15.5 23.5,14.5" fill="currentColor"/></svg>`,
  heart: `<svg viewBox="0 0 56 36" fill="none"><path d="M28 33C18 25.5 8 19.5 8 12.5 8 7.8 11.8 4 16.5 4c3 0 5.5 1.6 6.7 4C24.5 5.6 27 4 30 4c4.7 0 8.5 3.8 8.5 8.5 0 7-10 13.5-19 20.5H28z" fill="currentColor"/></svg>`,
};

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
        onStateChange();
      }, { signal });

      const preview = document.createElement('span');
      preview.className = 'variant-thumb__preview';
      preview.innerHTML = MASK_THUMBNAILS[shape.id] ?? '';

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

  // Section width controls (shared schema from section-width.ts)
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

  container.appendChild(wrapper);

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
  };
}
