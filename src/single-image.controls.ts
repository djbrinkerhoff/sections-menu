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

const NONE_THUMBNAIL = `<svg viewBox="0 0 56 36" fill="none"><rect x="4" y="2" width="48" height="32" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/></svg>`;

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
