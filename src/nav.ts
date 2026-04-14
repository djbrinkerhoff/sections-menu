// Shared nav behavior: menu toggle, search, submenu, cart dialog,
// sidebar outside-click, escape, inert counter, ephemeral state reset.

// ─── Inert reference counter ───
let inertDepth = 0;

function applyInert(on: boolean): void {
  // Inert applies to preview content siblings of the nav, never the controls panel
  const preview = document.getElementById('preview-root');
  if (!preview) return;
  for (const child of Array.from(preview.children)) {
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
  return document.getElementById('cart-drawer') as HTMLDialogElement | null;
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

function syncTopInlineState(root: HTMLElement): void {
  if (root.dataset.variant !== 'top') {
    delete root.dataset.topInline;
    return;
  }

  const inner = root.querySelector<HTMLElement>('.nav__inner');
  const primary = root.querySelector<HTMLElement>('.nav__primary');
  const list = root.querySelector<HTMLElement>('.nav__list');
  const logo = root.querySelector<HTMLElement>('.nav__logo');
  const search = root.querySelector<HTMLElement>('.nav__search');
  const cart = root.querySelector<HTMLElement>('.nav__cart');

  if (!inner || !primary || !list || !logo || !search || !cart) {
    root.dataset.topInline = 'false';
    return;
  }

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

  let availableWidth = contentWidth - fixedWidth - gap * 3;
  if (root.dataset.alignment === 'center') {
    availableWidth = (contentWidth - fixedWidth - gap * 4) / 2;
  }

  root.dataset.topInline = availableWidth >= linkWidth ? 'true' : 'false';
}

function closeShopSubmenu(root: HTMLElement, { restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
  const shopSubmenu = root.querySelector<HTMLElement>('#shop-submenu');

  if (shopBtn) {
    shopBtn.setAttribute('aria-expanded', 'false');
  }
  shopSubmenu?.setAttribute('hidden', '');

  if (restoreFocus && shopBtn) {
    shopBtn.focus();
  }
}

// ─── Rapid double-click guard ───
let animating = false;

function guardedToggle(fn: () => void): void {
  if (animating) return;
  animating = true;
  fn();
  // Clear after transition duration (200ms) + buffer
  setTimeout(() => { animating = false; }, 250);
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

  // Unlock scroll
  unlockPreviewScroll();

  previousMenuFocus = null;
  previousCartFocus = null;
}

// ─── Scroll lock for fullscreen overlay ───
function lockPreviewScroll(): void {
  const preview = document.getElementById('preview-root');
  if (preview) preview.style.overflow = 'hidden';
}

function unlockPreviewScroll(): void {
  const preview = document.getElementById('preview-root');
  if (preview) preview.style.overflow = '';
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
  if (variant === 'fullscreen' || variant === 'sidebar') {
    inertPush();
  }
  if (variant === 'fullscreen') {
    lockPreviewScroll();
    openSearch(root, { focusInput: false });
  }
  if (variant === 'sidebar') {
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
    if (variant === 'fullscreen' || variant === 'sidebar') {
      inertPop();
    }
    if (variant === 'fullscreen') {
      closeSearch(root);
      unlockPreviewScroll();
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

// ─── Init ───
export function initNavBehavior(root: HTMLElement): () => void {
  const abortController = new AbortController();
  const { signal } = abortController;
  let topInlineFrame = 0;

  const scheduleTopInlineSync = () => {
    if (topInlineFrame) cancelAnimationFrame(topInlineFrame);
    topInlineFrame = requestAnimationFrame(() => {
      topInlineFrame = 0;
      syncTopInlineState(root);
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
    const btn = (e.target as Element).closest<HTMLButtonElement>('.nav__item--has-submenu button');
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
    }
  }, { signal });

  // Cart dialog
  const cartBtn = root.querySelector<HTMLButtonElement>('.nav__cart');
  const cartDialog = document.getElementById('cart-drawer') as HTMLDialogElement | null;

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

  const topInlineResizeObserver = new ResizeObserver(() => {
    scheduleTopInlineSync();
  });
  topInlineResizeObserver.observe(root);

  const topInlineMutationObserver = new MutationObserver(() => {
    scheduleTopInlineSync();
  });

  topInlineMutationObserver.observe(root, {
    attributes: true,
    attributeFilter: ['data-variant', 'data-alignment', 'data-logo-style', 'data-cart-count'],
  });

  if (primary) {
    topInlineMutationObserver.observe(primary, {
      childList: true,
      subtree: true,
    });
  }

  scheduleTopInlineSync();

  return () => {
    abortController.abort();
    if (topInlineFrame) cancelAnimationFrame(topInlineFrame);
    topInlineResizeObserver.disconnect();
    topInlineMutationObserver.disconnect();
    removeSidebarHandler();
    inertReset();
  };
}
