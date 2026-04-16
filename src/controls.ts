import {
  VARIANTS, BUTTON_STYLES, ALIGNMENTS, CAPITALIZATIONS, CART_ICONS, LOGO_STYLES, COLORS,
  BORDER_RADIUS_STEPS,
} from './nav.schema';
import type { ControlMap, ColorName, ColorValue, Variant } from './nav.schema';
import { resetEphemeralState } from './nav';

// Controls hidden per variant (extensible — add entries as needed)
const HIDDEN_CONTROLS: Partial<Record<Variant, string[]>> = {
  top: ['button-style'],
  sidebar: ['inset', 'border-radius', 'alignment'],
  tile: ['inset', 'logo-style', 'alignment', 'button-style'],
};

// Color display names for labels
const COLOR_LABELS: Record<ColorName, string> = {
  white: 'White',
  black: 'Black',
  yellow: 'Yellow',
  pink: 'Pink',
  red: 'Red',
  blue: 'Blue',
  transparent: 'Transparent',
};

export function initControls(navRoot: HTMLElement, container: HTMLElement) {
  const abortController = new AbortController();
  const { signal } = abortController;
  const cartButton = navRoot.querySelector<HTMLButtonElement>('.nav__cart');
  const cartCountBadge = navRoot.querySelector<HTMLElement>('.nav__cart-count');
  const initialCartCount = Number.parseInt(navRoot.dataset.cartCount ?? '0', 10) || 0;

  // ─── Render wrapper (hoisted for use in helpers) ───
  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  // ─── Private helpers ───
  function syncControlVisibility(): void {
    const variant = (navRoot.dataset.variant ?? 'simple') as Variant;
    const hidden = HIDDEN_CONTROLS[variant] ?? [];
    for (const el of wrapper.querySelectorAll<HTMLFieldSetElement>('[data-control]')) {
      const controlName = el.dataset.control;
      if (controlName) el.hidden = hidden.includes(controlName);
    }
  }

  function setControl<K extends keyof ControlMap>(key: K, value: ControlMap[K]): void {
    if (key === 'variant') {
      resetEphemeralState(navRoot);
      if (value === 'top' || value === 'tile') navRoot.dataset.open = 'false';
    }
    navRoot.dataset[key] = value;
    if (key === 'inset') {
      const on = value === 'true';
      navRoot.style.setProperty('--nav-inset', on ? '16px' : '0px');
    }
    if (key === 'variant') {
      syncControlVisibility();
      if (value === 'sidebar' || value === 'tile') {
        navRoot.dataset.alignment = 'left';
        const radio = wrapper.querySelector<HTMLInputElement>('input[name="alignment"][value="left"]');
        if (radio) radio.checked = true;
      }
    }
  }

  // APCA-based band mix: tint the link-row band toward the text color,
  // scaling the percentage so low-contrast pairs get more tinting.
  let currentMenuHex = navRoot.style.getPropertyValue('--menu-color').trim() || '#000000';
  let currentTextHex = navRoot.style.getPropertyValue('--text-color').trim() || '#FFFFFF';

  function hexToRGB(hex: string): [number, number, number] {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  function apcaY(r: number, g: number, b: number): number {
    return 0.2126729 * (r / 255) ** 2.4
         + 0.7151522 * (g / 255) ** 2.4
         + 0.0721750 * (b / 255) ** 2.4;
  }

  function apcaLc(txtY: number, bgY: number): number {
    const sc = (y: number) => y > 0.022 ? y : y + (0.022 - y) ** 1.414;
    const tYc = sc(txtY);
    const bYc = sc(bgY);
    if (Math.abs(bYc - tYc) < 0.0005) return 0;
    if (bYc > tYc) {
      const s = (bYc ** 0.56 - tYc ** 0.57) * 1.14;
      return s < 0.1 ? 0 : s - 0.027;
    }
    const s = (bYc ** 0.65 - tYc ** 0.62) * 1.14;
    return s > -0.1 ? 0 : s + 0.027;
  }

  function syncBandMix(): void {
    if (!currentMenuHex.startsWith('#') || !currentTextHex.startsWith('#')) return;
    const [mr, mg, mb] = hexToRGB(currentMenuHex);
    const [tr, tg, tb] = hexToRGB(currentTextHex);
    const menuY = apcaY(mr, mg, mb);
    const absLc = Math.abs(apcaLc(apcaY(tr, tg, tb), menuY)) * 100;
    // Base: high contrast (Lc≈106) → 5%; low contrast (Lc≈0) → 20%
    let mix = 20 - (absLc / 106) * 15;
    // Dark menus need more mixing to produce a visible shift
    mix += (1 - Math.min(menuY * 4, 1)) * 12;
    navRoot.style.setProperty('--band-mix', `${Math.round(Math.max(5, Math.min(30, mix)))}%`);
  }

  function setColor(target: 'menu' | 'text', value: ColorValue): void {
    navRoot.style.setProperty(target === 'menu' ? '--menu-color' : '--text-color', value);
    if (target === 'menu') currentMenuHex = value;
    else currentTextHex = value;
    syncBandMix();
  }

  syncBandMix();

  const navList = navRoot.querySelector<HTMLUListElement>('.nav__list');
  let currentNavItemCount = navList ? navList.children.length : 4;

  function setNavItemCount(rawValue: number): void {
    const count = Number.isFinite(rawValue) ? Math.max(0, Math.min(20, Math.trunc(rawValue))) : 4;
    currentNavItemCount = count;
    const list = navRoot.querySelector<HTMLUListElement>('.nav__list');
    if (!list) return;

    resetEphemeralState(navRoot);
    list.innerHTML = '';

    for (let i = 1; i <= count; i++) {
      const li = document.createElement('li');

      if (i === 2) {
        // Shop submenu item
        li.className = 'nav__item nav__item--has-submenu';
        li.innerHTML = `
          <button class="nav__link" aria-expanded="false" aria-controls="shop-submenu">
            Shop
            <span class="nav__submenu-icon" data-glyph="chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="2.5,4.5 6,8 9.5,4.5"/>
              </svg>
            </span>
            <span class="nav__submenu-icon" data-glyph="plus" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <line x1="6" y1="2" x2="6" y2="10"/>
                <line x1="2" y1="6" x2="10" y2="6"/>
              </svg>
            </span>
          </button>
          <ul id="shop-submenu" class="nav__submenu" hidden>
            <li><a class="nav__submenu-link" href="#">Category One</a></li>
            <li><a class="nav__submenu-link" href="#">Category Two</a></li>
            <li><a class="nav__submenu-link" href="#">Category Three</a></li>
            <li><a class="nav__submenu-link" href="#">Category Four</a></li>
            <li><a class="nav__submenu-link" href="#">Category Five</a></li>
          </ul>`;
      } else {
        li.className = 'nav__item';
        const name = i === 1 ? 'Home' : `Page ${i}`;
        li.innerHTML = `<a class="nav__link" href="#">${name}</a>`;
      }

      list.appendChild(li);
    }
  }

  function setCartCount(rawValue: number): void {
    const count = Number.isFinite(rawValue) ? Math.max(0, Math.trunc(rawValue)) : 0;
    navRoot.dataset.cartCount = String(count);

    if (cartCountBadge) {
      cartCountBadge.textContent = String(count);
      cartCountBadge.hidden = count <= 0;
    }

    if (cartButton) {
      if (count > 0) {
        cartButton.setAttribute('aria-label', `Open cart, ${count} ${count === 1 ? 'item' : 'items'}`);
      } else {
        cartButton.setAttribute('aria-label', 'Open cart');
      }
    }
  }

  // ─── Render ───

  // 1. Style (variant) — 2x2 thumbnail grid (hero section)
  wrapper.appendChild(createVariantGroup());

  // 2. Logo style
  wrapper.appendChild(createSegmentedGroup(
    'logo-style', 'Logo', LOGO_STYLES,
    { small: 'Horizontal', stacked: 'Stacked' },
    'logoStyle',
  ));

  // 3. Menu color + 4. Text color (grouped)
  wrapper.appendChild(createColorGroup('menu-color', 'Menu color', 'menu'));
  wrapper.appendChild(createColorGroup('text-color', 'Text color', 'text'));

  // 5. Button style
  wrapper.appendChild(createSegmentedGroup(
    'button-style', 'Button style', BUTTON_STYLES,
    { hamburger: hamburgerIcon(), plus: plusIcon(), text: 'Menu' },
    'buttonStyle',
  ));

  // 6. Logo position (alignment)
  wrapper.appendChild(createSegmentedGroup(
    'alignment', 'Logo position', ALIGNMENTS,
    { left: alignLeftIcon(), center: alignCenterIcon(), right: alignRightIcon() },
    'alignment',
  ));

  // 7. Inset
  wrapper.appendChild(createSegmentedGroup(
    'inset', 'Inset', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'inset',
  ));

  // 7b. Social links
  wrapper.appendChild(createSegmentedGroup(
    'social-links', 'Social links', ['false', 'true'] as const,
    { false: 'Off', true: 'On' },
    'socialLinks',
  ));

  // 8. Border radius
  const initialBorderRadius = Number.parseInt(navRoot.dataset.borderRadius ?? '0', 10) || 0;
  wrapper.appendChild(createRangeGroup(
    'border-radius', 'Border radius', BORDER_RADIUS_STEPS,
    (stepIndex) => {
      const value = BORDER_RADIUS_STEPS[stepIndex];
      if (value !== undefined) {
        navRoot.style.setProperty('--border-radius', value);
        navRoot.dataset.borderRadius = String(stepIndex);
      }
    },
    initialBorderRadius,
  ));

  // 9. Capitalization
  wrapper.appendChild(createSegmentedGroup(
    'capitalization', 'Capitalization', CAPITALIZATIONS,
    { normal: 'Aa', lowercase: 'a↓', uppercase: 'A↑' },
    'capitalization',
  ));

  // 8. Cart icon
  wrapper.appendChild(createSegmentedGroup(
    'cart-icon', 'Cart icon', CART_ICONS,
    { cart: cartIcon(), bag: bagIcon() },
    'cartIcon',
  ));

  // 9. Cart count
  wrapper.appendChild(createNumberInputGroup('cart-count', 'Cart count', initialCartCount, setCartCount, () => navRoot.dataset.cartCount ?? '0'));

  // 10. Nav item count
  wrapper.appendChild(createNumberInputGroup('nav-items', 'Nav items', currentNavItemCount, setNavItemCount, () => String(currentNavItemCount)));

  container.appendChild(wrapper);
  setCartCount(initialCartCount);
  syncControlVisibility();

  // ─── Helpers: create control groups ───

  function createVariantGroup(): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group control-group--style';
    fieldset.innerHTML = `<legend class="control-group__label">Style</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options';

    const previews: Record<string, string> = {
      simple: `<svg viewBox="0 0 56 36" fill="none"><rect width="56" height="7" rx="1" fill="currentColor" opacity=".3"/><line x1="0" y1="9" x2="56" y2="9" stroke="currentColor" opacity=".12"/><rect x="2" y="12" width="14" height="2" rx=".5" fill="currentColor" opacity=".2"/><rect x="18" y="12" width="11" height="2" rx=".5" fill="currentColor" opacity=".2"/><rect x="31" y="12" width="13" height="2" rx=".5" fill="currentColor" opacity=".2"/></svg>`,
      fullscreen: `<svg viewBox="0 0 56 36" fill="none"><rect width="56" height="36" rx="1.5" fill="currentColor" opacity=".1"/><rect x="14" y="11" width="28" height="3.5" rx=".5" fill="currentColor" opacity=".3"/><rect x="17" y="18" width="22" height="3" rx=".5" fill="currentColor" opacity=".22"/><rect x="20" y="24" width="16" height="3" rx=".5" fill="currentColor" opacity=".15"/></svg>`,
      sidebar: `<svg viewBox="0 0 56 36" fill="none"><rect width="56" height="7" rx="1" fill="currentColor" opacity=".3"/><rect y="7" width="20" height="29" fill="currentColor" opacity=".1"/><rect x="3" y="11" width="14" height="2" rx=".5" fill="currentColor" opacity=".22"/><rect x="3" y="16" width="11" height="2" rx=".5" fill="currentColor" opacity=".18"/><rect x="3" y="21" width="13" height="2" rx=".5" fill="currentColor" opacity=".15"/></svg>`,
      top: `<svg viewBox="0 0 56 36" fill="none"><rect width="56" height="9" rx="1" fill="currentColor" opacity=".3"/><rect x="2" y="2.5" width="8" height="4" rx=".5" fill="currentColor" opacity=".35"/><rect x="12" y="3" width="8" height="3" rx=".5" fill="currentColor" opacity=".18"/><rect x="22" y="3" width="10" height="3" rx=".5" fill="currentColor" opacity=".18"/><rect x="34" y="3" width="7" height="3" rx=".5" fill="currentColor" opacity=".18"/><rect x="43" y="3" width="11" height="3" rx=".5" fill="currentColor" opacity=".18"/></svg>`,
      tile: `<svg viewBox="0 0 56 36" fill="none"><rect width="56" height="7" rx="1" fill="currentColor" opacity=".3"/><rect x="2" y="10" width="25" height="11" rx="1" fill="currentColor" opacity=".22"/><rect x="29" y="10" width="25" height="11" rx="1" fill="currentColor" opacity=".22"/><rect x="2" y="23" width="25" height="11" rx="1" fill="currentColor" opacity=".15"/><rect x="29" y="23" width="25" height="11" rx="1" fill="currentColor" opacity=".15"/></svg>`,
    };

    for (const v of VARIANTS) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'variant';
      input.value = v;
      input.checked = v === (navRoot.dataset.variant ?? 'simple');
      input.addEventListener('change', () => setControl('variant', v), { signal });

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

  function createColorGroup(
    name: string,
    label: string,
    target: 'menu' | 'text',
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--swatches';

    const currentValue = navRoot.style.getPropertyValue(
      target === 'menu' ? '--menu-color' : '--text-color',
    ).trim().toUpperCase() || (target === 'menu' ? '#000000' : '#FFFFFF');
    const colorEntries = Object.entries(COLORS).filter(([colorName]) => {
      return !(target === 'text' && colorName === 'transparent');
    }) as [ColorName, ColorValue][];

    for (const [colorName, colorValue] of colorEntries) {
      const labelEl = document.createElement('label');
      labelEl.className = colorName === 'transparent' ? 'swatch swatch--transparent' : 'swatch';

      if (colorName !== 'transparent') {
        labelEl.style.backgroundColor = colorValue;
      }

      labelEl.title = COLOR_LABELS[colorName];

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = colorValue;
      input.checked = colorValue.toUpperCase() === currentValue;
      input.ariaLabel = COLOR_LABELS[colorName];
      input.addEventListener('change', () => setColor(target, colorValue), { signal });

      labelEl.appendChild(input);
      options.appendChild(labelEl);
    }

    fieldset.appendChild(options);
    return fieldset;
  }

  function createSegmentedGroup<T extends readonly string[]>(
    name: string,
    label: string,
    values: T,
    labels: Record<string, string>,
    controlKey: keyof ControlMap,
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
      input.checked = v === (navRoot.dataset[controlKey] ?? values[0]);
      input.addEventListener('change', () => {
        setControl(controlKey, v as ControlMap[typeof controlKey]);
      }, { signal });

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

  function createNumberInputGroup(
    name: string,
    label: string,
    initialValue: number,
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
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.value = String(initialValue);
    input.addEventListener('input', () => {
      onInput(Number.parseInt(input.value, 10) || 0);
    }, { signal });
    input.addEventListener('blur', () => {
      input.value = getDisplayValue();
    }, { signal });

    fieldset.appendChild(input);
    return fieldset;
  }

  function createRangeGroup(
    name: string,
    label: string,
    steps: readonly string[],
    onInput: (stepIndex: number) => void,
    initialIndex = 0,
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
    fieldset.dataset.control = name;
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const range = document.createElement('input');
    range.className = 'control-group__range';
    range.type = 'range';
    range.name = name;
    range.min = '0';
    range.max = String(steps.length - 1);
    range.step = '1';
    range.value = String(initialIndex);
    range.ariaLabel = label;
    range.addEventListener('input', () => {
      onInput(Number.parseInt(range.value, 10));
    }, { signal });

    const labels = document.createElement('div');
    labels.className = 'control-group__range-labels';
    labels.innerHTML = `<span>Sharp</span><span>Full</span>`;

    fieldset.appendChild(range);
    fieldset.appendChild(labels);
    return fieldset;
  }

  // ─── SVG icon helpers ───

  function hamburgerIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  }

  function plusIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`;
  }

  function alignLeftIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>`;
  }

  function alignCenterIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;
  }

  function alignRightIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>`;
  }

  function cartIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`;
  }

  function bagIcon(): string {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
  }

  return {
    cleanup() {
      abortController.abort();
      wrapper.remove();
    },
    setNavItemCount,
    setCartCount,
    get navItemCount() { return currentNavItemCount; },
  };
}

export type ControlsHandle = ReturnType<typeof initControls>;
