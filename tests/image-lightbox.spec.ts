import { expect, test } from 'playwright/test';

// Helper to check a hidden radio input by dispatching a change event
async function checkRadio(page: import('playwright/test').Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─── Standalone (Single Image) mode ───

test.describe('standalone mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.controls__picker').selectOption('single-image');
    await expect(page.locator('.single-image')).toBeVisible();
  });

  test('clicking the image opens the lightbox', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');
    await trigger.click();

    const dialog = page.locator('.image-lightbox[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.image-lightbox__image')).toBeVisible();
  });

  test('lightbox opens with no prev/next controls in single mode', async ({ page }) => {
    await page.locator('.single-image__trigger').click();

    const dialog = page.locator('.image-lightbox[open]');
    await expect(dialog).toHaveAttribute('data-mode', 'single');
    await expect(dialog.locator('.image-lightbox__nav--prev')).not.toBeVisible();
    await expect(dialog.locator('.image-lightbox__nav--next')).not.toBeVisible();
    await expect(dialog.locator('.image-lightbox__footer')).not.toBeVisible();
  });

  test('Escape closes the lightbox and restores focus to trigger', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');
    await trigger.click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('close button closes the lightbox and restores focus', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');
    await trigger.click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    await page.locator('.image-lightbox__close').click();
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('backdrop click closes the lightbox', async ({ page }) => {
    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // The backdrop sits behind the surface in z-order, so dispatch click directly
    await page.locator('.image-lightbox__backdrop').dispatchEvent('click');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });

  test('Enter key on trigger opens the lightbox', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();
  });

  test('Space key on trigger opens the lightbox', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');
    await trigger.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();
  });

  test('trigger has aria-expanded attributes', async ({ page }) => {
    const trigger = page.locator('.single-image__trigger');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('lightbox is contained inside the section root, not fixed', async ({ page }) => {
    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    const position = await page.locator('.image-lightbox').evaluate(
      (el) => getComputedStyle(el).position,
    );
    expect(position).toBe('absolute');
  });

  test('focus is trapped inside the lightbox', async ({ page }) => {
    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Close button should have focus initially
    await expect(page.locator('.image-lightbox__close')).toBeFocused();

    // Tab should cycle within the lightbox
    await page.keyboard.press('Tab');
    const focusedAfterTab = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.closest('.image-lightbox') !== null;
    });
    expect(focusedAfterTab).toBe(true);

    // Shift+Tab should also stay in the lightbox
    await page.keyboard.press('Shift+Tab');
    const focusedAfterShiftTab = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.closest('.image-lightbox') !== null;
    });
    expect(focusedAfterShiftTab).toBe(true);
  });

  test('host siblings are inerted while lightbox is open', async ({ page }) => {
    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    const siblingInerted = await page.evaluate(() => {
      const dialog = document.querySelector('.image-lightbox');
      const host = dialog?.parentElement;
      if (!host) return false;
      return Array.from(host.children)
        .filter((child) => child !== dialog)
        .every((child) => child.hasAttribute('inert'));
    });
    expect(siblingInerted).toBe(true);

    // After close, inert should be removed (wait for close animation to finish)
    await page.keyboard.press('Escape');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
    const siblingInertedAfter = await page.evaluate(() => {
      const section = document.querySelector('.single-image');
      if (!section) return true;
      return Array.from(section.children)
        .filter((child) => !child.classList.contains('image-lightbox'))
        .some((child) => child.hasAttribute('inert'));
    });
    expect(siblingInertedAfter).toBe(false);
  });
});

// ─── Collection (Gallery) mode ───

