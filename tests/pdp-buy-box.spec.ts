import { expect, test } from 'playwright/test';

async function checkRadio(page: import('playwright/test').Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.controls__picker').selectOption('pdp-buy-box');
  await expect(page.locator('.pdp-buy-box')).toBeVisible();
});

function getSearchParams(page: import('playwright/test').Page) {
  return page.evaluate(() => Object.fromEntries(new URLSearchParams(window.location.search).entries()));
}

function mediaPagination(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box__media .gallery__pagination [role="tab"]');
}

function activeMediaImage(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box__media .gallery__item:not([data-gallery-clone]):not([inert]) .gallery__image');
}

function activeMediaTrigger(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box__media .gallery__item:not([data-gallery-clone]):not([inert]) .gallery__trigger');
}

function readBuyBoxMetrics(page: import('playwright/test').Page) {
  return page.evaluate(() => {
    const media = document.querySelector('.pdp-buy-box__media');
    const details = document.querySelector('.pdp-buy-box__details');
    const quantity = document.querySelector('.pdp-buy-box__quantity');
    const cta = document.querySelector('.pdp-buy-box__cta');
    if (!(media instanceof HTMLElement)
      || !(details instanceof HTMLElement)
      || !(quantity instanceof HTMLElement)
      || !(cta instanceof HTMLElement)) {
      throw new Error('Expected PDP buy box geometry elements');
    }

    const mediaRect = media.getBoundingClientRect();
    const detailsRect = details.getBoundingClientRect();
    const quantityRect = quantity.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();

    return {
      mediaTop: mediaRect.top,
      mediaBottom: mediaRect.bottom,
      mediaWidth: mediaRect.width,
      detailsTop: detailsRect.top,
      detailsWidth: detailsRect.width,
      columnGap: detailsRect.left - mediaRect.right,
      quantityWidth: quantityRect.width,
      purchaseGap: ctaRect.left - quantityRect.right,
      ctaWidth: ctaRect.width,
    };
  });
}

// ─── Mounting & structure ───

test('mounts the section root with default product', async ({ page }) => {
  const root = page.locator('.pdp-buy-box');
  await expect(root).toHaveAttribute('data-product-id', 'summit-tee');
});

test('renders one media region and one details region', async ({ page }) => {
  await expect(page.locator('.pdp-buy-box__media')).toHaveCount(1);
  await expect(page.locator('.pdp-buy-box__details')).toHaveCount(1);
});

test('renders the expected block order: title, price, bnpl, select, chips, purchase row, shipping note, description, shipping+returns', async ({ page }) => {
  await expect(page.locator('.pdp-buy-box__title')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__price')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__bnpl')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__select')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__chip-row')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__purchase-row')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__shipping-note')).toBeVisible();

  const infoSections = page.locator('.pdp-buy-box__info');
  await expect(infoSections).toHaveCount(2);
});

test('renders one select-style option group and one chip-style option group', async ({ page }) => {
  await expect(page.locator('.pdp-buy-box__select')).toBeVisible();

  const chips = page.locator('.pdp-buy-box__chip');
  await expect(chips).toHaveCount(4);
});

// ─── Default product content ───

test('default product hydrates title, price, and active page image', async ({ page }) => {
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Very cool t-shirt');
  await expect(page.locator('.pdp-buy-box__price')).toContainText('$12.00');

  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-01\.png$/);
});

test('default product renders select options', async ({ page }) => {
  await expect(page.locator('.pdp-buy-box__option-label').first()).toHaveText('Color');

  const selectOptions = page.locator('.pdp-buy-box__select option');
  // placeholder + 4 color options
  await expect(selectOptions).toHaveCount(5);
});

test('default product renders chip options', async ({ page }) => {
  const chipLabel = page.locator('.pdp-buy-box__option-label').nth(1);
  await expect(chipLabel).toHaveText('Size');

  const chips = page.locator('.pdp-buy-box__chip');
  await expect(chips.nth(0)).toHaveText('Small');
  await expect(chips.nth(1)).toHaveText('Medium');
  await expect(chips.nth(2)).toHaveText('Large');
  await expect(chips.nth(3)).toHaveText('XL');
});

