import { expect, test } from 'playwright/test';
import { checkRadio } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.controls__picker').selectOption('single-image');
  await expect(page.locator('.single-image')).toBeVisible();
});

const SHAPES = ['circle', 'arch', 'blob', 'diamond', 'star', 'heart'] as const;

// ─── Shape selection ───

test('default mask is "none"', async ({ page }) => {
  await expect(page.locator('.single-image')).toHaveAttribute('data-mask', 'none');
  await expect(page.locator('input[name="mask"][value="none"]')).toBeChecked();
});

test('each shape sets the correct data-mask value', async ({ page }) => {
  for (const shape of SHAPES) {
    await checkRadio(page, 'mask', shape);
    await expect(page.locator('.single-image')).toHaveAttribute('data-mask', shape);
  }
});

test('only one shape is selected at a time', async ({ page }) => {
  await checkRadio(page, 'mask', 'circle');
  await expect(page.locator('input[name="mask"][value="circle"]')).toBeChecked();
  await expect(page.locator('input[name="mask"][value="none"]')).not.toBeChecked();

  await checkRadio(page, 'mask', 'star');
  await expect(page.locator('input[name="mask"][value="star"]')).toBeChecked();
  await expect(page.locator('input[name="mask"][value="circle"]')).not.toBeChecked();
});

test('selecting "None" clears mask custom properties', async ({ page }) => {
  await checkRadio(page, 'mask', 'circle');

  const hasMaskSrc = await page.locator('.single-image').evaluate(
    (el) => el.style.getPropertyValue('--mask-src') !== '',
  );
  expect(hasMaskSrc).toBe(true);

  await checkRadio(page, 'mask', 'none');

  const maskSrcAfter = await page.locator('.single-image').evaluate(
    (el) => el.style.getPropertyValue('--mask-src'),
  );
  expect(maskSrcAfter).toBe('');
});

// ─── Mask application ───

test('active mask applies mask-image CSS to the trigger', async ({ page }) => {
  await checkRadio(page, 'mask', 'circle');

  const maskImage = await page.locator('.single-image__trigger').evaluate(
    (el) => getComputedStyle(el).maskImage,
  );
  expect(maskImage).toContain('circle.svg');
});

test('"None" shows no mask-image on the trigger', async ({ page }) => {
  const maskImage = await page.locator('.single-image__trigger').evaluate(
    (el) => getComputedStyle(el).maskImage,
  );
  expect(maskImage).toBe('none');
});

// ─── Lightbox ───

test('lightbox image has no mask-image when a shape is active', async ({ page }) => {
  await checkRadio(page, 'mask', 'heart');

  await page.locator('.single-image__trigger').click();
  await expect(page.locator('.image-lightbox[open]')).toBeVisible();

  const lightboxMask = await page.locator('.image-lightbox__image').evaluate(
    (el) => getComputedStyle(el).maskImage,
  );
  expect(lightboxMask).toBe('none');
});

// ─── State persistence ───

test('mask shape persists across section switches', async ({ page }) => {
  await checkRadio(page, 'mask', 'diamond');
  await expect(page.locator('.single-image')).toHaveAttribute('data-mask', 'diamond');

  await page.locator('.controls__picker').selectOption('gallery');
  await expect(page.locator('.gallery')).toBeVisible();

  await page.locator('.controls__picker').selectOption('single-image');
  await expect(page.locator('.single-image')).toHaveAttribute('data-mask', 'diamond');
  await expect(page.locator('input[name="mask"][value="diamond"]')).toBeChecked();

  // CSS custom props are re-derived from data-mask on restore
  const maskSrc = await page.locator('.single-image').evaluate(
    (el) => el.style.getPropertyValue('--mask-src'),
  );
  expect(maskSrc).toContain('diamond.svg');
});

test('URL state includes mask value', async ({ page }) => {
  await checkRadio(page, 'mask', 'blob');

  const url = new URL(page.url());
  expect(url.searchParams.get('single-image.mask')).toBe('blob');
});

// ─── Border radius removal ───

test('no border-radius control exists in single-image controls', async ({ page }) => {
  await expect(page.locator('[data-control="radius"]')).toHaveCount(0);
  await expect(page.locator('input[name="radius"]')).toHaveCount(0);
});

// ─── Keyboard navigation ───

test('arrow keys navigate between shape swatches', async ({ page }) => {
  await page.locator('input[name="mask"][value="none"]').focus();
  await expect(page.locator('input[name="mask"][value="none"]')).toBeChecked();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="mask"][value="circle"]')).toBeChecked();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="mask"][value="arch"]')).toBeChecked();
});
