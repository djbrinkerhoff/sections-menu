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
