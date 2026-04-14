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
