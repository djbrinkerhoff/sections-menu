import { initSlideshow } from './gallery.slideshow';
import type { SlideshowHandle } from './gallery.slideshow';
import { initImageLightbox } from './image.lightbox';
import { applyImageRadius, getImageRadiusIndex, IMAGE_RADIUS_STOPS } from './image-radius';
import { COLORS, COLOR_LABELS } from './colors';
import type { ColorName, ColorValue } from './colors';
import { createStepperGroup, createSegmentedGroup } from './control-builders';
import { createLabeledRangeGroup } from './range-control';

// ─── Image set data ───

interface GalleryImageDef {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
}

const IMAGE_SETS: Record<string, { label: string; images: GalleryImageDef[] }> = {
  unsplash: {
    label: 'Unsplash',
    images: [
      { src: '/images/alexander-korte-Oj0ykWKf5To-unsplash.jpg', alt: 'Film photograph by Alexander Korte', width: 1200, height: 795, caption: 'Alexander Korte' },
      { src: '/images/brave-sneakers-HPW_Hjzw6ZA-unsplash.jpg', alt: 'Film photograph by Brave Sneakers', width: 1200, height: 800, caption: 'Brave Sneakers' },
      { src: '/images/bruce-barrow-9dmb89VrlsQ-unsplash.jpg', alt: 'Film photograph by Bruce Barrow', width: 1200, height: 860, caption: 'Bruce Barrow' },
      { src: '/images/bruce-barrow-n-CpmMFXj9s-unsplash.jpg', alt: 'Film photograph by Bruce Barrow', width: 1200, height: 1673, caption: 'Bruce Barrow' },
      { src: '/images/john-zhou-KTPoP4cyAdw-unsplash.jpg', alt: 'Film photograph by John Zhou', width: 1200, height: 1810, caption: 'John Zhou' },
      { src: '/images/lei-hwang-K59VVouNOaE-unsplash.jpg', alt: 'Film photograph by Lei Hwang', width: 1200, height: 783, caption: 'Lei Hwang' },
      { src: '/images/maximilian-bungart-QzlQHPG7cUY-unsplash.jpg', alt: 'Film photograph by Maximilian Bungart', width: 1200, height: 1790, caption: 'Maximilian Bungart' },
      { src: '/images/severin-demchuk-jllQYsBvFnA-unsplash.jpg', alt: 'Film photograph by Severin Demchuk', width: 1200, height: 1771, caption: 'Severin Demchuk' },
      { src: '/images/tanya-barrow-4fmlPygqRmo-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 1794, caption: 'Tanya Barrow' },
      { src: '/images/tanya-barrow-bXXEC99WyI8-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 1794, caption: 'Tanya Barrow' },
      { src: '/images/tanya-barrow-O90NM4fkFg8-unsplash.jpg', alt: 'Film photograph by Tanya Barrow', width: 1200, height: 802, caption: 'Tanya Barrow' },
      { src: '/images/tom-caillarec-lv6Z1Ae4Jhg-unsplash.jpg', alt: 'Film photograph by Tom Caillarec', width: 1200, height: 800, caption: 'Tom Caillarec' },
    ],
  },
  'seller-1': {
    label: 'Seller 1',
    images: [
      { src: '/images/seller-1/20251009_1936_Sensual_Perfume_Mist_simple_compose_01k75rpm24esgsct20y87k31gj_with_bgc.png.webp', alt: 'Sensual Perfume Mist', width: 1200, height: 1200, caption: 'Sensual Perfume Mist' },
      { src: '/images/seller-1/20251009_1943_Elegant_Perfume_Mist_simple_compose_01k75s2q2yf5a9gw19htd56f2d_with_bgc.png.webp', alt: 'Elegant Perfume Mist', width: 1200, height: 1200, caption: 'Elegant Perfume Mist' },
      { src: '/images/seller-1/20251009_1943_Elegant_Perfume_Mist_simple_compose_01k75s2q2zehbscrpscenev84w_with_bgc.png.webp', alt: 'Elegant Perfume Mist variant', width: 1200, height: 1200, caption: 'Elegant Perfume Mist' },
      { src: '/images/seller-1/20251009_1947_Perfume_Mist_Elegance_simple_compose_01k75sb2xefm381k705z7ffm47_with_bgc.png.webp', alt: 'Perfume Mist Elegance', width: 1200, height: 1200, caption: 'Perfume Mist Elegance' },
      { src: '/images/seller-1/20251009_1957_PerfumeMistElegance_simple_compose_01k75svvbnea5syc5j6b4ngy1k_with_bgc.png.webp', alt: 'Perfume Mist Elegance angle', width: 1200, height: 1200, caption: 'Perfume Mist Elegance' },
      { src: '/images/seller-1/20251009_1957_PerfumeMistElegance_simple_compose_01k75svvbnea5syc5j6b4ngy1k_with_bgc+_1_.png.webp', alt: 'Perfume Mist Elegance detail', width: 1200, height: 1200, caption: 'Perfume Mist Elegance' },
      { src: '/images/seller-1/20251009_1959_Elegant_Perfume_Mist_simple_compose_01k75szcmyfsztxb5swtvfed2j_with_bgc.png.webp', alt: 'Elegant Perfume Mist close-up', width: 1200, height: 1200, caption: 'Elegant Perfume Mist' },
      { src: '/images/seller-1/20251009_2001_Perfume_Mist_Elegance_simple_compose_01k75t3dkvfq3sssext7xbmykm_with_bgc.png.webp', alt: 'Perfume Mist Elegance studio', width: 1200, height: 1200, caption: 'Perfume Mist Elegance' },
    ],
  },
  'seller-2': {
    label: 'Seller 2',
    images: [
      { src: '/images/seller-2/1000009297.jpg.webp', alt: 'Seller 2 product photo', width: 1200, height: 1200, caption: '' },
      { src: '/images/seller-2/1000034493.jpg.webp', alt: 'Seller 2 product photo', width: 1200, height: 1200, caption: '' },
      { src: '/images/seller-2/IMG_20230621_174447__01__02.jpg.webp', alt: 'Seller 2 product photo', width: 1200, height: 1200, caption: '' },
    ],
  },
};

const IMAGE_SET_IDS = Object.keys(IMAGE_SETS);

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

  const gridEl = galleryRoot.querySelector<HTMLElement>('.gallery__grid');
  if (!gridEl) throw new Error('Gallery controls: .gallery__grid not found');
  const grid: HTMLElement = gridEl;

  let currentSetId = galleryRoot.dataset.imageSet ?? 'unsplash';
  let allItems = Array.from(galleryRoot.querySelectorAll<HTMLElement>('.gallery__item'));
  let totalImages = allItems.length;
  let currentImageCount = Number(galleryRoot.dataset.images) || totalImages;

  function buildGalleryItems(setId: string): void {
    const set = IMAGE_SETS[setId];
    if (!set) return;
    grid.innerHTML = '';
    for (const img of set.images) {
      const figure = document.createElement('figure');
      figure.className = 'gallery__item';

      const trigger = document.createElement('button');
      trigger.className = 'gallery__trigger image-lightbox__trigger';
      trigger.type = 'button';
      trigger.dataset.zoomTarget = 'true';
      trigger.dataset.zoomGroup = 'gallery';

      const image = document.createElement('img');
      image.className = 'gallery__image';
      image.src = img.src;
      image.alt = img.alt;
      image.width = img.width;
      image.height = img.height;
      image.loading = 'lazy';

      const caption = document.createElement('figcaption');
      caption.className = 'gallery__caption';
      caption.textContent = img.caption;

      trigger.appendChild(image);
      figure.appendChild(trigger);
      figure.appendChild(caption);
      grid.appendChild(figure);
    }
    allItems = Array.from(grid.querySelectorAll<HTMLElement>('.gallery__item'));
    totalImages = allItems.length;
  }

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

  // Build initial image set (always rebuild from data so sets restore correctly)
  buildGalleryItems(currentSetId);
  currentImageCount = Math.min(currentImageCount, totalImages);
  galleryRoot.dataset.images = String(currentImageCount);
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

  // 2. Image set picker
  {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = 'imageSet';
    fieldset.innerHTML = `<legend class="control-group__label">Image set</legend>`;

    const select = document.createElement('select');
    select.className = 'control-group__input';
    select.name = 'imageSet';
    select.ariaLabel = 'Image set';

    for (const id of IMAGE_SET_IDS) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = IMAGE_SETS[id]?.label ?? id;
      select.appendChild(opt);
    }
    select.value = currentSetId;
    select.addEventListener('change', () => setImageSet(select.value), { signal });

    fieldset.appendChild(select);
    wrapper.appendChild(fieldset);
  }

  // 3. Image count stepper (recreated when set changes)
  let stepperFieldset = createStepperGroup({
    name: 'images', label: 'Images',
    initialValue: currentImageCount, min: 1, max: totalImages,
    onStep: setImageCount, getDisplayValue: () => String(currentImageCount),
    signal,
  });
  wrapper.appendChild(stepperFieldset);

  function rebuildStepper(): void {
    const newFieldset = createStepperGroup({
      name: 'images', label: 'Images',
      initialValue: currentImageCount, min: 1, max: totalImages,
      onStep: setImageCount, getDisplayValue: () => String(currentImageCount),
      signal,
    });
    stepperFieldset.replaceWith(newFieldset);
    stepperFieldset = newFieldset;
  }

  function setImageSet(setId: string): void {
    closeLightboxForMutation();
    if (slideshowHandle) {
      slideshowHandle.cleanup();
      slideshowHandle = null;
    }
    currentSetId = setId;
    galleryRoot.dataset.imageSet = setId;
    buildGalleryItems(setId);
    currentImageCount = Math.min(currentImageCount, totalImages);
    galleryRoot.dataset.images = String(currentImageCount);
    syncImageVisibility();
    rebuildStepper();
    if (galleryRoot.dataset.layout === 'slideshow') {
      slideshowHandle = initSlideshow(galleryRoot, signal);
    }
    onStateChange();
  }

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
