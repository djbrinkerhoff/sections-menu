import { initSlideshow } from './gallery.slideshow';
import type { SlideshowHandle } from './gallery.slideshow';

// Gallery control schema
const LAYOUTS = ['grid', 'slideshow', 'masonry'] as const;
const COLUMNS = ['2', '3', '4'] as const;
const GAPS = ['none', 'sm', 'md', 'lg'] as const;
const ASPECTS = ['square', 'landscape', 'portrait', 'auto'] as const;
const FITS = ['cover', 'contain'] as const;
const TIMINGS = ['2', '4', '6', '8'] as const;
const PAGINATIONS = ['dots', 'dashes', 'counter', 'thumbnails'] as const;

type Layout = (typeof LAYOUTS)[number];
type GalleryControlKey = 'layout' | 'columns' | 'gap' | 'aspect' | 'fit' | 'captions' | 'heading' | 'autoplay' | 'timing' | 'pagination';

// Controls hidden per layout
const HIDDEN_CONTROLS: Record<Layout, string[]> = {
  grid: ['autoplay', 'timing', 'pagination'],
  slideshow: ['columns', 'gap'],
  masonry: ['autoplay', 'timing', 'pagination'],
};

export function initGalleryControls(galleryRoot: HTMLElement, container: HTMLElement) {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  let slideshowHandle: SlideshowHandle | null = null;

  const allItems = Array.from(galleryRoot.querySelectorAll<HTMLElement>('.gallery__item'));
  const totalImages = allItems.length;
  let currentImageCount = Number(galleryRoot.dataset.images) || totalImages;

  function syncImageVisibility(): void {
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (item) item.hidden = i >= currentImageCount;
    }
  }

  function setImageCount(rawValue: number): void {
    const count = Number.isFinite(rawValue) ? Math.max(1, Math.min(totalImages, Math.trunc(rawValue))) : totalImages;
    currentImageCount = count;
    galleryRoot.dataset.images = String(count);
    syncImageVisibility();

    // Re-init slideshow so it picks up the new visible item set
    if (slideshowHandle) {
      slideshowHandle.cleanup();
      slideshowHandle = initSlideshow(galleryRoot, signal);
    }
  }

  // Apply initial visibility
  syncImageVisibility();

  // ─── Layout switching lifecycle ───

  function syncControlVisibility(): void {
    const layout = (galleryRoot.dataset.layout ?? 'grid') as Layout;
    const hidden = HIDDEN_CONTROLS[layout] ?? [];
    for (const el of wrapper.querySelectorAll<HTMLFieldSetElement>('[data-control]')) {
      const controlName = el.dataset.control;
      if (controlName) el.hidden = hidden.includes(controlName);
    }
    // Nested: timing is also hidden when autoplay is off
    const timingControl = wrapper.querySelector<HTMLFieldSetElement>('[data-control="timing"]');
    if (timingControl && layout === 'slideshow') {
      timingControl.hidden = galleryRoot.dataset.autoplay !== 'true';
    }
  }

  function onLayoutChange(layout: Layout): void {
    // Tear down slideshow if leaving
    if (slideshowHandle) {
      slideshowHandle.cleanup();
      slideshowHandle = null;
    }

    galleryRoot.dataset.layout = layout;

    // Init slideshow if entering
    if (layout === 'slideshow') {
      slideshowHandle = initSlideshow(galleryRoot, signal);
    }

    syncControlVisibility();
  }

  function setControl(key: GalleryControlKey, value: string): void {
    galleryRoot.dataset[key] = value;

    if (key === 'layout') {
      onLayoutChange(value as Layout);
      return;
    }

    if (key === 'autoplay') {
      syncControlVisibility();
      if (slideshowHandle) {
        // Restart or stop autoplay by re-initing slideshow
        slideshowHandle.cleanup();
        slideshowHandle = initSlideshow(galleryRoot, signal);
      }
    }

    if (key === 'timing' && slideshowHandle) {
      // Restart autoplay with new timing
      slideshowHandle.cleanup();
      slideshowHandle = initSlideshow(galleryRoot, signal);
    }

    if (key === 'pagination' && slideshowHandle) {
      slideshowHandle.syncPagination();
    }
  }

  // ─── Builder: layout picker (thumbnail grid like nav variant picker) ───

  function createLayoutGroup(): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group control-group--style';
    fieldset.dataset.control = 'layout';
    fieldset.innerHTML = `<legend class="control-group__label">Layout</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options control-group__options--layout';

    const previews: Record<string, string> = {
      grid: `<svg viewBox="0 0 56 36" fill="none"><rect x="2" y="2" width="16" height="14" rx="1" fill="currentColor" opacity=".25"/><rect x="20" y="2" width="16" height="14" rx="1" fill="currentColor" opacity=".25"/><rect x="38" y="2" width="16" height="14" rx="1" fill="currentColor" opacity=".25"/><rect x="2" y="19" width="16" height="14" rx="1" fill="currentColor" opacity=".18"/><rect x="20" y="19" width="16" height="14" rx="1" fill="currentColor" opacity=".18"/><rect x="38" y="19" width="16" height="14" rx="1" fill="currentColor" opacity=".18"/></svg>`,
      slideshow: `<svg viewBox="0 0 56 36" fill="none"><rect x="4" y="3" width="48" height="26" rx="1.5" fill="currentColor" opacity=".2"/><circle cx="24" cy="33" r="1.5" fill="currentColor" opacity=".3"/><circle cx="28" cy="33" r="1.5" fill="currentColor" opacity=".5"/><circle cx="32" cy="33" r="1.5" fill="currentColor" opacity=".3"/><path d="M7 16l4-3v6z" fill="currentColor" opacity=".3"/><path d="M49 16l-4-3v6z" fill="currentColor" opacity=".3"/></svg>`,
      masonry: `<svg viewBox="0 0 56 36" fill="none"><rect x="2" y="2" width="16" height="18" rx="1" fill="currentColor" opacity=".25"/><rect x="20" y="2" width="16" height="12" rx="1" fill="currentColor" opacity=".25"/><rect x="38" y="2" width="16" height="22" rx="1" fill="currentColor" opacity=".25"/><rect x="2" y="22" width="16" height="12" rx="1" fill="currentColor" opacity=".18"/><rect x="20" y="16" width="16" height="18" rx="1" fill="currentColor" opacity=".18"/><rect x="38" y="26" width="16" height="8" rx="1" fill="currentColor" opacity=".18"/></svg>`,
    };

    for (const v of LAYOUTS) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'layout';
      input.value = v;
      input.checked = v === (galleryRoot.dataset.layout ?? 'grid');
      input.addEventListener('change', () => setControl('layout', v), { signal });

      const preview = document.createElement('span');
      preview.className = 'variant-thumb__preview';
      preview.innerHTML = previews[v] ?? '';

      const text = document.createElement('span');
      text.className = 'variant-thumb__label';
      text.textContent = v;

      label.appendChild(input);
      label.appendChild(preview);
      label.appendChild(text);
      options.appendChild(label);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  // ─── Builder: segmented group ───

  function createSegmentedGroup(
    name: string,
    label: string,
    values: readonly string[],
    labels: Record<string, string>,
    controlKey: GalleryControlKey,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--segmented';

    for (const v of values) {
      const labelEl = document.createElement('label');
      labelEl.className = 'segmented-btn';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = v;
      input.checked = v === (galleryRoot.dataset[controlKey] ?? values[0]);
      input.addEventListener('change', () => setControl(controlKey, v), { signal });

      labelEl.appendChild(input);

      const display = labels[v];
      if (display !== undefined) {
        const span = document.createElement('span');
        span.innerHTML = display;
        labelEl.appendChild(span);
      }

      options.appendChild(labelEl);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  // ─── Builder: number input ───

  function createNumberInputGroup(
    name: string,
    label: string,
    initialValue: number,
    min: number,
    max: number,
    onInput: (value: number) => void,
    getDisplayValue: () => string,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const input = document.createElement('input');
    input.className = 'control-group__input';
    input.type = 'number';
    input.name = name;
    input.ariaLabel = label;
    input.autocomplete = 'off';
    input.min = String(min);
    input.max = String(max);
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = String(initialValue);
    input.addEventListener('input', () => {
      onInput(Number.parseInt(input.value, 10) || min);
    }, { signal });
    input.addEventListener('blur', () => {
      input.value = getDisplayValue();
    }, { signal });

    fieldset.appendChild(input);
    return fieldset;
  }

  // ─── Render controls ───

  // 1. Layout picker
  wrapper.appendChild(createLayoutGroup());

  // 2. Images
  wrapper.appendChild(createNumberInputGroup(
    'images', 'Images', currentImageCount, 1, totalImages,
    setImageCount, () => String(currentImageCount),
  ));

  // 3. Heading
  wrapper.appendChild(createSegmentedGroup(
    'heading', 'Heading', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'heading',
  ));

  // 3. Columns
  wrapper.appendChild(createSegmentedGroup(
    'columns', 'Columns', COLUMNS,
    { '2': '2', '3': '3', '4': '4' },
    'columns',
  ));

  // 4. Spacing
  wrapper.appendChild(createSegmentedGroup(
    'gap', 'Spacing', GAPS,
    { none: 'None', sm: 'S', md: 'M', lg: 'L' },
    'gap',
  ));

  // 5. Aspect ratio
  wrapper.appendChild(createSegmentedGroup(
    'aspect', 'Aspect ratio', ASPECTS,
    { square: '1:1', landscape: '4:3', portrait: '3:4', auto: 'Auto' },
    'aspect',
  ));

  // 6. Fill
  wrapper.appendChild(createSegmentedGroup(
    'fit', 'Fill', FITS,
    { cover: 'Cover', contain: 'Contain' },
    'fit',
  ));

  // 7. Captions
  wrapper.appendChild(createSegmentedGroup(
    'captions', 'Captions', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'captions',
  ));

  // 8. Auto Play (slideshow only)
  wrapper.appendChild(createSegmentedGroup(
    'autoplay', 'Auto play', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'autoplay',
  ));

  // 9. Timing (slideshow only, hidden when autoplay off)
  wrapper.appendChild(createSegmentedGroup(
    'timing', 'Timing', TIMINGS,
    { '2': '2s', '4': '4s', '6': '6s', '8': '8s' },
    'timing',
  ));

  // 10. Pagination (slideshow only)
  wrapper.appendChild(createSegmentedGroup(
    'pagination', 'Pagination', PAGINATIONS,
    { dots: 'Dots', dashes: 'Dashes', counter: 'Counter', thumbnails: 'Thumbs' },
    'pagination',
  ));

  container.appendChild(wrapper);

  // Init control visibility + slideshow if restoring into slideshow layout
  syncControlVisibility();
  if (galleryRoot.dataset.layout === 'slideshow') {
    slideshowHandle = initSlideshow(galleryRoot, signal);
  }

  return {
    cleanup() {
      if (slideshowHandle) {
        slideshowHandle.cleanup();
        slideshowHandle = null;
      }
      abortController.abort();
      wrapper.remove();
    },
  };
}
