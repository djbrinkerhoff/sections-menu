import { initSlideshow } from './gallery.slideshow';
import type { SlideshowHandle } from './gallery.slideshow';
import { initImageLightbox } from './image.lightbox';
import { COLORS } from './nav.schema';
import type { ColorName, ColorValue } from './nav.schema';

// Gallery control schema
const LAYOUTS = ['grid', 'slideshow', 'masonry'] as const;
const COLUMNS = ['2', '3', '4'] as const;
const GAPS = ['none', 'sm', 'md', 'lg'] as const;
const ASPECTS = ['square', 'landscape', 'portrait', 'auto'] as const;
const FITS = ['cover', 'contain'] as const;
const TIMINGS = ['2', '4', '6', '8'] as const;
const PAGINATIONS = ['dots', 'dashes', 'counter', 'thumbnails'] as const;

type Layout = (typeof LAYOUTS)[number];
type GalleryControlKey = 'layout' | 'columns' | 'gap' | 'aspect' | 'fit' | 'captions' | 'lightbox' | 'autoplay' | 'timing' | 'pagination';

// Controls hidden per layout
const HIDDEN_CONTROLS: Record<Layout, string[]> = {
  grid: ['autoplay', 'timing', 'pagination'],
  slideshow: ['columns', 'gap'],
  masonry: ['autoplay', 'timing', 'pagination', 'aspect', 'fit'],
};

export interface GalleryControlsHandle {
  cleanup(): void;
  handleViewportChange(): void;
}

