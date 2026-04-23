import { expect, test } from 'playwright/test';

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

test('desktop rail scroll controls move the thumbnail rail without changing the active image', async ({ page }) => {
  await page.locator('[data-viewport="1280"]').click();
  await activeMediaTrigger(page).click();

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

test('changing the simulated viewport while the lightbox is open closes the viewer', async ({ page }) => {
  await activeMediaTrigger(page).click();
  await expect(lightbox(page)).toBeVisible();

  await page.locator('[data-viewport="1280"]').click();

  await expect(lightbox(page)).toHaveCount(0);
});
