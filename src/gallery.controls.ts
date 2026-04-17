import { initSlideshow } from './gallery.slideshow';
import type { SlideshowHandle } from './gallery.slideshow';
import { initImageLightbox } from './image.lightbox';
import { applyImageRadius, getImageRadiusIndex, IMAGE_RADIUS_STOPS } from './image-radius';
import { COLORS, COLOR_LABELS } from './colors';
import type { ColorName, ColorValue } from './colors';
import { createStepperGroup, createSegmentedGroup } from './control-builders';
import { createLabeledRangeGroup } from './range-control';

// Gallery control schema
const LAYOUTS = ['grid', 'slideshow', 'masonry'] as const;
const COLUMNS = ['2', '3', '4'] as const;
const GAPS = ['none', 'sm', 'md', 'lg'] as const;
const ASPECTS = ['square', 'landscape', 'portrait', 'auto'] as const;
const FITS = ['cover', 'contain'] as const;
const TIMINGS = ['2', '4', '6', '8'] as const;
const PAGINATIONS = ['dots', 'dashes', 'counter', 'thumbnails'] as const;

const HEADING_ALIGNS = ['left', 'center', 'right'] as const;

// Section width schema
const BG_WIDTHS = ['full', 'hug'] as const;
const CONTENT_WIDTHS = ['full', 'wide', 'medium', 'narrow'] as const;