export function initGalleryControls(
  galleryRoot: HTMLElement,
  container: HTMLElement,
  onStateChange: () => void = () => {},
): GalleryControlsHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  let slideshowHandle: SlideshowHandle | null = null;
  const lightbox = initImageLightbox(galleryRoot, {
    isEnabled: () => galleryRoot.dataset.lightbox === 'true',
    onOpen() {
      if (galleryRoot.dataset.layout === 'slideshow') {
        slideshowHandle?.pauseAutoplay();
      }
    },
    onClose(session) {
      if (galleryRoot.dataset.layout !== 'slideshow') return;
      slideshowHandle?.goToIndex(session.activeIndex, { immediate: true });
      slideshowHandle?.resumeAutoplay();
    },
  });

  const allItems = Array.from(galleryRoot.querySelectorAll<HTMLElement>('.gallery__item'));
  const totalImages = allItems.length;
  let currentImageCount = Number(galleryRoot.dataset.images) || totalImages;

  function closeLightboxForMutation(): void {
    if (lightbox.isOpen()) {
      lightbox.close();
    }
  }

  function syncImageVisibility(): void {
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (item) item.hidden = i >= currentImageCount;
    }
  }

  function setImageCount(rawValue: number): void {
    closeLightboxForMutation();

    const count = Number.isFinite(rawValue) ? Math.max(1, Math.min(totalImages, Math.trunc(rawValue))) : totalImages;
    currentImageCount = count;
    galleryRoot.dataset.images = String(count);
    syncImageVisibility();

    // Re-init slideshow so it picks up the new visible item set
    if (slideshowHandle) {
      slideshowHandle.cleanup();
      slideshowHandle = initSlideshow(galleryRoot, signal);
    }

    onStateChange();
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
    closeLightboxForMutation();

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
    onStateChange();
  }

  function setControl(key: GalleryControlKey, value: string): void {
    galleryRoot.dataset[key] = value;

    if (key === 'layout') {
      onLayoutChange(value as Layout);
      return;
    }

    if (key === 'lightbox' && value !== 'true') {
      closeLightboxForMutation();
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

    if (slideshowHandle && (key === 'aspect' || key === 'fit' || key === 'captions')) {
      slideshowHandle.syncLayout();
    }

    onStateChange();
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
    description?: string,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    if (description) {
      const desc = document.createElement('p');
      desc.className = 'control-group__desc';
      desc.textContent = description;
      fieldset.appendChild(desc);
    }

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

  // ─── Builder: stepper ───

  function createStepperGroup(
    name: string,
    label: string,
    initialValue: number,
    min: number,
    max: number,
    onStep: (value: number) => void,
    getDisplayValue: () => string,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    let current = initialValue;

    const stepper = document.createElement('div');
    stepper.className = 'control-stepper';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'control-stepper__btn';
    minusBtn.type = 'button';
    minusBtn.textContent = '\u2212';
    minusBtn.ariaLabel = `Decrease ${label}`;

    const valueInput = document.createElement('input');
    valueInput.className = 'control-stepper__value';
    valueInput.type = 'text';
    valueInput.inputMode = 'numeric';
    valueInput.value = getDisplayValue();
    valueInput.ariaLabel = label;
    valueInput.autocomplete = 'off';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'control-stepper__btn';
    plusBtn.type = 'button';
    plusBtn.textContent = '+';
    plusBtn.ariaLabel = `Increase ${label}`;

    function update(newValue: number): void {
      current = Math.max(min, Math.min(max, newValue));
      onStep(current);
      valueInput.value = getDisplayValue();
    }

    minusBtn.addEventListener('click', () => update(current - 1), { signal });
    plusBtn.addEventListener('click', () => update(current + 1), { signal });
    valueInput.addEventListener('change', () => {
      const parsed = Number.parseInt(valueInput.value, 10);
      if (Number.isFinite(parsed)) {
        update(parsed);
      } else {
        valueInput.value = getDisplayValue();
      }
    }, { signal });
    valueInput.addEventListener('blur', () => {
      valueInput.value = getDisplayValue();
    }, { signal });

    stepper.appendChild(minusBtn);
    stepper.appendChild(valueInput);
    stepper.appendChild(plusBtn);
    fieldset.appendChild(stepper);
    return fieldset;
  }

  // ─── Builder: color swatch group ───

  const COLOR_LABELS: Record<ColorName, string> = {
    white: 'White',
    black: 'Black',
    yellow: 'Yellow',
    pink: 'Pink',
    red: 'Red',
    blue: 'Blue',
    transparent: 'Transparent',
  };

  function createColorGroup(name: string, label: string, cssProp: string, defaultValue: string): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--swatches';

    const currentValue = galleryRoot.style.getPropertyValue(cssProp).trim().toUpperCase() || defaultValue;
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
        galleryRoot.style.setProperty(cssProp, colorValue);
        onStateChange();
      }, { signal });

      labelEl.appendChild(input);
      options.appendChild(labelEl);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  function sectionHeading(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'control-section__heading';
    el.textContent = text;
    return el;
  }

  // ─── Render controls ───

  // 1. Layout picker
  wrapper.appendChild(createLayoutGroup());

  // ── Content ──
  wrapper.appendChild(sectionHeading('Content'));

  // 2. Images
  wrapper.appendChild(createStepperGroup(
    'images', 'Images', currentImageCount, 1, totalImages,
    setImageCount, () => String(currentImageCount),
  ));

  // 3. Heading
  {
    const headingEl = galleryRoot.querySelector<HTMLElement>('.gallery__heading');
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
    input.value = galleryRoot.dataset.heading ?? '';
    if (headingEl) headingEl.textContent = input.value;

    input.addEventListener('input', () => {
      galleryRoot.dataset.heading = input.value;
      if (headingEl) headingEl.textContent = input.value;
      onStateChange();
    }, { signal });

    fieldset.appendChild(input);
    wrapper.appendChild(fieldset);
  }

  // ── Grid ──
  wrapper.appendChild(sectionHeading('Grid'));

  wrapper.appendChild(createSegmentedGroup(
    'columns', 'Columns', COLUMNS,
    { '2': '2', '3': '3', '4': '4' },
    'columns',
    'Applies at 768px and above. Smaller screens show 2 columns.',
  ));

  // 4. Spacing
  wrapper.appendChild(createSegmentedGroup(
    'gap', 'Spacing', GAPS,
    { none: 'None', sm: 'S', md: 'M', lg: 'L' },
    'gap',
  ));

  // ── Appearance ──
  wrapper.appendChild(sectionHeading('Appearance'));

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

  // 8. Lightbox
  wrapper.appendChild(createSegmentedGroup(
    'lightbox', 'Lightbox', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'lightbox',
  ));

  // 9. Background color
  wrapper.appendChild(createColorGroup('background-color', 'Background', '--gallery-color', '#FFFFFF'));

  // 9. Text color
  wrapper.appendChild(createColorGroup('text-color', 'Text color', '--gallery-accent', '#000000'));

  // ── Slideshow ──
  wrapper.appendChild(sectionHeading('Slideshow'));

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
      lightbox.cleanup();
      if (slideshowHandle) {
        slideshowHandle.cleanup();
        slideshowHandle = null;
      }
      abortController.abort();
      wrapper.remove();
    },
    handleViewportChange() {
      slideshowHandle?.syncLayout();
      lightbox.handleViewportChange();
    },
  };
}
