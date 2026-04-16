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

  // Default state — includes new attributes
  await expect(gallery).toHaveAttribute('data-layout', 'grid');
  await expect(gallery).toHaveAttribute('data-columns', '3');
  await expect(gallery).toHaveAttribute('data-gap', 'md');
  await expect(gallery).toHaveAttribute('data-aspect', 'square');
  await expect(gallery).toHaveAttribute('data-fit', 'cover');
  await expect(gallery).toHaveAttribute('data-heading', '');

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

  // Type a heading — shows the heading element
  const headingInput = page.locator('input[name="heading"]');
  await headingInput.fill('My Gallery');
  await expect(gallery).toHaveAttribute('data-heading', 'My Gallery');
  await expect(page.locator('.gallery__heading')).toBeVisible();
  await expect(page.locator('.gallery__heading')).toHaveText('My Gallery');

  // Clear heading — hides it
  await headingInput.fill('');
  await expect(gallery).toHaveAttribute('data-heading', '');
  await expect(page.locator('.gallery__heading')).not.toBeVisible();

  // Change fill to contain
  await checkRadio(page, 'fit', 'contain');
  await expect(gallery).toHaveAttribute('data-fit', 'contain');
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

  // Configure: 4 columns, lg gap, masonry layout
  await checkRadio(page, 'columns', '4');
  await checkRadio(page, 'gap', 'lg');
  await checkRadio(page, 'layout', 'masonry');

  // Switch to nav
  await page.locator('.controls__picker').selectOption('nav');
  await expect(page.locator('.nav')).toBeVisible();

  // Switch back to gallery
  await page.locator('.controls__picker').selectOption('gallery');

  // Gallery state should be restored
  await expect(page.locator('.gallery')).toHaveAttribute('data-columns', '4');
  await expect(page.locator('.gallery')).toHaveAttribute('data-gap', 'lg');
  await expect(page.locator('.gallery')).toHaveAttribute('data-layout', 'masonry');
});

test('layout picker switches between grid, slideshow, masonry', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  const gallery = page.locator('.gallery');

  // Default is grid
  await expect(gallery).toHaveAttribute('data-layout', 'grid');

  // Switch to slideshow
  await checkRadio(page, 'layout', 'slideshow');
  await expect(gallery).toHaveAttribute('data-layout', 'slideshow');

  // Slideshow nav buttons should be visible
  await expect(page.locator('.gallery__prev')).toBeVisible();
  await expect(page.locator('.gallery__next')).toBeVisible();

  // Switch to masonry
  await checkRadio(page, 'layout', 'masonry');
  await expect(gallery).toHaveAttribute('data-layout', 'masonry');

  // Slideshow nav buttons should be hidden
  await expect(page.locator('.gallery__prev')).not.toBeVisible();

  // Switch back to grid
  await checkRadio(page, 'layout', 'grid');
  await expect(gallery).toHaveAttribute('data-layout', 'grid');
});

test('controls show/hide correctly per layout', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');

  // Grid: columns and gap visible, autoplay hidden
  const columnsControl = page.locator('[data-control="columns"]');
  const gapControl = page.locator('[data-control="gap"]');
  const autoplayControl = page.locator('[data-control="autoplay"]');
  const paginationControl = page.locator('[data-control="pagination"]');

  await expect(columnsControl).toBeVisible();
  await expect(gapControl).toBeVisible();
  await expect(autoplayControl).toBeHidden();
  await expect(paginationControl).toBeHidden();

  // Switch to slideshow: columns and gap hidden, autoplay and pagination visible
  await checkRadio(page, 'layout', 'slideshow');
  await expect(columnsControl).toBeHidden();
  await expect(gapControl).toBeHidden();
  await expect(autoplayControl).toBeVisible();
  await expect(paginationControl).toBeVisible();

  // Switch to masonry: columns and gap visible, autoplay hidden
  await checkRadio(page, 'layout', 'masonry');
  await expect(columnsControl).toBeVisible();
  await expect(gapControl).toBeVisible();
  await expect(autoplayControl).toBeHidden();
  await expect(paginationControl).toBeHidden();
});

test('slideshow pagination indicators render and track active slide', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  // Pagination should have indicators (one per slide)
  const indicators = page.locator('.gallery__pagination [role="tab"]');
  await expect(indicators).toHaveCount(12);

  // First should be selected
  await expect(indicators.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(indicators.nth(1)).toHaveAttribute('aria-selected', 'false');
});

test('slideshow prev/next buttons navigate slides', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  // Click next
  await page.locator('.gallery__next').click();
  // Wait for scroll to complete and observer to fire
  await page.waitForTimeout(500);

  // Second indicator should now be selected
  const indicators = page.locator('.gallery__pagination [role="tab"]');
  await expect(indicators.nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('slideshow counter shows correct text', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');

  const counter = page.locator('.gallery__counter');
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText('1 of 12');
});

test('slideshow state persists: layout + pagination across section switches', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');

  // Configure slideshow with counter pagination
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');

  // Switch to nav and back
  await page.locator('.controls__picker').selectOption('nav');
  await page.locator('.controls__picker').selectOption('gallery');

  // State should be restored
  await expect(page.locator('.gallery')).toHaveAttribute('data-layout', 'slideshow');
  await expect(page.locator('.gallery')).toHaveAttribute('data-pagination', 'counter');
  await expect(page.locator('.gallery__counter')).toBeVisible();
});

test('timing control visibility depends on autoplay toggle', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  const timingControl = page.locator('[data-control="timing"]');

  // Autoplay off → timing hidden
  await expect(timingControl).toBeHidden();

  // Turn on autoplay → timing visible
  await checkRadio(page, 'autoplay', 'true');
  await expect(timingControl).toBeVisible();

  // Turn off autoplay → timing hidden again
  await checkRadio(page, 'autoplay', 'false');
  await expect(timingControl).toBeHidden();
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
