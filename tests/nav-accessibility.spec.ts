import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('exposes accessible names for search and controls', async ({ page }) => {
  await expect(page.getByLabel('Search Site')).toHaveAttribute('autocomplete', 'off');
  await expect(page.getByLabel('Cart count')).toHaveAttribute('autocomplete', 'off');

  await expect(page.locator('input[name="menu-color"][aria-label="White"]')).toHaveCount(1);
  await expect(page.locator('input[name="text-color"][aria-label="Black"]')).toHaveCount(1);
  await expect(page.locator('input[aria-label="Yellow"]')).toHaveCount(2);
});

test('closes search with Escape and restores focus to the toggle', async ({ page }) => {
  const searchToggle = page.locator('.nav__search-toggle');

  await searchToggle.click();
  await expect(page.locator('.nav__search')).toHaveAttribute('data-search-open', 'true');

  await page.keyboard.press('Escape');

  await expect(page.locator('.nav__search')).not.toHaveAttribute('data-search-open', 'true');
  await expect(searchToggle).toBeFocused();
});

test('closes the shop submenu with Escape and restores focus to the trigger', async ({ page }) => {
  const menuToggle = page.locator('.nav__menu-toggle');
  const shopTrigger = page.locator('[aria-controls="shop-submenu"]');
  const submenu = page.locator('#shop-submenu');
  const navRoot = page.locator('.nav');

  await menuToggle.click();
  await expect(navRoot).toHaveAttribute('data-open', 'true');
  await shopTrigger.click();
  await expect(submenu).not.toHaveAttribute('hidden', '');

  await page.keyboard.press('Escape');

  await expect(submenu).toHaveAttribute('hidden', '');
  await expect(navRoot).toHaveAttribute('data-open', 'true');
  await expect(shopTrigger).toBeFocused();
});

test('preserves existing Escape behavior for cart and menu', async ({ page }) => {
  const cartButton = page.locator('.nav__cart');
  const menuToggle = page.locator('.nav__menu-toggle');
  const cartDialog = page.locator('#cart-drawer');
  const navRoot = page.locator('.nav');

  await cartButton.click();
  await expect(cartDialog).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');

  await expect(cartDialog).not.toHaveAttribute('open', '');
  await expect(cartButton).toBeFocused();

  await menuToggle.click();
  await expect(navRoot).toHaveAttribute('data-open', 'true');

  await page.keyboard.press('Escape');

  await expect(navRoot).toHaveAttribute('data-open', 'false');
  await expect(menuToggle).toBeFocused();
});

