import {
  VARIANTS, BUTTON_STYLES, ALIGNMENTS, CAPITALIZATIONS, CART_ICONS, LOGO_STYLES, COLORS,
} from './nav.schema';
import type { ControlMap, ColorName, ColorValue } from './nav.schema';
import { resetEphemeralState } from './nav';

// Color display names for labels
const COLOR_LABELS: Record<ColorName, string> = {
  white: 'White',
  black: 'Black',
  yellow: 'Yellow',
  pink: 'Pink',
  lightBlue: 'Light Blue',
  transparent: 'Transparent',
};

export function initControls(navRoot: HTMLElement): () => void {
  const container = document.getElementById('controls-root');
  if (!container) throw new Error('Missing #controls-root');
  const abortController = new AbortController();
  const { signal } = abortController;
  const cartButton = navRoot.querySelector<HTMLButtonElement>('.nav__cart');
  const cartCountBadge = navRoot.querySelector<HTMLElement>('.nav__cart-count');
  const initialCartCount = Number.parseInt(navRoot.dataset.cartCount ?? '0', 10) || 0;

  // ─── Private helpers ───
  function setControl<K extends keyof ControlMap>(key: K, value: ControlMap[K]): void {
    if (key === 'variant') {
      resetEphemeralState(navRoot);
      if (value === 'top') navRoot.dataset.open = 'false';
    }
    navRoot.dataset[key] = value;
  }

  function setColor(target: 'menu' | 'text', value: ColorValue): void {
    navRoot.style.setProperty(target === 'menu' ? '--menu-color' : '--text-color', value);
  }

  function setNavItemCount(rawValue: number): void {
    const count = Number.isFinite(rawValue) ? Math.max(0, Math.min(20, Math.trunc(rawValue))) : 4;
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
          <button class="nav__link" aria-expanded="false" aria-controls="shop-submenu">Shop</button>
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
  const wrapper = document.createElement('div');
  wrapper.className = 'controls';

  // Header
  wrapper.innerHTML = `
    <div class="controls__header">
      <h2 class="controls__title">Navigation</h2>
    </div>
  `;

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

  // 7. Capitalization
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
  wrapper.appendChild(createNumberInputGroup('cart-count', 'Cart count', initialCartCount, setCartCount));

  // 10. Nav item count
  wrapper.appendChild(createNumberInputGroup('nav-items', 'Nav items', 4, setNavItemCount));

  container.appendChild(wrapper);
  setCartCount(initialCartCount);

  // ─── Wire viewport buttons ───
  const viewportBtns = document.querySelectorAll<HTMLButtonElement>('[data-viewport]');
  const preview = document.getElementById('preview-root');
  viewportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.viewport!;
      if (preview) {
        preview.style.width = w === 'fluid' ? '100%' : `${w}px`;
      }
      resetEphemeralState(navRoot);
      // Update pressed state
      viewportBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    }, { signal });
  });
  // Set initial viewport state
  viewportBtns.forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.viewport === '375' ? 'true' : 'false');
  });

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
    };

    for (const v of VARIANTS) {
      const label = document.createElement('label');
      label.className = 'variant-thumb';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'variant';
      input.value = v;
      input.checked = v === 'simple';
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
    fieldset.innerHTML = `<legend class="control-group__label">${label}</legend>`;

    const options = document.createElement('div');
    options.className = 'control-group__options--swatches';

    const defaultColor: ColorName = target === 'menu' ? 'black' : 'white';
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
      input.checked = colorName === defaultColor;
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
      input.checked = v === values[0];
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
  ): HTMLFieldSetElement {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'control-group';
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
      input.value = navRoot.dataset.cartCount ?? '0';
    }, { signal });

    fieldset.appendChild(input);
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

  return () => {
    abortController.abort();
    wrapper.remove();
  };
}
