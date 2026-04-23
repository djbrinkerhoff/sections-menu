import { expect, test } from 'playwright/test';

function lightbox(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box-lightbox[open]');
}

async function activeFigureIndex(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box-lightbox__figure').evaluateAll((figures) =>
    figures.findIndex((figure) => figure.getAttribute('data-active') === 'true'),
  );
}

async function activeRailIndex(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box-lightbox__rail-thumb').evaluateAll((buttons) =>
    buttons.findIndex((button) => button.getAttribute('data-selected') === 'true'),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.controls__picker').selectOption('pdp-buy-box');
  await expect(page.locator('.pdp-buy-box')).toBeVisible();
});

test('desktop opens the Huckberry-style lightbox from the selected source image', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await page.locator('.pdp-buy-box__media-thumb').nth(3).click();
  await page.locator('.pdp-buy-box__media-hero').click();

  const dialog = lightbox(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-mode', 'desktop');
  await expect(dialog.locator('.pdp-buy-box-lightbox__rail-shell')).toBeVisible();
  await expect.poll(async () => activeFigureIndex(page)).toBe(3);
  await expect.poll(async () => activeRailIndex(page)).toBe(3);
});

test('desktop rail thumbnails scroll the stacked image viewer and update the selected state', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await page.locator('.pdp-buy-box__media-hero').click();

  await lightbox(page).locator('.pdp-buy-box-lightbox__rail-thumb').nth(4).click();

  await expect.poll(async () => activeFigureIndex(page)).toBe(4);
  await expect.poll(async () => activeRailIndex(page)).toBe(4);
});

test('desktop keyboard arrows step between images in the stacked viewer', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await page.locator('.pdp-buy-box__media-hero').click();

  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => activeFigureIndex(page)).toBe(1);

  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('desktop close button and Escape dismiss the viewer and restore focus to the hero trigger', async ({ page }) => {
  const hero = page.locator('.pdp-buy-box__media-hero');
  await page.locator('[data-viewport="1280"]').click();
  await hero.click();

  await lightbox(page).locator('.pdp-buy-box-lightbox__close').click();
  await expect(lightbox(page)).toHaveCount(0);
  await expect(hero).toBeFocused();

  await hero.click();
  await page.keyboard.press('Escape');
  await expect(lightbox(page)).toHaveCount(0);
  await expect(hero).toBeFocused();
});

test('desktop rail scroll controls move the thumbnail rail without changing the active image', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await page.locator('.pdp-buy-box__media-hero').click();

  const railViewport = lightbox(page).locator('.pdp-buy-box-lightbox__rail-viewport');
  const scrollTopBefore = await railViewport.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected rail viewport');
    return element.scrollTop;
  });

  await lightbox(page).locator('.pdp-buy-box-lightbox__rail-control--down').click();

  await expect
    .poll(async () => railViewport.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected rail viewport');
      return element.scrollTop;
    }))
    .toBeGreaterThan(scrollTopBefore);
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('switching products while the desktop lightbox is open closes the viewer and rebuilds from the new product', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await page.locator('.pdp-buy-box__media-hero').click();
  await expect(lightbox(page)).toBeVisible();

  await page.locator('select[name="productId"]').selectOption('crescent-bag');

  await expect(lightbox(page)).toHaveCount(0);
  await expect(page.locator('.pdp-buy-box__media-hero-image')).toHaveAttribute('src', /crescent-bag-01\.png$/);
});

test('mobile opens the same stacked viewer without the desktop thumbnail rail', async ({ page }) => {
  await page.locator('.pdp-buy-box__media-thumb').nth(4).click();
  await page.locator('.pdp-buy-box__media-hero').click();

  const dialog = lightbox(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-mode', 'mobile');
  await expect(dialog.locator('.pdp-buy-box-lightbox__rail-shell')).not.toBeVisible();
  await expect.poll(async () => activeFigureIndex(page)).toBe(4);
});

test('mobile stack scrolling keeps the viewer open and reveals later images', async ({ page }) => {
  await page.locator('.pdp-buy-box__media-hero').click();
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  }));

  const stack = lightbox(page).locator('.pdp-buy-box-lightbox__stack');
  await stack.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected lightbox stack');
    element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
  });

  await expect(lightbox(page)).toBeVisible();
  await expect
    .poll(async () => stack.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected lightbox stack');
      return element.scrollTop;
    }))
    .toBeGreaterThan(0);
});

test('changing the simulated viewport while the lightbox is open closes the viewer', async ({ page }) => {
  await page.locator('.pdp-buy-box__media-hero').click();
  await expect(lightbox(page)).toBeVisible();

  await page.locator('[data-viewport="1280"]').click();

  await expect(lightbox(page)).toHaveCount(0);
});
