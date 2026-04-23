import { expect, test } from 'playwright/test';
import { checkRadio } from './helpers';

function lightbox(page: import('playwright/test').Page) {
  return page.locator('.pdp-buy-box-lightbox[open]');
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

function backToTopButton(page: import('playwright/test').Page) {
  return lightbox(page).locator('.pdp-buy-box-lightbox__back-to-top');
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

async function stackScrollTop(page: import('playwright/test').Page) {
  return lightbox(page).locator('.pdp-buy-box-lightbox__stack').evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected lightbox stack');
    return element.scrollTop;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.controls__picker').selectOption('pdp-buy-box');
  await expect(page.locator('.pdp-buy-box')).toBeVisible();
  // Lightbox tests rely on carousel slideshow (pagination, navigation)
  await checkRadio(page, 'pdpLayout', 'carousel');
});

test('desktop opens the Huckberry-style lightbox from the selected source image', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await mediaPagination(page).nth(3).click();
  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-04\.png$/);
  await activeMediaTrigger(page).click();

  const dialog = lightbox(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-mode', 'desktop');
  await expect(dialog.locator('.pdp-buy-box-lightbox__rail-shell')).toBeVisible();
  await expect.poll(async () => activeFigureIndex(page)).toBe(3);
  await expect.poll(async () => activeRailIndex(page)).toBe(3);
});

test('desktop rail thumbnails scroll the stacked image viewer and update the selected state', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

  await lightbox(page).locator('.pdp-buy-box-lightbox__rail-thumb').nth(4).click();

  await expect.poll(async () => activeFigureIndex(page)).toBe(4);
  await expect.poll(async () => activeRailIndex(page)).toBe(4);
});

test('desktop keyboard arrows step between images in the stacked viewer', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => activeFigureIndex(page)).toBe(1);

  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('desktop close button and Escape dismiss the viewer and restore focus to the hero trigger', async ({ page }) => {
  const trigger = activeMediaTrigger(page);
  await page.locator('[data-viewport="1280"]').click();
  await trigger.click();

  await lightbox(page).locator('.pdp-buy-box-lightbox__close').click();
  await expect(lightbox(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(lightbox(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('desktop rail controls step through images and disable at the bounds', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

  const previousButton = lightbox(page).locator('.pdp-buy-box-lightbox__rail-control--up');
  const nextButton = lightbox(page).locator('.pdp-buy-box-lightbox__rail-control--down');

  await expect(previousButton).toBeDisabled();
  await expect(nextButton).toBeEnabled();

  await nextButton.click();
  await expect.poll(async () => activeFigureIndex(page)).toBe(1);
  await expect.poll(async () => activeRailIndex(page)).toBe(1);
  await expect(previousButton).toBeEnabled();

  await previousButton.click();
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
  await expect.poll(async () => activeRailIndex(page)).toBe(0);
  await expect(previousButton).toBeDisabled();
});

test('desktop rail selection stays on the target thumb while arrow controls animate', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

  const selectedIndices = await page.evaluate(async () => {
    const nextButton = document.querySelector('.pdp-buy-box-lightbox__rail-control--down');
    if (!(nextButton instanceof HTMLButtonElement)) {
      throw new Error('Expected next rail control');
    }

    const readSelectedIndex = () =>
      Array.from(document.querySelectorAll('.pdp-buy-box-lightbox__rail-thumb'))
        .findIndex((button) => button.getAttribute('data-selected') === 'true');

    const samples = [];
    nextButton.click();
    samples.push(readSelectedIndex());

    for (let frame = 0; frame < 8; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          samples.push(readSelectedIndex());
          resolve();
        });
      });
    }

    return samples;
  });

  expect(Array.from(new Set(selectedIndices))).toEqual([1]);
});

test('desktop back to top button scrolls the stack back to the first image', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

  const stack = lightbox(page).locator('.pdp-buy-box-lightbox__stack');
  await stack.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected lightbox stack');
    element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
  });

  await expect.poll(async () => stackScrollTop(page)).toBeGreaterThan(0);
  await backToTopButton(page).click();
  await expect.poll(async () => stackScrollTop(page)).toBe(0);
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('switching products while the desktop lightbox is open closes the viewer and rebuilds from the new product', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  await page.locator('select[name="productId"]').selectOption('crescent-bag');

  await expect(lightbox(page)).toHaveCount(0);
  await expect(activeMediaImage(page)).toHaveAttribute('src', /crescent-bag-01\.png$/);
});