// ─── Product switching ───

test('switching product from controls updates the active page image, title, price, and options', async ({ page }) => {
  const controlsSelect = page.locator('select[name="productId"]');
  await controlsSelect.selectOption('crescent-bag');

  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'crescent-bag');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Medium nylon crescent bag');
  await expect(page.locator('.pdp-buy-box__price')).toContainText('$64.00');

  await expect(activeMediaImage(page)).toHaveAttribute('src', /crescent-bag-01\.png$/);

  // Chip group should show bag-specific options
  await expect(page.locator('.pdp-buy-box__option-label').nth(1)).toHaveText('Strap');
  await expect(page.locator('.pdp-buy-box__chip').nth(0)).toHaveText('Short');
});

test('switching to a simple product hides variant controls and resets quantity', async ({ page }) => {
  await page.locator('.pdp-buy-box__select').selectOption('Bone');

  // Select a chip on default product
  await page.locator('.pdp-buy-box__chip').nth(1).click();
  await expect(page.locator('.pdp-buy-box__chip').nth(1)).toHaveAttribute('data-selected', 'true');

  // Increase quantity
  await page.locator('[data-quantity-action="increment"]').click();
  await expect(page.locator('.pdp-buy-box__quantity-value')).toHaveValue('2');

  // Switch product
  await page.locator('select[name="productId"]').selectOption('ridge-hoodie');

  // Simple products should hide variant controls entirely.
  await expect(page.locator('.pdp-buy-box__option-group').nth(0)).toBeHidden();
  await expect(page.locator('.pdp-buy-box__option-group').nth(1)).toBeHidden();
  await expect(page.locator('.pdp-buy-box__chip')).toHaveCount(0);
  await expect(page.locator('.pdp-buy-box__price')).toContainText('$88.00');
  await expect(page.locator('.pdp-buy-box__quantity-value')).toHaveValue('1');
});

test('switching back from a simple product restores variant controls for configurable products', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('ridge-hoodie');
  await expect(page.locator('.pdp-buy-box__option-group').nth(0)).toBeHidden();
  await expect(page.locator('.pdp-buy-box__option-group').nth(1)).toBeHidden();

  await page.locator('select[name="productId"]').selectOption('summit-tee');

  await expect(page.locator('.pdp-buy-box__option-group').nth(0)).toBeVisible();
  await expect(page.locator('.pdp-buy-box__option-group').nth(1)).toBeVisible();
  await expect(page.locator('.pdp-buy-box__option-label').first()).toHaveText('Color');
  await expect(page.locator('.pdp-buy-box__option-label').nth(1)).toHaveText('Size');
  await expect(page.locator('.pdp-buy-box__chip')).toHaveCount(4);
});

test('simple products keep the stock label in the price row', async ({ page }) => {
  await checkRadio(page, 'stockStyle', 'limited');
  await page.locator('select[name="productId"]').selectOption('ridge-hoodie');

  await expect(page.locator('[data-pdp-slot="stock-header"]')).toHaveText('Low stock');
  await expect(page.locator('[data-pdp-slot="stock-header"]')).toBeVisible();
  await expect(page.locator('[data-pdp-slot="stock-variant"]')).toBeHidden();
});