test.describe('gallery collection mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.controls__picker').selectOption('gallery');
    await expect(page.locator('.gallery')).toBeVisible();
    await checkRadio(page, 'lightbox', 'true');
  });

  test('clicking a gallery image opens the lightbox in collection mode', async ({ page }) => {
    const triggers = page.locator('.gallery__trigger');
    await triggers.first().click();

    const dialog = page.locator('.image-lightbox[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-mode', 'collection');
  });

  test('prev/next controls are visible in collection mode', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();

    const dialog = page.locator('.image-lightbox[open]');
    await expect(dialog.locator('.image-lightbox__nav--prev')).toBeVisible();
    await expect(dialog.locator('.image-lightbox__nav--next')).toBeVisible();
  });

  test('counter shows correct position text', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();

    const counter = page.locator('.image-lightbox__counter');
    await expect(counter).toHaveText('1 of 12');
  });

  test('clicking third image opens at index 3', async ({ page }) => {
    await page.locator('.gallery__trigger').nth(2).click();

    const counter = page.locator('.image-lightbox__counter');
    await expect(counter).toHaveText('3 of 12');
  });

  test('next button advances to next image', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('1 of 12');

    await page.locator('.image-lightbox__nav--next').click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('2 of 12');
  });

  test('prev button goes to previous image', async ({ page }) => {
    await page.locator('.gallery__trigger').nth(2).click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('3 of 12');

    await page.locator('.image-lightbox__nav--prev').click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('2 of 12');
  });

  test('prev is disabled on first image, next disabled on last', async ({ page }) => {
    // Open first image
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox__nav--prev')).toBeDisabled();
    await expect(page.locator('.image-lightbox__nav--next')).not.toBeDisabled();

    await page.keyboard.press('Escape');

    // Open last image
    await page.locator('.gallery__trigger').nth(11).click();
    await expect(page.locator('.image-lightbox__nav--next')).toBeDisabled();
    await expect(page.locator('.image-lightbox__nav--prev')).not.toBeDisabled();
  });

  test('ArrowRight and ArrowLeft navigate images', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('1 of 12');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.image-lightbox__counter')).toHaveText('2 of 12');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.image-lightbox__counter')).toHaveText('3 of 12');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.image-lightbox__counter')).toHaveText('2 of 12');
  });

  test('ArrowLeft on first image does not wrap', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('1 of 12');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.image-lightbox__counter')).toHaveText('1 of 12');
  });

  test('ArrowRight on last image does not wrap', async ({ page }) => {
    await page.locator('.gallery__trigger').nth(11).click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('12 of 12');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.image-lightbox__counter')).toHaveText('12 of 12');
  });

  test('Escape closes and restores focus to invoking trigger', async ({ page }) => {
    const trigger = page.locator('.gallery__trigger').nth(2);
    await trigger.click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('hidden images are excluded from the collection', async ({ page }) => {
    // Reduce visible images to 3
    await page.locator('input[aria-label="Images"]').evaluate((input) => {
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected Images input');
      input.value = '3';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox__counter')).toHaveText('1 of 3');
  });

  test('lightbox opens correctly from all three gallery layouts', async ({ page }) => {
    for (const layout of ['grid', 'masonry', 'slideshow'] as const) {
      await checkRadio(page, 'layout', layout);
      // Allow layout to settle
      await page.waitForTimeout(100);

      await page.locator('.gallery__trigger').first().click();
      await expect(page.locator('.image-lightbox[open]')).toBeVisible();
      await expect(page.locator('.image-lightbox')).toHaveAttribute('data-mode', 'collection');

      await page.keyboard.press('Escape');
      await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
    }
  });

  test('lightbox does not open when toggle is off (default)', async ({ page }) => {
    // Lightbox is off by default — turn it off explicitly to be sure
    await checkRadio(page, 'lightbox', 'false');
    await page.locator('.gallery__trigger').first().click();
    // Short wait to verify nothing opens
    await page.waitForTimeout(200);
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });

  test('turning lightbox off while open closes it', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    await checkRadio(page, 'lightbox', 'false');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });
});

// ─── Gallery + Slideshow coordination ───

test.describe('slideshow coordination', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.controls__picker').selectOption('gallery');
    await checkRadio(page, 'lightbox', 'true');
    await checkRadio(page, 'layout', 'slideshow');
    await page.waitForTimeout(100);
  });

  test('opening from slideshow preserves inline slideshow state after close', async ({ page }) => {
    const indicators = page.locator('.gallery__pagination [role="tab"]');

    // Navigate inline slideshow to slide 3
    await indicators.nth(2).click();
    await page.waitForTimeout(500);
    await expect(indicators.nth(2)).toHaveAttribute('aria-selected', 'true');

    // Open lightbox from the active slide's trigger
    await page.locator('.gallery__trigger').nth(2).click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Close lightbox
    await page.keyboard.press('Escape');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);

    // Inline slideshow should still show slide 3
    await expect(indicators.nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('changing layout while lightbox is open closes it cleanly', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Switch to grid layout
    await checkRadio(page, 'layout', 'grid');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });

  test('changing image count while lightbox is open closes it', async ({ page }) => {
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Reduce image count
    await page.locator('input[aria-label="Images"]').evaluate((input) => {
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected Images input');
      input.value = '3';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });
});

// ─── Section switching lifecycle ───

test.describe('lifecycle and section switching', () => {
  test('lightbox does not persist across section switches', async ({ page }) => {
    // Open lightbox in gallery
    await page.locator('.controls__picker').selectOption('gallery');
    await checkRadio(page, 'lightbox', 'true');
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Switch to nav
    await page.locator('.controls__picker').selectOption('nav');
    await expect(page.locator('.image-lightbox')).toHaveCount(0);

    // Switch back to gallery — no open lightbox
    await page.locator('.controls__picker').selectOption('gallery');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });

  test('lightbox does not persist in standalone mode across switches', async ({ page }) => {
    await page.locator('.controls__picker').selectOption('single-image');
    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Switch to nav and back
    await page.locator('.controls__picker').selectOption('nav');
    await page.locator('.controls__picker').selectOption('single-image');
    await expect(page.locator('.image-lightbox[open]')).toHaveCount(0);
  });

  test('inert state is cleaned up after section switch', async ({ page }) => {
    await page.locator('.controls__picker').selectOption('gallery');
    await checkRadio(page, 'lightbox', 'true');
    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    // Switch away destroys cleanly
    await page.locator('.controls__picker').selectOption('nav');

    // Switch back — no stale inert attributes
    await page.locator('.controls__picker').selectOption('gallery');
    const hasInert = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.gallery > [inert]')).length;
    });
    expect(hasInert).toBe(0);
  });
});

