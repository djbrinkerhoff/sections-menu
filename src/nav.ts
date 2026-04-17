// Shared nav behavior: menu toggle, search, submenu, cart dialog,
// sidebar outside-click, escape, inert counter, ephemeral state reset.

// ─── Preview element (set once by initNavBehavior) ───
let previewEl: HTMLElement | null = null;

// ─── Inert reference counter ───
let inertDepth = 0;

function applyInert(on: boolean): void {
  // Inert applies to preview content siblings of the nav, never the controls panel
  if (!previewEl) return;
  for (const child of Array.from(previewEl.children)) {
    if (!child.classList.contains('nav') && !child.matches('dialog')) {
      if (on) {
        child.setAttribute('inert', '');
      } else {
        child.removeAttribute('inert');
      }
    }
  }
}

export function inertPush(): void {
  if (inertDepth++ === 0) applyInert(true);
}

export function inertPop(): void {
  if (--inertDepth <= 0) {
    inertDepth = 0;
    applyInert(false);
  }
}

export function inertReset(): void {
  inertDepth = 0;
  applyInert(false);
}

function getCartDialog(): HTMLDialogElement | null {
  const el = document.getElementById('cart-drawer');
  if (!el || typeof HTMLDialogElement === 'undefined') return null;
  return el instanceof HTMLDialogElement ? el : null;
}