test('configurable products move stock below variants and only show it after a full selection', async ({ page }) => {
  await checkRadio(page, 'stockStyle', 'count');

  const headerStock = page.locator('[data-pdp-slot="stock-header"]');
  const variantStock = page.locator('[data-pdp-slot="stock-variant"]');

  await expect(headerStock).toBeHidden();
  await expect(variantStock).toBeHidden();

  await page.locator('.pdp-buy-box__select').selectOption('Bone');
  await expect(variantStock).toBeHidden();

  await page.locator('.pdp-buy-box__chip').filter({ hasText: 'Medium' }).click();
  await expect(headerStock).toBeHidden();
  await expect(variantStock).toHaveText('5 left in stock');
  await expect(variantStock).toBeVisible();

  const positions = await page.evaluate(() => {
    const chipGroup = document.querySelectorAll<HTMLElement>('.pdp-buy-box__option-group')[1];
    const stock = document.querySelector<HTMLElement>('[data-pdp-slot="stock-variant"]');
    if (!chipGroup || !stock) throw new Error('Missing stock positioning elements');

    const chipRect = chipGroup.getBoundingClientRect();
    const stockRect = stock.getBoundingClientRect();
    return {
      chipBottom: chipRect.bottom,
      stockTop: stockRect.top,
    };
  });

  expect(positions.stockTop).toBeGreaterThan(positions.chipBottom);
});

test('all three products render with correct info sections', async ({ page }) => {
  const controlsSelect = page.locator('select[name="productId"]');

  for (const productId of ['summit-tee', 'crescent-bag', 'ridge-hoodie']) {
    await controlsSelect.selectOption(productId);
    await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', productId);

    // Description and Shipping info sections
    const infoTitles = page.locator('.pdp-buy-box__info-title');
    await expect(infoTitles).toHaveCount(2);
    await expect(infoTitles.nth(0)).toHaveText('Description');
    await expect(infoTitles.nth(1)).toHaveText('Shipping');

    // Returns is a lead inside the shipping section
    await expect(page.locator('[data-pdp-slot="returns-lead"]')).toHaveText('Returns');
  }
});

// ─── In-preview interactions ───

test('chip toggle selects and deselects', async ({ page }) => {
  const firstChip = page.locator('.pdp-buy-box__chip').nth(0);

  // Initially not selected
  await expect(firstChip).toHaveAttribute('data-selected', 'false');
  await expect(firstChip).toHaveAttribute('aria-pressed', 'false');

  // Click to select
  await firstChip.click();
  await expect(firstChip).toHaveAttribute('data-selected', 'true');
  await expect(firstChip).toHaveAttribute('aria-pressed', 'true');

  // Click again to deselect
  await firstChip.click();
  await expect(firstChip).toHaveAttribute('data-selected', 'false');
  await expect(firstChip).toHaveAttribute('aria-pressed', 'false');
});

test('quantity increment and decrement within bounds', async ({ page }) => {
  const value = page.locator('.pdp-buy-box__quantity-value');
  await expect(value).toHaveValue('1');

  // Decrement at 1 stays at 1
  await page.locator('[data-quantity-action="decrement"]').click();
  await expect(value).toHaveValue('1');

  // Increment
  await page.locator('[data-quantity-action="increment"]').click();
  await expect(value).toHaveValue('2');
  await page.locator('[data-quantity-action="increment"]').click();
  await expect(value).toHaveValue('3');

  // Decrement
  await page.locator('[data-quantity-action="decrement"]').click();
  await expect(value).toHaveValue('2');
});

test('quantity caps at 9', async ({ page }) => {
  const increment = page.locator('[data-quantity-action="increment"]');
  const value = page.locator('.pdp-buy-box__quantity-value');

  for (let i = 0; i < 10; i++) {
    await increment.click();
  }

  await expect(value).toHaveValue('9');
});

test('clicking a source thumbnail updates the active page image and selected state', async ({ page }) => {
  const thumbs = mediaPagination(page);
  await thumbs.nth(3).click();

  await expect(thumbs.nth(3)).toHaveAttribute('aria-selected', 'true');
  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-04\.png$/);
});

test('disabling the lightbox keeps the on-page slideshow switching working without opening an overlay', async ({ page }) => {
  await checkRadio(page, 'lightbox', 'false');
  await mediaPagination(page).nth(2).click();

  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-03\.png$/);
  await activeMediaTrigger(page).click();
  await expect(page.locator('.pdp-buy-box-lightbox[open]')).toHaveCount(0);
});

