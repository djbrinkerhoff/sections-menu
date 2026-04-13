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
  const searchBtn = root.querySelector<HTMLButtonElement>('.nav__search-toggle');
  if (searchBtn) {
    searchBtn.setAttribute('aria-expanded', 'false');
    searchBtn.setAttribute('aria-label', 'Open search');
  }
  const searchForm = root.querySelector<HTMLFormElement>('.nav__search');
  if (searchForm) searchForm.removeAttribute('data-search-open');
  root.querySelector<HTMLInputElement>('.nav__search-input')?.blur();

  // Close Shop submenu
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
  if (shopBtn) shopBtn.setAttribute('aria-expanded', 'false');
  root.querySelector('#shop-submenu')?.setAttribute('hidden', '');

  // Close cart dialog
  const dialog = document.getElementById('cart-drawer') as HTMLDialogElement | null;
  if (dialog?.open) dialog.close();

  // Drain inert counter
  inertReset();

  // Remove any sidebar outside-click listener
  removeSidebarHandler();

  // Clear animation guard
  animating = false;

  // Unlock scroll
  unlockPreviewScroll();
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
let previousFocus: Element | null = null;

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

// ─── Menu open/close ───
function openMenu(root: HTMLElement): void {
  previousFocus = document.activeElement;

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
  }
  if (variant === 'sidebar') {
    installSidebarOutsideClose(root);
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
      unlockPreviewScroll();
    }
    removeSidebarHandler();

    // Restore focus
    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  // Also close submenu
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
  if (shopBtn) shopBtn.setAttribute('aria-expanded', 'false');
  root.querySelector('#shop-submenu')?.setAttribute('hidden', '');
}

// ─── Init ───
export function initNavBehavior(root: HTMLElement): () => void {
  const abortController = new AbortController();
  const { signal } = abortController;

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
      const isOpen = searchToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        searchToggle.setAttribute('aria-expanded', 'false');
        searchToggle.setAttribute('aria-label', 'Open search');
        searchForm.removeAttribute('data-search-open');
        searchInput.blur();
      } else {
        searchToggle.setAttribute('aria-expanded', 'true');
        searchToggle.setAttribute('aria-label', 'Close search');
        searchForm.setAttribute('data-search-open', 'true');
        searchInput.focus();
      }
    }, { signal });

    // Click-outside to close search
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      if (
        searchToggle.getAttribute('aria-expanded') === 'true' &&
        !e.composedPath().includes(searchForm)
      ) {
        searchToggle.setAttribute('aria-expanded', 'false');
        searchToggle.setAttribute('aria-label', 'Open search');
        searchForm.removeAttribute('data-search-open');
      }
    }, { signal });

    // Prevent form submission
    searchForm.addEventListener('submit', (e) => e.preventDefault(), { signal });
  }

  // Shop submenu toggle
  const shopBtn = root.querySelector<HTMLButtonElement>('[aria-controls="shop-submenu"]');
  const shopSubmenu = root.querySelector<HTMLUListElement>('#shop-submenu');

  if (shopBtn && shopSubmenu) {
    shopBtn.addEventListener('click', () => {
      const isOpen = shopBtn.getAttribute('aria-expanded') === 'true';
      shopBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (isOpen) {
        shopSubmenu.setAttribute('hidden', '');
      } else {
        shopSubmenu.removeAttribute('hidden');
      }
    }, { signal });
  }

  // Cart dialog
  const cartBtn = root.querySelector<HTMLButtonElement>('.nav__cart');
  const cartDialog = document.getElementById('cart-drawer') as HTMLDialogElement | null;

  if (cartBtn && cartDialog) {
    cartBtn.addEventListener('click', () => {
      cartDialog.showModal();
    }, { signal });

    // Backdrop click to close (not free with <dialog>)
    cartDialog.addEventListener('click', (e) => {
      if (e.target === cartDialog) {
        cartDialog.close();
      }
    }, { signal });
  }

  // Escape key handler (for fullscreen/sidebar menu)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (root.dataset.open === 'true' && root.dataset.variant !== 'top') {
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

  return () => {
    abortController.abort();
    removeSidebarHandler();
    inertReset();
  };
}
