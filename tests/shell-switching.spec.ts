import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// Helper to check a hidden radio input by dispatching a change event
async function checkRadio(page: import('playwright/test').Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test('boots with Navigation as default and shows picker', async ({ page }) => {
  const picker = page.locator('.controls__picker');
  await expect(picker).toBeVisible();
  await expect(picker).toHaveValue('nav');
  await expect(page.locator('.nav')).toBeVisible();
});

test('picker shows both Navigation and Image Gallery options', async ({ page }) => {
  const picker = page.locator('.controls__picker');
  const options = picker.locator('option');
  await expect(options).toHaveCount(2);
  await expect(options.nth(0)).toHaveText('Navigation');
  await expect(options.nth(1)).toHaveText('Image Gallery');
});

test('switching to gallery unmounts nav and shows gallery', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');

  await expect(page.locator('.nav')).toHaveCount(0);
  await expect(page.locator('.gallery')).toBeVisible();
  await expect(page.locator('.gallery__item')).not.toHaveCount(0);
});

test('gallery controls update data attributes', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');

  const gallery = page.locator('.gallery');

  // Default state
  await expect(gallery).toHaveAttribute('data-columns', '3');
  await expect(gallery).toHaveAttribute('data-gap', 'md');
  await expect(gallery).toHaveAttribute('data-aspect', 'square');

  // Change columns to 2
  await checkRadio(page, 'columns', '2');
  await expect(gallery).toHaveAttribute('data-columns', '2');

  // Change gap to lg
  await checkRadio(page, 'gap', 'lg');
  await expect(gallery).toHaveAttribute('data-gap', 'lg');

  // Change aspect to landscape
  await checkRadio(page, 'aspect', 'landscape');
  await expect(gallery).toHaveAttribute('data-aspect', 'landscape');

  // Toggle captions on
  await checkRadio(page, 'captions', 'true');
  await expect(gallery).toHaveAttribute('data-captions', 'true');
  await expect(page.locator('.gallery__caption').first()).toBeVisible();
});

test('state round-trip: configure nav → gallery → nav → verify state', async ({ page }) => {
  // Configure nav: switch to tile variant
  await checkRadio(page, 'variant', 'tile');
  await expect(page.locator('.nav')).toHaveAttribute('data-variant', 'tile');

  // Switch to gallery
  await page.locator('.controls__picker').selectOption('gallery');
  await expect(page.locator('.gallery')).toBeVisible();

  // Switch back to nav
  await page.locator('.controls__picker').selectOption('nav');

  // Nav should have tile variant restored
  await expect(page.locator('.nav')).toHaveAttribute('data-variant', 'tile');
  // The variant radio should be checked
  const tileRadio = page.locator('input[name="variant"][value="tile"]');
  await expect(tileRadio).toBeChecked();
});

test('gallery state persists across switches', async ({ page }) => {
  // Switch to gallery
  await page.locator('.controls__picker').selectOption('gallery');

  // Configure: 4 columns, lg gap
  await checkRadio(page, 'columns', '4');
  await checkRadio(page, 'gap', 'lg');

  // Switch to nav
  await page.locator('.controls__picker').selectOption('nav');
  await expect(page.locator('.nav')).toBeVisible();

  // Switch back to gallery
  await page.locator('.controls__picker').selectOption('gallery');

  // Gallery state should be restored
  await expect(page.locator('.gallery')).toHaveAttribute('data-columns', '4');
  await expect(page.locator('.gallery')).toHaveAttribute('data-gap', 'lg');
});

test('viewport width persists across component switches', async ({ page }) => {
  // Set viewport to 1280
  await page.locator('[data-viewport="1280"]').click();

  // Verify style.width is set (computed width depends on window size)
  const preview = page.locator('#preview-root');
  await expect(preview).toHaveAttribute('style', /width:\s*1280px/);

  // Switch to gallery
  await page.locator('.controls__picker').selectOption('gallery');

  // Viewport should persist
  await expect(preview).toHaveAttribute('style', /width:\s*1280px/);

  // Switch back to nav
  await page.locator('.controls__picker').selectOption('nav');
  await expect(preview).toHaveAttribute('style', /width:\s*1280px/);
});

test('controls sync: set tile variant → switch → switch back → controls show tile', async ({ page }) => {
  // Set tile variant
  await checkRadio(page, 'variant', 'tile');

  // Set uppercase capitalization
  await checkRadio(page, 'capitalization', 'uppercase');

  // Switch to gallery and back
  await page.locator('.controls__picker').selectOption('gallery');
  await page.locator('.controls__picker').selectOption('nav');

  // Verify controls reflect restored state
  await expect(page.locator('input[name="variant"][value="tile"]')).toBeChecked();
  await expect(page.locator('input[name="capitalization"][value="uppercase"]')).toBeChecked();
});