test('scrolling the on-page slideshow updates the active image on mobile', async ({ page }) => {
  await page.locator('.pdp-buy-box__media .gallery__item:not([data-gallery-clone])').nth(2).evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected slide item');
    const grid = element.parentElement;
    if (!(grid instanceof HTMLElement)) throw new Error('Expected slideshow grid');
    grid.scrollTo({ left: element.offsetLeft, behavior: 'auto' });
  });

  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-03\.png$/);
});

// ─── State persistence ───

test('selected product persists across section switches', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('ridge-hoodie');
  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'ridge-hoodie');

  // Switch to nav and back
  await page.locator('.controls__picker').selectOption('nav');
  await expect(page.locator('.nav')).toBeVisible();

  await page.locator('.controls__picker').selectOption('pdp-buy-box');

  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'ridge-hoodie');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Heavyweight ridge hoodie');
  await expect(page.locator('select[name="productId"]')).toHaveValue('ridge-hoodie');
});

test('product selection serializes to URL', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('crescent-bag');

  const params = await getSearchParams(page);
  expect(params['pdp-buy-box.productId']).toBe('crescent-bag');
});

test('product selection restores from URL on reload', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('crescent-bag');

  await page.goto(page.url());

  await expect(page.locator('.controls__picker')).toHaveValue('pdp-buy-box');
  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'crescent-bag');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Medium nylon crescent bag');
  await expect(page.locator('select[name="productId"]')).toHaveValue('crescent-bag');
});

// ─── Edge cases ───

test('unknown product ID falls back to default product', async ({ page }) => {
  // Manually set an invalid product ID via URL
  await page.goto('/?section=pdp-buy-box&pdp-buy-box.productId=nonexistent');

  await expect(page.locator('.pdp-buy-box')).toBeVisible();
  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'summit-tee');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Very cool t-shirt');
  await expect(page.locator('select[name="productId"]')).toHaveValue('summit-tee');
});

test('section is readable in fluid viewport', async ({ page }) => {
  await page.locator('[data-viewport="fluid"]').click();

  await expect(page.locator('.pdp-buy-box')).toBeVisible();
  await expect(page.locator('.pdp-buy-box__title')).toBeVisible();
  await expect(activeMediaImage(page)).toBeVisible();
});

// ─── Responsive layout ───

test('375 viewport matches the planned mobile geometry', async ({ page }) => {
  await page.locator('[data-viewport="375"]').click();

  const metrics = await readBuyBoxMetrics(page);
  expect(Math.abs(metrics.mediaWidth - 343)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.detailsWidth - 343)).toBeLessThanOrEqual(1);
  expect(metrics.detailsTop).toBeGreaterThan(metrics.mediaBottom);
  expect(Math.abs(metrics.quantityWidth - 104)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.purchaseGap - 11)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.ctaWidth - 228)).toBeLessThanOrEqual(1);
});

test('768 viewport matches the planned medium geometry', async ({ page }) => {
  await page.locator('[data-viewport="768"]').click();

  const metrics = await readBuyBoxMetrics(page);
  expect(Math.abs(metrics.mediaTop - metrics.detailsTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.mediaWidth - 376)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.detailsWidth - 376)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.columnGap - 16)).toBeLessThanOrEqual(1);
});

test('1280 viewport matches the planned large geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.locator('[data-viewport="1280"]').click();

  const metrics = await readBuyBoxMetrics(page);
  expect(Math.abs(metrics.mediaTop - metrics.detailsTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.mediaWidth - 705)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.detailsWidth - 495)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.columnGap - 32)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.quantityWidth - 151)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.purchaseGap - 16)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.ctaWidth - 328)).toBeLessThanOrEqual(1);
});

test('viewport changes preserve selected product', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('ridge-hoodie');

  await page.locator('[data-viewport="768"]').click();
  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'ridge-hoodie');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Heavyweight ridge hoodie');

  await page.locator('[data-viewport="1280"]').click();
  await expect(page.locator('.pdp-buy-box')).toHaveAttribute('data-product-id', 'ridge-hoodie');
  await expect(page.locator('.pdp-buy-box__title')).toHaveText('Heavyweight ridge hoodie');
});