test('mobile opens the same stacked viewer without the desktop thumbnail rail', async ({ page }) => {
  await mediaPagination(page).nth(4).click();
  await expect(activeMediaImage(page)).toHaveAttribute('src', /summit-tee-05\.png$/);
  await activeMediaTrigger(page).click();

  const dialog = lightbox(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-mode', 'mobile');
  await expect(dialog.locator('.pdp-buy-box-lightbox__rail-shell')).not.toBeVisible();
  await expect.poll(async () => activeFigureIndex(page)).toBe(4);
});

test('mobile opening from the first image does not pre-scroll the stack', async ({ page }) => {
  await page.locator('select[name="productId"]').selectOption('crescent-bag');
  await activeMediaTrigger(page).click();

  await expect(lightbox(page)).toBeVisible();
  await expect(backToTopButton(page)).toBeVisible();
  await expect.poll(async () => stackScrollTop(page)).toBe(0);
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('mobile opens without a surface bounce before the first frame', async ({ page }) => {
  const samples = await page.evaluate(async () => {
    const trigger = document.querySelector('.pdp-buy-box__media .gallery__item:not([data-gallery-clone]):not([inert]) .gallery__trigger');
    const dialog = document.querySelector('.pdp-buy-box-lightbox');
    if (!(trigger instanceof HTMLElement) || !(dialog instanceof HTMLDialogElement)) {
      throw new Error('Expected mobile lightbox trigger and dialog');
    }

    const readSample = () => {
      const surface = dialog.querySelector('.pdp-buy-box-lightbox__surface');
      const stack = dialog.querySelector('.pdp-buy-box-lightbox__stack');
      const surfaceRect = surface instanceof HTMLElement ? surface.getBoundingClientRect() : null;
      const stackRect = stack instanceof HTMLElement ? stack.getBoundingClientRect() : null;

      return {
        stackTop: stackRect ? Math.round(stackRect.top * 100) / 100 : null,
        surfaceTop: surfaceRect ? Math.round(surfaceRect.top * 100) / 100 : null,
        transform: surface instanceof HTMLElement ? window.getComputedStyle(surface).transform : null,
      };
    };

    const result = [];
    trigger.click();
    result.push(readSample());

    for (let frame = 0; frame < 4; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          result.push(readSample());
          resolve();
        });
      });
    }

    return result;
  });

  const surfaceTops = samples.map((sample) => sample.surfaceTop);
  const stackTops = samples.map((sample) => sample.stackTop);

  expect(new Set(samples.map((sample) => sample.transform)).size).toBe(1);
  expect(samples[0]?.transform).toBe('none');
  expect(Math.max(...surfaceTops) - Math.min(...surfaceTops)).toBe(0);
  expect(Math.max(...stackTops) - Math.min(...stackTops)).toBe(0);
});

test('mobile stack scrolling keeps the viewer open and reveals later images', async ({ page }) => {
  await activeMediaTrigger(page).click();
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
  await expect.poll(async () => stackScrollTop(page)).toBeGreaterThan(0);
});

test('mobile back to top button returns the stack to the first image', async ({ page }) => {
  await activeMediaTrigger(page).click();
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

  await expect.poll(async () => stackScrollTop(page)).toBeGreaterThan(0);
  await backToTopButton(page).click();
  await expect.poll(async () => stackScrollTop(page)).toBe(0);
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('changing the simulated viewport while the lightbox is open closes the viewer', async ({ page }) => {
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  await page.locator('[data-viewport="1280"]').click();

  await expect(lightbox(page)).toHaveCount(0);
});

test('focus is trapped inside the desktop lightbox', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  // Close button should receive focus on open
  await expect(lightbox(page).locator('.pdp-buy-box-lightbox__close')).toBeFocused();

  // Tab should stay within the lightbox dialog
  await page.keyboard.press('Tab');
  const focusedAfterTab = await page.evaluate(() => {
    const active = document.activeElement;
    return active?.closest('.pdp-buy-box-lightbox') !== null;
  });
  expect(focusedAfterTab).toBe(true);

  // Shift+Tab should also stay within the lightbox dialog
  await page.keyboard.press('Shift+Tab');
  const focusedAfterShiftTab = await page.evaluate(() => {
    const active = document.activeElement;
    return active?.closest('.pdp-buy-box-lightbox') !== null;
  });
  expect(focusedAfterShiftTab).toBe(true);
});

test('backdrop click closes the desktop lightbox', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  // The backdrop sits behind the surface in z-order, so dispatch click directly
  await page.locator('.pdp-buy-box-lightbox__backdrop').dispatchEvent('click');
  await expect(lightbox(page)).toHaveCount(0);
});

test('ArrowLeft at index 0 clamps and stays at 0 (does not wrap)', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);

  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => activeFigureIndex(page)).toBe(0);
});

test('ArrowRight at the last index clamps and stays at the last (does not wrap)', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  // Jump to the last image via rail thumbnail (use dispatchEvent to avoid
  // stability-check timeouts while the rail animates)
  const thumbs = lightbox(page).locator('.pdp-buy-box-lightbox__rail-thumb');
  const thumbCount = await thumbs.count();
  const lastIndex = thumbCount - 1;
  await thumbs.nth(lastIndex).dispatchEvent('click');
  await expect.poll(async () => activeFigureIndex(page)).toBe(lastIndex);

  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => activeFigureIndex(page)).toBe(lastIndex);
});

test('lightbox does not persist across section switches and leaves no stale inert attributes', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  // Switch to nav
  await page.locator('.controls__picker').selectOption('nav');
  await expect(page.locator('.nav')).toBeVisible();

  // Switch back to PDP buy box
  await page.locator('.controls__picker').selectOption('pdp-buy-box');
  await expect(page.locator('.pdp-buy-box')).toBeVisible();

  // Lightbox should not be open
  await expect(lightbox(page)).toHaveCount(0);

  // No stale inert attributes on PDP children
  const hasInert = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.pdp-buy-box > [inert]')).length;
  });
  expect(hasInert).toBe(0);
});