function closeSearch(root: HTMLElement, { restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
  const searchBtn = root.querySelector<HTMLButtonElement>('.nav__search-toggle');
  const searchForm = root.querySelector<HTMLFormElement>('.nav__search');
  const searchInput = root.querySelector<HTMLInputElement>('.nav__search-input');

  if (searchBtn) {
    searchBtn.setAttribute('aria-expanded', 'false');
    searchBtn.setAttribute('aria-label', 'Open search');
  }
  if (searchForm) searchForm.removeAttribute('data-search-open');
  searchInput?.blur();

  if (restoreFocus && searchBtn) {
    searchBtn.focus();
  }
}

function openSearch(root: HTMLElement, { focusInput = true }: { focusInput?: boolean } = {}): void {
  const searchBtn = root.querySelector<HTMLButtonElement>('.nav__search-toggle');
  const searchForm = root.querySelector<HTMLFormElement>('.nav__search');
  const searchInput = root.querySelector<HTMLInputElement>('.nav__search-input');

  if (searchBtn) {
    searchBtn.setAttribute('aria-expanded', 'true');
    searchBtn.setAttribute('aria-label', 'Close search');
  }
  if (searchForm) searchForm.setAttribute('data-search-open', 'true');

  if (focusInput) {
    searchInput?.focus();
  }
}

function getInlineNavWidth(list: HTMLElement): number {
  const styles = getComputedStyle(list);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
  const itemWidths = Array.from(list.children).map((item) => {
    const trigger = item.firstElementChild;
    return trigger instanceof HTMLElement ? trigger.getBoundingClientRect().width : 0;
  });

  return itemWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(itemWidths.length - 1, 0);
}

// ─── Shared inline-state measurement ───
// Each variant checks whether its nav links fit in a single masthead row.
// The measurement logic is shared; per-variant differences are in the
// callers (guards, pre-measurement DOM mutations, gap counts).

interface NavMeasurements {
  contentWidth: number;
  fixedWidth: number;
  linkWidth: number;
  socialWidth: number;
  gap: number;
}

function measureNavElements(root: HTMLElement): NavMeasurements | null {
  const inner = root.querySelector<HTMLElement>('.nav__inner');
  const list = root.querySelector<HTMLElement>('.nav__list');
  const logo = root.querySelector<HTMLElement>('.nav__logo');
  const search = root.querySelector<HTMLElement>('.nav__search');
  const cart = root.querySelector<HTMLElement>('.nav__cart');

  if (!inner || !list || !logo || !search || !cart) return null;

  const styles = getComputedStyle(inner);
  const paddingInline =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
  const contentWidth = inner.clientWidth - paddingInline;
  const fixedWidth =
    logo.getBoundingClientRect().width +
    search.getBoundingClientRect().width +
    cart.getBoundingClientRect().width;
  const linkWidth = getInlineNavWidth(list);
  const social = root.querySelector<HTMLElement>('.nav__social');
  const socialWidth =
    social && root.dataset.socialLinks === 'true'
      ? social.getBoundingClientRect().width
      : 0;

  return { contentWidth, fixedWidth, linkWidth, socialWidth, gap };
}

// Hysteresis: require extra clearance to promote, collapse immediately.
function shouldInline(wasInline: boolean, availableWidth: number, linkWidth: number): boolean {
  return wasInline
    ? availableWidth >= linkWidth
    : availableWidth >= linkWidth + 16;
}

function syncTopInlineState(root: HTMLElement): void {
  if (root.dataset.variant !== 'top') {
    delete root.dataset.topInline;
    return;
  }

  if (root.dataset.alignment === 'center') {
    root.dataset.topInline = 'false';
    return;
  }

  const m = measureNavElements(root);
  if (!m) {
    root.dataset.topInline = 'false';
    return;
  }

  const socialGap = m.socialWidth > 0 ? 16 : 0;
  const availableWidth = m.contentWidth - m.fixedWidth - m.socialWidth - socialGap - m.gap * 3;
  const newValue = shouldInline(root.dataset.topInline === 'true', availableWidth, m.linkWidth)
    ? 'true' : 'false';
  if (root.dataset.topInline !== newValue) {
    root.dataset.topInline = newValue;
  }
}

function syncSimpleInlineState(root: HTMLElement): void {
  if (root.dataset.variant !== 'simple') {
    delete root.dataset.simpleInline;
    return;
  }
  if (root.dataset.open === 'true') return;
  if (root.clientWidth < 768) {
    root.dataset.simpleInline = 'false';
    return;
  }

  // Force inline state so links are visible and measurable
  const prev = root.dataset.simpleInline;
  root.dataset.simpleInline = 'true';

  const m = measureNavElements(root);
  if (!m) {
    root.dataset.simpleInline = 'false';
    return;
  }

  const socialGap = m.socialWidth > 0 ? m.gap : 0;
  const availableWidth = m.contentWidth - m.fixedWidth - m.socialWidth - socialGap - m.gap * 2;
  root.dataset.simpleInline = shouldInline(prev === 'true', availableWidth, m.linkWidth)
    ? 'true' : 'false';
}

function syncTileInlineState(root: HTMLElement): void {
  if (root.dataset.variant !== 'tile') {
    delete root.dataset.tileInline;
    return;
  }
  if (root.dataset.open === 'true') return;
  if (root.clientWidth < 768) {
    root.dataset.tileInline = 'false';
    return;
  }

  // Force inline state so primary/links are visible and measurable
  const prev = root.dataset.tileInline;
  root.dataset.tileInline = 'true';

  // Temporarily remove flex-equal constraint on tile items
  // so getInlineNavWidth returns natural content widths, not the
  // equal-distribution widths imposed by flex: 1 1 0%.
  const list = root.querySelector<HTMLElement>('.nav__list');
  if (!list) {
    root.dataset.tileInline = 'false';
    return;
  }
  const items = Array.from(list.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  const savedFlex = items.map(item => item.style.flex);
  items.forEach(item => { item.style.flex = '0 0 auto'; });

  const m = measureNavElements(root);

  // Restore flex before any early return
  items.forEach((item, i) => { item.style.flex = savedFlex[i] ?? ''; });

  if (!m) {
    root.dataset.tileInline = 'false';
    return;
  }

  const primary = root.querySelector<HTMLElement>('.nav__primary');
  const primaryStyles = primary ? getComputedStyle(primary) : null;
  const primaryGap = primaryStyles
    ? Number.parseFloat(primaryStyles.columnGap || primaryStyles.gap || '0') || 0
    : 0;
  const socialGap = m.socialWidth > 0 ? primaryGap : 0;
  const availableWidth = m.contentWidth - m.fixedWidth - m.socialWidth - socialGap - m.gap * 2;

  root.dataset.tileInline = shouldInline(prev === 'true', availableWidth, m.linkWidth)
    ? 'true' : 'false';
}

// ─── Submenu relocation for top variant ───
// The top variant needs the submenu as a direct child of nav__inner
// to render it as a full-width horizontal row below the link strip.
// (Inside nav__primary it would be clipped by overflow-x: auto.)
let submenuOriginalParent: HTMLElement | null = null;

function relocateSubmenuForTop(root: HTMLElement, submenu: HTMLElement): void {
  const inner = root.querySelector<HTMLElement>('.nav__inner');
  if (!inner || submenu.parentElement === inner) return;
  submenuOriginalParent = submenu.parentElement;
  inner.appendChild(submenu);
}

function restoreSubmenuPosition(submenu: HTMLElement): void {
  if (submenuOriginalParent && submenu.parentElement !== submenuOriginalParent) {
    submenuOriginalParent.appendChild(submenu);
  }
  submenuOriginalParent = null;
}

function closeShopSubmenu(root: HTMLElement, { restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
  const shopSubmenu = root.querySelector<HTMLElement>('#shop-submenu');

  if (shopBtn) {
    shopBtn.setAttribute('aria-expanded', 'false');
  }
  if (shopSubmenu) {
    shopSubmenu.setAttribute('hidden', '');
    restoreSubmenuPosition(shopSubmenu);
  }

  if (restoreFocus && shopBtn) {
    shopBtn.focus();
  }
}

// ─── Rapid double-click guard ───
let animating = false;
let animatingTimeout: ReturnType<typeof setTimeout> | null = null;

function guardedToggle(fn: () => void): void {
  if (animating) return;
  animating = true;
  fn();
  // Clear after transition duration (200ms) + buffer
  if (animatingTimeout !== null) clearTimeout(animatingTimeout);
  animatingTimeout = setTimeout(() => {
    animating = false;
    animatingTimeout = null;
  }, 250);
}

// ─── Ephemeral state reset ───
export function resetEphemeralState(root: HTMLElement): void {
  // Close menu
  root.dataset.open = 'false';
  const toggle = root.querySelector<HTMLButtonElement>('.nav__menu-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menu');
  }

  // Collapse search
  closeSearch(root);

  // Close Shop submenu
  closeShopSubmenu(root);

  // Close cart dialog
  closeCartDrawer({ restoreFocus: false });

  // Drain inert counter
  inertReset();

  // Remove any sidebar outside-click listener
  removeSidebarHandler();

  // Clear animation guard
  animating = false;
  if (animatingTimeout !== null) {
    clearTimeout(animatingTimeout);
    animatingTimeout = null;
  }

  // Unlock scroll
  unlockPreviewScroll();

  previousMenuFocus = null;
  previousCartFocus = null;
}

// ─── Scroll lock for fullscreen overlay ───
function lockPreviewScroll(): void {
  if (previewEl) previewEl.style.overflow = 'hidden';
}

function unlockPreviewScroll(): void {
  if (previewEl) previewEl.style.overflow = '';
}

// ─── Focus return ───
let previousMenuFocus: Element | null = null;
let previousCartFocus: Element | null = null;

// ─── Sidebar outside-click handler ───
let currentSidebarCleanup: (() => void) | null = null;

function removeSidebarHandler(): void {
  if (currentSidebarCleanup) {
    currentSidebarCleanup();
    currentSidebarCleanup = null;
  }
}

function installSidebarOutsideClose(root: HTMLElement): void {
  removeSidebarHandler();
  const handler = (e: PointerEvent) => {
    const drawer = root.querySelector<HTMLElement>('.nav__primary');
    const toggleBtn = root.querySelector<HTMLElement>('.nav__menu-toggle');
    if (
      drawer && toggleBtn &&
      !e.composedPath().includes(drawer) &&
      !e.composedPath().includes(toggleBtn)
    ) {
      closeMenu(root);
    }
  };
  document.addEventListener('pointerdown', handler, true);
  currentSidebarCleanup = () => document.removeEventListener('pointerdown', handler, true);
}

function openCartDrawer(): void {
  const dialog = getCartDialog();
  if (!dialog || dialog.open) return;

  previousCartFocus = document.activeElement;
  dialog.show();
  dialog.dataset.previewOpen = 'true';
  inertPush();
  dialog.focus();
}

function closeCartDrawer({ restoreFocus = true }: { restoreFocus?: boolean } = {}): void {
  const dialog = getCartDialog();
  if (!dialog?.open) return;

  dialog.close();
  if (dialog.dataset.previewOpen === 'true') {
    delete dialog.dataset.previewOpen;
    inertPop();
  }

  if (restoreFocus && previousCartFocus instanceof HTMLElement) {
    previousCartFocus.focus();
  }
  previousCartFocus = null;
}

// ─── Menu open/close ───
function openMenu(root: HTMLElement): void {
  previousMenuFocus = document.activeElement;

  root.dataset.open = 'true';
  const toggle = root.querySelector<HTMLButtonElement>('.nav__menu-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }

  const variant = root.dataset.variant;
  if (variant === 'simple' || variant === 'fullscreen' || variant === 'sidebar' || variant === 'tile') {
    inertPush();
  }
  if (variant === 'simple' || variant === 'fullscreen' || variant === 'tile') {
    lockPreviewScroll();
  }
  if (variant === 'fullscreen') {
    openSearch(root, { focusInput: false });
  }
  if (variant === 'sidebar') {
    // Close search before opening menu (desktop hides it via CSS)
    closeSearch(root);
    installSidebarOutsideClose(root);

    // Auto-expand Shop submenu (always-open in sidebar variant)
    const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
    const shopSubmenu = root.querySelector<HTMLElement>('#shop-submenu');
    if (shopBtn && shopSubmenu) {
      shopBtn.setAttribute('aria-expanded', 'true');
      shopSubmenu.removeAttribute('hidden');
    }
  }
}

function closeMenu(root: HTMLElement): void {
  const wasOpen = root.dataset.open === 'true';
  root.dataset.open = 'false';
  const toggle = root.querySelector<HTMLButtonElement>('.nav__menu-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menu');
  }

  if (wasOpen) {
    const variant = root.dataset.variant;
    if (variant === 'simple' || variant === 'fullscreen' || variant === 'sidebar' || variant === 'tile') {
      inertPop();
    }
    if (variant === 'simple' || variant === 'fullscreen' || variant === 'tile') {
      unlockPreviewScroll();
    }
    if (variant === 'fullscreen') {
      closeSearch(root);
    }
    removeSidebarHandler();

    // Restore focus
    if (previousMenuFocus instanceof HTMLElement) {
      previousMenuFocus.focus();
    }
    previousMenuFocus = null;
  }

  closeShopSubmenu(root);
}

// ─── Module-level state reset (for multi-component shell unmount) ───
export function resetNavModuleState(): void {
  previewEl = null;
  inertDepth = 0;
  submenuOriginalParent = null;
  animating = false;
  if (animatingTimeout !== null) {
    clearTimeout(animatingTimeout);
    animatingTimeout = null;
  }
  previousMenuFocus = null;
  previousCartFocus = null;
  removeSidebarHandler();
}

// ─── Init ───
export function initNavBehavior(root: HTMLElement, preview: HTMLElement): () => void {
  previewEl = preview;
  const abortController = new AbortController();
  const { signal } = abortController;
  let inlineSyncFrame = 0;

  const scheduleInlineSync = () => {
    if (inlineSyncFrame) cancelAnimationFrame(inlineSyncFrame);
    inlineSyncFrame = requestAnimationFrame(() => {
      inlineSyncFrame = 0;
      syncTopInlineState(root);
      syncSimpleInlineState(root);
      syncTileInlineState(root);
    });
  };

  // Menu toggle (with rapid double-click guard)
  const menuToggle = root.querySelector<HTMLButtonElement>('.nav__menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      guardedToggle(() => {
        if (root.dataset.open === 'true') {
          closeMenu(root);
        } else {
          openMenu(root);
        }
      });
    }, { signal });
  }

  // Search toggle
  const searchToggle = root.querySelector<HTMLButtonElement>('.nav__search-toggle');
  const searchInput = root.querySelector<HTMLInputElement>('.nav__search-input');
  const searchForm = root.querySelector<HTMLFormElement>('.nav__search');

  if (searchToggle && searchInput && searchForm) {
    searchToggle.addEventListener('click', () => {
      if (root.dataset.variant === 'fullscreen' && root.dataset.open === 'true') {
        openSearch(root);
        return;
      }

      const isOpen = searchToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeSearch(root);
      } else {
        openSearch(root);
      }
    }, { signal });

    // Click-outside to close search
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      if (root.dataset.variant === 'fullscreen' && root.dataset.open === 'true') {
        return;
      }

      if (
        searchToggle.getAttribute('aria-expanded') === 'true' &&
        !e.composedPath().includes(searchForm)
      ) {
        closeSearch(root);
      }
    }, { signal });

    // Prevent form submission
    searchForm.addEventListener('submit', (e) => e.preventDefault(), { signal });
  }

  // Shop submenu toggle (delegated so dynamically-added buttons work)
  root.addEventListener('click', (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest<HTMLButtonElement>('.nav__item--has-submenu button');
    if (!btn) return;
    const submenuId = btn.getAttribute('aria-controls');
    if (!submenuId) return;

    // In sidebar variant, Shop submenu is always open — don't toggle
    if (root.dataset.variant === 'sidebar' && submenuId === 'shop-submenu') {
      return;
    }

    const submenu = root.querySelector<HTMLElement>(`#${submenuId}`);
    if (!submenu) return;

    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeShopSubmenu(root);
    } else {
      btn.setAttribute('aria-expanded', 'true');
      submenu.removeAttribute('hidden');
      // Top variant: relocate submenu to nav__inner for full-width row
      if (root.dataset.variant === 'top') {
        relocateSubmenuForTop(root, submenu);
      }
    }
  }, { signal });

  // Cart dialog
  const cartBtn = root.querySelector<HTMLButtonElement>('.nav__cart');
  const cartDialog = getCartDialog();

  if (cartBtn && cartDialog) {
    cartBtn.addEventListener('click', () => {
      openCartDrawer();
    }, { signal });

    // Click the preview-scoped backdrop to close the drawer.
    cartDialog.addEventListener('click', (e) => {
      if (e.target === cartDialog) {
        closeCartDrawer();
      }
    }, { signal });
  }

  // Escape key handler: search, cart, submenu, then fullscreen/sidebar/simple menu
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (root.dataset.variant === 'fullscreen' && root.dataset.open === 'true') {
        if (cartDialog?.open) {
          closeCartDrawer();
        } else {
          closeMenu(root);
        }
      } else if (searchToggle?.getAttribute('aria-expanded') === 'true') {
        closeSearch(root, { restoreFocus: true });
      } else if (cartDialog?.open) {
        closeCartDrawer();
      } else if (root.querySelector('.nav__item--has-submenu button[aria-expanded="true"]')) {
        closeShopSubmenu(root, { restoreFocus: true });
      } else if (root.dataset.open === 'true' && root.dataset.variant !== 'top') {
        closeMenu(root);
      }
    }
  }, { signal });

  // Top variant: add keyboard scrollability to nav__primary
  const primary = root.querySelector<HTMLElement>('.nav__primary');
  if (primary) {
    primary.setAttribute('tabindex', '0');
    primary.setAttribute('role', 'region');
  }

  const inlineResizeObserver = new ResizeObserver(scheduleInlineSync);
  inlineResizeObserver.observe(root);

  const inlineMutationObserver = new MutationObserver(scheduleInlineSync);

  inlineMutationObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-variant', 'data-alignment', 'data-logo-style', 'data-cart-count', 'data-social-links', 'data-open'],
  });

  if (primary) {
    inlineMutationObserver.observe(primary, {
      childList: true,
      subtree: true,
    });
  }

  scheduleInlineSync();

  return () => {
    abortController.abort();
    if (inlineSyncFrame) cancelAnimationFrame(inlineSyncFrame);
    inlineResizeObserver.disconnect();
    inlineMutationObserver.disconnect();
    removeSidebarHandler();
    inertReset();
  };
}