test('auto-opens fullscreen search on mobile and desktop', async ({ page }) => {
  const setFullscreenVariant = async () => {
    await page.locator('input[name="variant"][value="fullscreen"]').evaluate((input) => {
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected fullscreen variant input');
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  for (const viewportLabel of ['375', '1280']) {
    await page.getByRole('button', { name: viewportLabel }).click();
    await setFullscreenVariant();

    const menuToggle = page.locator('.nav__menu-toggle');
    const searchForm = page.locator('.nav__search');
    const searchToggle = page.locator('.nav__search-toggle');
    const searchInput = page.locator('.nav__search-input');
    const navRoot = page.locator('.nav');

    await menuToggle.click();

    await expect(navRoot).toHaveAttribute('data-open', 'true');
    await expect(searchForm).toHaveAttribute('data-search-open', 'true');
    await expect(searchToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(searchInput).not.toBeFocused();
    await expect(menuToggle).toBeFocused();

    await expect
      .poll(async () => searchInput.evaluate((input) => getComputedStyle(input).transitionDuration))
      .toBe('0s');

    await page.keyboard.press('Escape');

    await expect(navRoot).toHaveAttribute('data-open', 'false');
    await expect(menuToggle).toBeFocused();
  }
});

test('renders the simple mobile menu like the Figma frame when open', async ({ page }) => {
  const closedLogo = await page.locator('.nav__logo').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, width: rect.width };
  });

  await page.locator('.nav__menu-toggle').click();

  const layout = await page.evaluate(() => {
    const actions = document.querySelector('.nav__actions');
    const primary = document.querySelector('.nav__primary');
    const list = document.querySelector('.nav__list');
    const firstLink = document.querySelector('.nav__item .nav__link');
    const dropdownLink = document.querySelector('.nav__item--has-submenu > .nav__link');
    const firstItem = document.querySelector('.nav__item');
    const logo = document.querySelector('.nav__logo');
    const logoRect = logo?.getBoundingClientRect();

    return {
      actionsDisplay: actions ? getComputedStyle(actions).display : null,
      primaryDisplay: primary ? getComputedStyle(primary).display : null,
      listDirection: list ? getComputedStyle(list).flexDirection : null,
      firstLinkFontSize: firstLink ? getComputedStyle(firstLink).fontSize : null,
      firstLinkPaddingTop: firstLink ? getComputedStyle(firstLink).paddingTop : null,
      dropdownJustify: dropdownLink ? getComputedStyle(dropdownLink).justifyContent : null,
      firstItemBorderBottomWidth: firstItem ? getComputedStyle(firstItem).borderBottomWidth : null,
      logoLeft: logoRect?.left ?? null,
      logoWidth: logoRect?.width ?? null,
    };
  });

  expect(layout.actionsDisplay).toBe('none');
  expect(layout.primaryDisplay).toBe('block');
  expect(layout.listDirection).toBe('column');
  expect(layout.firstLinkFontSize).toBe('20px');
  expect(layout.firstLinkPaddingTop).toBe('20px');
  expect(layout.dropdownJustify).toBe('space-between');
  expect(layout.firstItemBorderBottomWidth).toBe('1px');
  expect(layout.logoLeft).toBeCloseTo(closedLogo.left, 0);
  expect(layout.logoWidth).toBeCloseTo(closedLogo.width, 0);
});

test('shows simple variant links inline in the desktop nav bar', async ({ page }) => {
  await page.getByRole('button', { name: '1280' }).click();
  await expect(page.locator('.nav')).toHaveAttribute('data-simple-inline', 'true');

  const layout = await page.evaluate(() => {
    const nav = document.querySelector('.nav');
    const logo = document.querySelector('.nav__logo');
    const primary = document.querySelector('.nav__primary');
    const actions = document.querySelector('.nav__actions');
    const list = document.querySelector('.nav__list');
    const toggle = document.querySelector('.nav__menu-toggle');
    const rect = (element: Element | null) => element?.getBoundingClientRect() ?? null;

    return {
      variant: nav instanceof HTMLElement ? nav.dataset.variant : null,
      primaryDisplay: primary ? getComputedStyle(primary).display : null,
      listDirection: list ? getComputedStyle(list).flexDirection : null,
      listJustifyContent: list ? getComputedStyle(list).justifyContent : null,
      toggleDisplay: toggle ? getComputedStyle(toggle).display : null,
      logoRect: rect(logo),
      primaryRect: rect(primary),
      actionsRect: rect(actions),
    };
  });

  expect(layout.variant).toBe('simple');
  expect(layout.primaryDisplay).toBe('block');
  expect(layout.listDirection).toBe('row');
  expect(layout.listJustifyContent).toBe('center');
  expect(layout.toggleDisplay).toBe('none');
  expect(layout.primaryRect?.left).toBeGreaterThanOrEqual(layout.logoRect?.right ?? 0);
  expect(layout.primaryRect?.right).toBeLessThanOrEqual(layout.actionsRect?.left ?? Number.MAX_SAFE_INTEGER);
});

test('moves top variant links into the masthead as soon as they fit', async ({ page }) => {
  const setTopVariant = async () => {
    await page.locator('input[name="variant"][value="top"]').evaluate((input) => {
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected top variant input');
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  const readLayout = async () => page.evaluate(() => {
    const nav = document.querySelector('.nav');
    const logo = document.querySelector('.nav__logo');
    const primary = document.querySelector('.nav__primary');
    const list = document.querySelector('.nav__list');
    const search = document.querySelector('.nav__search');
    const cart = document.querySelector('.nav__cart');
    const rect = (element: Element | null) => element?.getBoundingClientRect() ?? null;

    return {
      alignment: nav instanceof HTMLElement ? nav.dataset.alignment : null,
      topInline: nav instanceof HTMLElement ? nav.dataset.topInline : null,
      listJustifyContent: list ? getComputedStyle(list).justifyContent : null,
      logoRect: rect(logo),
      primaryRect: rect(primary),
      searchRect: rect(search),
      cartRect: rect(cart),
    };
  });

  const setAlignment = async (value: 'left' | 'center' | 'right') => {
    await page.locator(`input[name="alignment"][value="${value}"]`).evaluate((input) => {
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected alignment input');
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  await setTopVariant();
  await page.getByRole('button', { name: '375' }).click();
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('false');

  const stacked = await readLayout();
  expect(stacked.topInline).toBe('false');
  expect(stacked.primaryRect?.top).toBeGreaterThan(stacked.logoRect?.bottom ?? 0);

  await page.getByRole('button', { name: '768' }).click();
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('true');

  const inline = await readLayout();
  expect(inline.alignment).toBe('left');
  expect(inline.topInline).toBe('true');
  expect(inline.listJustifyContent).toBe('center');
  expect(inline.primaryRect?.left).toBeGreaterThanOrEqual(inline.logoRect?.right ?? 0);
  expect(inline.primaryRect?.right).toBeLessThanOrEqual(inline.searchRect?.left ?? Number.MAX_SAFE_INTEGER);
  expect(inline.primaryRect?.top).toBeLessThan(inline.logoRect?.bottom ?? Number.MAX_SAFE_INTEGER);
  expect(inline.primaryRect?.bottom).toBeGreaterThan(inline.logoRect?.top ?? 0);
  expect(inline.primaryRect?.top).toBeLessThan(inline.cartRect?.bottom ?? Number.MAX_SAFE_INTEGER);
  expect(inline.primaryRect?.bottom).toBeGreaterThan(inline.cartRect?.top ?? 0);

  await page.getByRole('button', { name: '1280' }).click();
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('true');

  const nearBreakpoint = await page.evaluate(async () => {
    const preview = document.getElementById('preview-root');
    const nav = document.querySelector('.nav');
    const inner = nav?.querySelector<HTMLElement>('.nav__inner');
    const list = nav?.querySelector<HTMLElement>('.nav__list');
    const logo = nav?.querySelector<HTMLElement>('.nav__logo');
    const search = nav?.querySelector<HTMLElement>('.nav__search');
    const cart = nav?.querySelector<HTMLElement>('.nav__cart');

    if (!preview || !(nav instanceof HTMLElement) || !inner || !list || !logo || !search || !cart) {
      throw new Error('Missing top nav elements');
    }

    const waitForLayout = () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    const getInlineNavWidth = () => {
      const styles = getComputedStyle(list);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const itemWidths = Array.from(list.children).map((item) => {
        const trigger = item.firstElementChild;
        return trigger instanceof HTMLElement ? trigger.getBoundingClientRect().width : 0;
      });

      return itemWidths.reduce((sum, width) => sum + width, 0) + gap * Math.max(itemWidths.length - 1, 0);
    };

    const measure = () => {
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
      const linkWidth = getInlineNavWidth();

      return {
        availableWidth: contentWidth - fixedWidth - gap * 3,
        linkWidth,
        topInline: nav.dataset.topInline,
      };
    };

    let metrics = measure();
    let previewWidth = Number.parseFloat(preview.style.width || '1280');

    while (!(metrics.availableWidth < metrics.linkWidth && metrics.availableWidth >= metrics.linkWidth - 16)) {
      previewWidth -= 1;
      if (previewWidth < 320) {
        throw new Error('Failed to reach the top-nav breakpoint band');
      }

      preview.style.width = `${previewWidth}px`;
      await waitForLayout();
      metrics = measure();
    }

    return metrics;
  });

  expect(nearBreakpoint.availableWidth).toBeLessThan(nearBreakpoint.linkWidth);
  expect(nearBreakpoint.availableWidth).toBeGreaterThanOrEqual(nearBreakpoint.linkWidth - 16);
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('false');

  await page.getByRole('button', { name: '1280' }).click();
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('true');

  await setAlignment('center');
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('false');

  const centeredLogo = await readLayout();
  expect(centeredLogo.alignment).toBe('center');
  expect(centeredLogo.topInline).toBe('false');
  expect(centeredLogo.primaryRect?.top).toBeGreaterThan(centeredLogo.logoRect?.bottom ?? 0);

  await setAlignment('right');
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('true');

  const rightAlignedLogo = await readLayout();
  expect(rightAlignedLogo.alignment).toBe('right');
  expect(rightAlignedLogo.listJustifyContent).toBe('center');
  expect(rightAlignedLogo.primaryRect?.left).toBeGreaterThanOrEqual(rightAlignedLogo.cartRect?.right ?? 0);
  expect(rightAlignedLogo.primaryRect?.right).toBeLessThanOrEqual(rightAlignedLogo.logoRect?.left ?? Number.MAX_SAFE_INTEGER);

  await setAlignment('left');
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('true');
  await page.getByRole('spinbutton', { name: 'Nav items' }).fill('20');
  await expect.poll(async () => page.locator('.nav').getAttribute('data-top-inline')).toBe('false');

  const overflowed = await readLayout();
  expect(overflowed.topInline).toBe('false');
  expect(overflowed.primaryRect?.top).toBeGreaterThan(overflowed.logoRect?.bottom ?? 0);
});

test('lets nav__list scroll on desktop and toggles the sidebar logo per Figma', async ({ page }) => {
  await page.getByRole('button', { name: '1280' }).click();

  await page.locator('input[name="variant"][value="sidebar"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected sidebar variant input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const logo = page.locator('.nav__logo');
  const closedLogoDisplay = await logo.evaluate((element) => getComputedStyle(element).display);
  const closedLogoHitTarget = await logo.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit instanceof Element ? Boolean(hit.closest('.nav__logo')) : false;
  });
  expect(closedLogoDisplay).toBe('flex');
  expect(closedLogoHitTarget).toBe(true);

  await page.getByRole('spinbutton', { name: 'Nav items' }).fill('20');
  await page.locator('.nav__menu-toggle').click();

  const list = page.locator('.nav__list');
  const metrics = await list.evaluate((element) => {
    const listEl = element as HTMLElement;
    listEl.scrollTop = 9999;

    return {
      overflowY: getComputedStyle(listEl).overflowY,
      clientHeight: listEl.clientHeight,
      scrollHeight: listEl.scrollHeight,
      scrollTop: listEl.scrollTop,
    };
  });
  const logoDisplay = await logo.evaluate((element) => getComputedStyle(element).display);

  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(logoDisplay).toBe('none');
});

test('keeps the desktop sidebar logo container in sync with menu color', async ({ page }) => {
  await page.getByRole('button', { name: '1280' }).click();

  await page.locator('input[name="variant"][value="sidebar"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected sidebar variant input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.locator('input[name="menu-color"][aria-label="Yellow"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected yellow menu color input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const colors = await page.evaluate(() => {
    const logo = document.querySelector('.nav__logo');
    const rail = document.querySelector('.nav__inner');

    return {
      logoBackground: logo ? getComputedStyle(logo).backgroundColor : null,
      railBackground: rail ? getComputedStyle(rail).backgroundColor : null,
    };
  });

  expect(colors.logoBackground).toBe('rgb(244, 217, 35)');
  expect(colors.railBackground).toBe(colors.logoBackground);
});

test('cleans up viewport listeners when controls are remounted', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { initControls } = await import('/src/controls.ts');

    const originalControlsRoot = document.getElementById('controls-root');
    const originalPreviewRoot = document.getElementById('preview-root');
    const originalViewportButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-viewport]'));
    if (!originalControlsRoot || !originalPreviewRoot) {
      throw new Error('Missing application roots');
    }

    const originalViewportValues = originalViewportButtons.map((button) => button.dataset.viewport ?? '');
    originalViewportButtons.forEach((button) => button.removeAttribute('data-viewport'));
    originalControlsRoot.id = 'controls-root-original';
    originalPreviewRoot.id = 'preview-root-original';

    const sandboxControls = document.createElement('div');
    sandboxControls.id = 'controls-root';
    document.body.appendChild(sandboxControls);

    const sandboxPreview = document.createElement('div');
    sandboxPreview.id = 'preview-root';
    document.body.appendChild(sandboxPreview);

    const navRoot = document.querySelector('.nav')?.cloneNode(true) as HTMLElement | null;
    if (!navRoot) {
      throw new Error('Missing nav root');
    }
    sandboxPreview.appendChild(navRoot);

    const sandboxViewportBar = document.createElement('div');
    document.body.appendChild(sandboxViewportBar);

    const trackedButtons = ['375', '768', '1280', 'fluid'].map((value) => {
      const button = document.createElement('button');
      button.dataset.viewport = value;
      let ariaPressedCalls = 0;
      const originalSetAttribute = button.setAttribute.bind(button);
      button.setAttribute = ((name: string, val: string) => {
        if (name === 'aria-pressed') ariaPressedCalls += 1;
        originalSetAttribute(name, val);
      }) as typeof button.setAttribute;
      sandboxViewportBar.appendChild(button);

      return {
        button,
        getCalls: () => ariaPressedCalls,
        reset: () => { ariaPressedCalls = 0; },
      };
    });

    const cleanupFirst = initControls(navRoot);
    cleanupFirst();
    const cleanupSecond = initControls(navRoot);

    trackedButtons.forEach((entry) => entry.reset());
    trackedButtons[1].button.click();

    const totalAriaPressedCalls = trackedButtons.reduce((total, entry) => total + entry.getCalls(), 0);
    const previewWidth = sandboxPreview.style.width;

    cleanupSecond();
    sandboxViewportBar.remove();
    sandboxControls.remove();
    sandboxPreview.remove();
    originalControlsRoot.id = 'controls-root';
    originalPreviewRoot.id = 'preview-root';
    originalViewportButtons.forEach((button, index) => {
      button.dataset.viewport = originalViewportValues[index];
    });

    return { totalAriaPressedCalls, previewWidth };
  });

  expect(result.totalAriaPressedCalls).toBe(5);
  expect(result.previewWidth).toBe('768px');
});

async function setVariant(page: import('playwright/test').Page, variant: string) {
  await page.locator(`input[name="variant"][value="${variant}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected variant input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function toggleSocialLinks(page: import('playwright/test').Page, value: 'true' | 'false') {
  await page.locator(`input[name="social-links"][value="${value}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected social-links input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test.describe('social links', () => {
  test('defaults to off and renders three links with accessible labels', async ({ page }) => {
    const navRoot = page.locator('.nav');
    await expect(navRoot).toHaveAttribute('data-social-links', 'false');

    const social = page.locator('.nav__social');
    await expect(social).toHaveAttribute('aria-label', 'Social links');
    await expect(social).toHaveCount(1);

    const links = social.locator('.nav__social-link');
    await expect(links).toHaveCount(3);

    const labels = await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')));
    expect(labels).toEqual(['Instagram', 'Facebook', 'TikTok']);

    const rels = await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('rel')));
    for (const rel of rels) {
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  test('toggle flips data-social-links and shows the group', async ({ page }) => {
    await page.getByRole('button', { name: '1280' }).click();

    const navRoot = page.locator('.nav');
    const social = page.locator('.nav__social');

    await expect(social).toHaveCSS('display', 'none');

    await toggleSocialLinks(page, 'true');
    await expect(navRoot).toHaveAttribute('data-social-links', 'true');

    await expect.poll(async () => social.evaluate((el) => getComputedStyle(el).display)).not.toBe('none');

    await toggleSocialLinks(page, 'false');
    await expect(navRoot).toHaveAttribute('data-social-links', 'false');
    await expect.poll(async () => social.evaluate((el) => getComputedStyle(el).display)).toBe('none');
  });

  test('each icon uses mask-image pointing to the correct SVG asset', async ({ page }) => {
    await toggleSocialLinks(page, 'true');

    const iconSources = await page.locator('.nav__social-icon').evaluateAll((nodes) => {
      return nodes.map((n) => ({
        icon: n.getAttribute('data-icon'),
        maskImage: getComputedStyle(n).maskImage || getComputedStyle(n).webkitMaskImage,
      }));
    });

    expect(iconSources).toEqual([
      expect.objectContaining({ icon: 'instagram', maskImage: expect.stringContaining('/icons/instagram.svg') }),
      expect.objectContaining({ icon: 'facebook', maskImage: expect.stringContaining('/icons/facebook.svg') }),
      expect.objectContaining({ icon: 'tiktok', maskImage: expect.stringContaining('/icons/tiktok.svg') }),
    ]);
  });

  test('mobile simple: social group sits below the nav list in the open menu', async ({ page }) => {
    await page.getByRole('button', { name: '375' }).click();
    await toggleSocialLinks(page, 'true');
    await page.locator('.nav__menu-toggle').click();
    await expect(page.locator('.nav')).toHaveAttribute('data-open', 'true');

    const geometry = await page.evaluate(() => {
      const list = document.querySelector('.nav__list')!.getBoundingClientRect();
      const social = document.querySelector('.nav__social')!.getBoundingClientRect();
      return { listBottom: list.bottom, socialTop: social.top, socialHeight: social.height };
    });

    expect(geometry.socialHeight).toBeGreaterThan(0);
    expect(geometry.socialTop).toBeGreaterThanOrEqual(geometry.listBottom - 1);
  });

  test('mobile top: social group renders in the masthead next to cart', async ({ page }) => {
    await page.getByRole('button', { name: '375' }).click();
    await setVariant(page, 'top');
    await toggleSocialLinks(page, 'true');

    const geometry = await page.evaluate(() => {
      const logo = document.querySelector('.nav__logo')!.getBoundingClientRect();
      const list = document.querySelector('.nav__list')!.getBoundingClientRect();
      const cart = document.querySelector('.nav__cart')!.getBoundingClientRect();
      const socialEl = document.querySelector('.nav__social') as HTMLElement;
      const social = socialEl.getBoundingClientRect();
      return {
        logoTop: logo.top,
        listTop: list.top,
        socialTop: social.top,
        socialLeft: social.left,
        cartLeft: cart.left,
        socialVisible: socialEl.offsetHeight > 0,
      };
    });

    expect(geometry.socialVisible).toBe(true);
    // Social shares the masthead row with the logo (not the link row below).
    expect(Math.abs(geometry.logoTop - geometry.socialTop)).toBeLessThan(24);
    expect(geometry.listTop).toBeGreaterThan(geometry.socialTop + 10);
    // Social sits to the left of the cart (trailing side of the masthead).
    expect(geometry.socialLeft).toBeLessThan(geometry.cartLeft);
  });

  test('mobile tile: social group renders as a 3-column grid in the open menu', async ({ page }) => {
    await page.getByRole('button', { name: '375' }).click();
    await setVariant(page, 'tile');
    await toggleSocialLinks(page, 'true');
    await page.locator('.nav__menu-toggle').click();

    const layout = await page.evaluate(() => {
      const social = document.querySelector('.nav__social') as HTMLElement;
      return {
        display: getComputedStyle(social).display,
        columns: getComputedStyle(social).gridTemplateColumns,
      };
    });

    expect(layout.display).toBe('grid');
    // Three equal tracks
    expect(layout.columns.split(' ').filter(Boolean).length).toBe(3);
  });

  test('desktop tile: social group renders as one combined tile in the bar', async ({ page }) => {
    await page.getByRole('button', { name: '1280' }).click();
    await setVariant(page, 'tile');
    await toggleSocialLinks(page, 'true');

    const layout = await page.evaluate(() => {
      const social = document.querySelector('.nav__social') as HTMLElement;
      const styles = getComputedStyle(social);
      return {
        display: styles.display,
        background: styles.backgroundColor,
        iconCount: social.querySelectorAll('.nav__social-icon').length,
      };
    });

    // Either 'flex' or 'inline-flex' is fine — the key is it renders as a single combined tile, not grid.
    expect(['flex', 'inline-flex']).toContain(layout.display);
    expect(layout.iconCount).toBe(3);
    // Background should be the menu color (not transparent), confirming it's rendered as a single tile box.
    expect(layout.background).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('tab order: last nav link → first social link', async ({ page }) => {
    await page.getByRole('button', { name: '1280' }).click();
    await setVariant(page, 'simple');
    await toggleSocialLinks(page, 'true');

    const lastLink = page.locator('.nav__list .nav__link').last();
    await lastLink.focus();
    await page.keyboard.press('Tab');

    const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focusedLabel).toBe('Instagram');
  });

  test('setNavItemCount does not destroy social group', async ({ page }) => {
    await toggleSocialLinks(page, 'true');
    await expect(page.locator('.nav__social-link')).toHaveCount(3);

    const input = page.getByLabel('Nav items');
    await input.fill('10');
    await input.dispatchEvent('input');

    await expect(page.locator('.nav__item')).toHaveCount(10);
    await expect(page.locator('.nav__social-link')).toHaveCount(3);

    await input.fill('0');
    await input.dispatchEvent('input');

    await expect(page.locator('.nav__item')).toHaveCount(0);
    await expect(page.locator('.nav__social-link')).toHaveCount(3);
  });
});

test.describe('edge case: many nav items', () => {
  type Combo = {
    variant: 'simple' | 'fullscreen' | 'sidebar' | 'top' | 'tile';
    viewport: '375' | '1280';
    openMenu: boolean;
    // Which element hosts the overflow (scrollbar or wrap) we care about.
    overflowHost: '.nav__list' | '.nav__primary';
    // Direction that should be scrollable/wrapping when items overflow.
    overflow: 'vertical' | 'horizontal' | 'wrap';
  };

  const COUNT = 15;
  const combos: Combo[] = [
    { variant: 'simple',     viewport: '375',  openMenu: true,  overflowHost: '.nav__primary', overflow: 'vertical'   },
    { variant: 'simple',     viewport: '1280', openMenu: true,  overflowHost: '.nav__primary', overflow: 'vertical'   },
    { variant: 'fullscreen', viewport: '375',  openMenu: true,  overflowHost: '.nav__list',    overflow: 'vertical'   },
    { variant: 'fullscreen', viewport: '1280', openMenu: true,  overflowHost: '.nav__list',    overflow: 'vertical'   },
    { variant: 'sidebar',    viewport: '375',  openMenu: true,  overflowHost: '.nav__list',    overflow: 'vertical'   },
    { variant: 'sidebar',    viewport: '1280', openMenu: true,  overflowHost: '.nav__list',    overflow: 'vertical'   },
    { variant: 'top',        viewport: '375',  openMenu: false, overflowHost: '.nav__primary', overflow: 'horizontal' },
    { variant: 'top',        viewport: '1280', openMenu: false, overflowHost: '.nav__primary', overflow: 'horizontal' },
    { variant: 'tile',       viewport: '375',  openMenu: true,  overflowHost: '.nav__primary', overflow: 'vertical'   },
    { variant: 'tile',       viewport: '1280', openMenu: true,  overflowHost: '.nav__primary', overflow: 'skip'       },
  ];

  for (const combo of combos) {
    test(`${combo.variant} @ ${combo.viewport}px renders ${COUNT} items without breaking layout`, async ({ page }) => {
      await page.getByRole('button', { name: combo.viewport }).click();
      await setVariant(page, combo.variant);

      // Set many items BEFORE opening menu (setNavItemCount resets ephemeral state).
      await page.getByRole('spinbutton', { name: 'Nav items' }).fill(String(COUNT));

      if (combo.openMenu) {
        await page.locator('.nav__menu-toggle').click();
        await expect(page.locator('.nav')).toHaveAttribute('data-open', 'true');
        // Sidebar desktop transitions visibility over 200ms — wait for the panel
        // to actually be visible before measuring item geometry.
        await page.locator('.nav__primary').first().waitFor({ state: 'visible' });
      }

      // All items rendered in the DOM.
      await expect(page.locator('.nav__item')).toHaveCount(COUNT);

      // Every item has a non-zero box — nothing collapsed to 0 width/height.
      const itemDims = await page.locator('.nav__item').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { w: r.width, h: r.height };
        }),
      );
      expect(itemDims).toHaveLength(COUNT);
      for (const dim of itemDims) {
        expect(dim.w).toBeGreaterThan(0);
        expect(dim.h).toBeGreaterThan(0);
      }

      // Variant-specific: verify the host truly overflows where it should.
      // tile desktop inherently shrinks tiles instead of scrolling, so skip that check there.
      if (combo.overflow === 'horizontal' || combo.overflow === 'vertical') {
        const overflows = await page.locator(combo.overflowHost).evaluate((el, direction) => {
          return direction === 'horizontal'
            ? el.scrollWidth > el.clientWidth + 1
            : el.scrollHeight > el.clientHeight + 1;
        }, combo.overflow);
        expect(overflows).toBe(true);
      }
    });
  }
});