// ─── Viewport containment ───

test.describe('viewport containment', () => {
  test('lightbox stays contained at 375px preview width', async ({ page }) => {
    await page.locator('.controls__picker').selectOption('single-image');
    await page.locator('[data-viewport="375"]').click();

    await page.locator('.single-image__trigger').click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    const contained = await page.evaluate(() => {
      const dialog = document.querySelector('.image-lightbox');
      const host = dialog?.parentElement;
      if (!dialog || !host) return false;
      const dialogRect = dialog.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return (
        dialogRect.left >= hostRect.left - 1 &&
        dialogRect.right <= hostRect.right + 1 &&
        dialogRect.top >= hostRect.top - 1
      );
    });
    expect(contained).toBe(true);
  });

  test('lightbox stays contained at 1280px preview width', async ({ page }) => {
    await page.locator('.controls__picker').selectOption('gallery');
    await checkRadio(page, 'lightbox', 'true');
    await page.locator('[data-viewport="1280"]').click();

    await page.locator('.gallery__trigger').first().click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    const contained = await page.evaluate(() => {
      const dialog = document.querySelector('.image-lightbox');
      const host = dialog?.parentElement;
      if (!dialog || !host) return false;
      const dialogRect = dialog.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return (
        dialogRect.left >= hostRect.left - 1 &&
        dialogRect.right <= hostRect.right + 1 &&
        dialogRect.top >= hostRect.top - 1
      );
    });
    expect(contained).toBe(true);
  });

  test('gallery lightbox stays contained at 768px preview width', async ({ page }) => {
    await page.locator('.controls__picker').selectOption('gallery');
    await checkRadio(page, 'lightbox', 'true');
    await page.locator('[data-viewport="768"]').click();

    await page.locator('.gallery__trigger').nth(1).click();
    await expect(page.locator('.image-lightbox[open]')).toBeVisible();

    const contained = await page.evaluate(() => {
      const dialog = document.querySelector('.image-lightbox');
      const host = dialog?.parentElement;
      if (!dialog || !host) return false;
      const dialogRect = dialog.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return (
        dialogRect.left >= hostRect.left - 1 &&
        dialogRect.right <= hostRect.right + 1 &&
        dialogRect.top >= hostRect.top - 1
      );
    });
    expect(contained).toBe(true);
  });
});