type Layout = (typeof LAYOUTS)[number];
type GalleryControlKey = 'layout' | 'columns' | 'gap' | 'aspect' | 'fit' | 'captions' | 'lightbox' | 'autoplay' | 'timing' | 'pagination' | 'bgWidth' | 'contentWidth' | 'headingAlign';

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
  applyImageRadius(galleryRoot, galleryRoot.dataset.radius);

  let slideshowHandle: SlideshowHandle | null = null;
  const lightbox = initImageLightbox(galleryRoot, {
    isEnabled: () => galleryRoot.dataset.lightbox === 'true',
    onIndexChange(session) {
      if (galleryRoot.dataset.layout !== 'slideshow') return;
      slideshowHandle?.goToIndex(session.activeIndex, { immediate: true, resetAutoplay: false });
    },
    onOpen() {
      if (galleryRoot.dataset.layout === 'slideshow') {
        slideshowHandle?.pauseAutoplay();
      }
    },
    onClose(session) {
      if (galleryRoot.dataset.layout !== 'slideshow') return;
      slideshowHandle?.goToIndex(session.activeIndex, { immediate: true, resetAutoplay: false });
      slideshowHandle?.resumeAutoplay();
    },
  });

  const allItems = Array.from(galleryRoot.querySelectorAll<HTMLElement>('.gallery__item'));
  const totalImages = allItems.length;
  let currentImageCount = Number(galleryRoot.dataset.images) || totalImages;

  // animate:false is critical — must complete synchronously before
  // the caller mutates dataset or reinits the slideshow.
  function closeLightboxForMutation(): void {
    if (lightbox.isOpen()) {
      lightbox.close({ animate: false, restoreFocus: false });
    }
  }

  function reinitSlideshow(): void {
    if (!slideshowHandle) return;
    const savedIndex = slideshowHandle.activeIndex;
    slideshowHandle.cleanup();
    slideshowHandle = initSlideshow(galleryRoot, signal);
    slideshowHandle.goToIndex(savedIndex, { immediate: true, resetAutoplay: false });
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
    reinitSlideshow();
    onStateChange();
  }

  function setRadius(stepIndex: number): void {
    const stop = IMAGE_RADIUS_STOPS[stepIndex];
    if (!stop) return;
    applyImageRadius(galleryRoot, stop.value);
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

    // Width changes: close lightbox, reinit slideshow
    if (key === 'bgWidth' || key === 'contentWidth') {
      closeLightboxForMutation();
      reinitSlideshow();
      onStateChange();
      return;
    }

    if (key === 'autoplay') {
      syncControlVisibility();
      reinitSlideshow();
    }

    if (key === 'timing') {
      reinitSlideshow();
    }

    if (key === 'pagination' && slideshowHandle) {
      slideshowHandle.syncPagination();
    }

    if (slideshowHandle && (key === 'aspect' || key === 'fit' || key === 'captions')) {
      slideshowHandle.syncLayout();
    }

    onStateChange();
  }

  // ─── Width helpers (no constraints — all bg/content combos are valid) ───

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

  // ─── Builder: color swatch group ───

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

  // ─── Render controls ───

  // 1. Layout picker
  wrapper.appendChild(createLayoutGroup());

  // Section width controls
  wrapper.appendChild(createSegmentedGroup({
    name: 'bgWidth', label: 'Background width', values: BG_WIDTHS,
    labels: { full: 'Full', hug: 'Hug content' },
    initialValue: galleryRoot.dataset.bgWidth,
    onChange: (v) => setControl('bgWidth', v),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'contentWidth', label: 'Content width', values: CONTENT_WIDTHS,
    labels: { full: 'Full', wide: 'Wide', medium: 'Medium', narrow: 'Narrow' },
    initialValue: galleryRoot.dataset.contentWidth,
    onChange: (v) => setControl('contentWidth', v),
    signal, description: 'Visible at wider viewports.',
  }));

  // 2. Images
  wrapper.appendChild(createStepperGroup({
    name: 'images', label: 'Images',
    initialValue: currentImageCount, min: 1, max: totalImages,
    onStep: setImageCount, getDisplayValue: () => String(currentImageCount),
    signal,
  }));

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

  // Subheading
  {
    const subheadingEl = galleryRoot.querySelector<HTMLElement>('.gallery__subheading');
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
    input.value = galleryRoot.dataset.subheading ?? '';
    if (subheadingEl) subheadingEl.textContent = input.value;

    input.addEventListener('input', () => {
      galleryRoot.dataset.subheading = input.value;
      if (subheadingEl) subheadingEl.textContent = input.value;
      onStateChange();
    }, { signal });

    fieldset.appendChild(input);
    wrapper.appendChild(fieldset);
  }

  wrapper.appendChild(createSegmentedGroup({
    name: 'headingAlign', label: 'Heading alignment', values: HEADING_ALIGNS,
    labels: { left: 'Left', center: 'Center', right: 'Right' },
    initialValue: galleryRoot.dataset.headingAlign,
    onChange: (v) => setControl('headingAlign', v),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'columns', label: 'Columns', values: COLUMNS,
    labels: { '2': '2', '3': '3', '4': '4' },
    initialValue: galleryRoot.dataset.columns,
    onChange: (v) => setControl('columns', v),
    signal, description: 'Applies at 768px and above. Smaller screens show 2 columns.',
  }));

  // 4. Spacing
  wrapper.appendChild(createSegmentedGroup({
    name: 'gap', label: 'Spacing', values: GAPS,
    labels: { none: 'None', sm: 'S', md: 'M', lg: 'L' },
    initialValue: galleryRoot.dataset.gap,
    onChange: (v) => setControl('gap', v),
    signal,
  }));

  wrapper.appendChild(createSegmentedGroup({
    name: 'aspect', label: 'Aspect ratio', values: ASPECTS,
    labels: { square: '1:1', landscape: '4:3', portrait: '3:4', auto: 'Auto' },
    initialValue: galleryRoot.dataset.aspect,
    onChange: (v) => setControl('aspect', v),
    signal,
  }));

  // 6. Fill
  wrapper.appendChild(createSegmentedGroup({
    name: 'fit', label: 'Fill', values: FITS,
    labels: { cover: 'Crop to Fill', contain: 'Fit Whole Image' },
    initialValue: galleryRoot.dataset.fit,
    onChange: (v) => setControl('fit', v),
    signal,
  }));

  // 7. Captions
  wrapper.appendChild(createSegmentedGroup({
    name: 'captions', label: 'Captions', values: ['false', 'true'],
    labels: { false: 'Off', true: 'On' },
    initialValue: galleryRoot.dataset.captions,
    onChange: (v) => setControl('captions', v),
    signal,
  }));

  // 8. Lightbox
  wrapper.appendChild(createSegmentedGroup({
    name: 'lightbox', label: 'Lightbox', values: ['false', 'true'],
    labels: { false: 'Off', true: 'On' },
    initialValue: galleryRoot.dataset.lightbox,
    onChange: (v) => setControl('lightbox', v),
    signal,
  }));

  wrapper.appendChild(createLabeledRangeGroup({
    name: 'radius',
    label: 'Border radius',
    steps: IMAGE_RADIUS_STOPS.map((stop) => stop.label),
    initialIndex: getImageRadiusIndex(galleryRoot.dataset.radius),
    onInput: setRadius,
    signal,
  }));

  // 9. Background color
  wrapper.appendChild(createColorGroup('background-color', 'Background', '--gallery-color', '#FFFFFF'));

  // 9. Text color
  wrapper.appendChild(createColorGroup('text-color', 'Text color', '--gallery-accent', '#000000'));

  wrapper.appendChild(createSegmentedGroup({
    name: 'autoplay', label: 'Auto play', values: ['false', 'true'],
    labels: { false: 'Off', true: 'On' },
    initialValue: galleryRoot.dataset.autoplay,
    onChange: (v) => setControl('autoplay', v),
    signal,
  }));

  // 9. Timing (slideshow only, hidden when autoplay off)
  wrapper.appendChild(createSegmentedGroup({
    name: 'timing', label: 'Timing', values: TIMINGS,
    labels: { '2': '2s', '4': '4s', '6': '6s', '8': '8s' },
    initialValue: galleryRoot.dataset.timing,
    onChange: (v) => setControl('timing', v),
    signal,
  }));

  // 10. Pagination (slideshow only)
  wrapper.appendChild(createSegmentedGroup({
    name: 'pagination', label: 'Pagination', values: PAGINATIONS,
    labels: { dots: 'Dots', dashes: 'Dashes', counter: 'Counter', thumbnails: 'Thumbs' },
    initialValue: galleryRoot.dataset.pagination,
    onChange: (v) => setControl('pagination', v),
    signal,
  }));

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
