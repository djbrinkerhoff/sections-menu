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

async function getSearchParams(page: import('playwright/test').Page) {
  return page.evaluate(() => Object.fromEntries(new URLSearchParams(window.location.search).entries()));
}

async function selectedSlideshowIndex(page: import('playwright/test').Page) {
  return page.locator('.gallery__pagination [role="tab"]').evaluateAll((tabs) =>
    tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
  );
}

async function waitForSelectedSlideshowIndex(page: import('playwright/test').Page, index: number) {
  await expect.poll(async () => selectedSlideshowIndex(page)).toBe(index);
}

async function readSlideshowArrowTops(page: import('playwright/test').Page) {
  return page.evaluate(() => {
    const prev = document.querySelector('.gallery__prev');
    const next = document.querySelector('.gallery__next');
    if (!(prev instanceof HTMLElement) || !(next instanceof HTMLElement)) {
      throw new Error('Expected slideshow arrows');
    }

    return {
      prevTop: prev.getBoundingClientRect().top,
      nextTop: next.getBoundingClientRect().top,
    };
  });
}

async function readAutoAspectSpacing(page: import('playwright/test').Page) {
  return page.evaluate(() => {
    const item = document.querySelector('.gallery__item');
    const image = item?.querySelector('.gallery__image');
    if (!(item instanceof HTMLElement) || !(image instanceof HTMLElement)) {
      throw new Error('Expected slideshow item and image');
    }

    const itemRect = item.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();

    return {
      topGap: imageRect.top - itemRect.top,
      bottomGap: itemRect.bottom - imageRect.bottom,
    };
  });
}

test('boots with Navigation as default and shows picker', async ({ page }) => {
  const picker = page.locator('.controls__picker');
  await expect(picker).toBeVisible();
  await expect(picker).toHaveValue('nav');
  await expect(page.locator('.nav')).toBeVisible();
});

test('picker shows Navigation, Image Gallery, and Single Image options', async ({ page }) => {
  const picker = page.locator('.controls__picker');
  const options = picker.locator('option');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveText('Navigation');
  await expect(options.nth(1)).toHaveText('Image Gallery');
  await expect(options.nth(2)).toHaveText('Single Image');
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

  // Second indicator should now be selected
  await waitForSelectedSlideshowIndex(page, 1);
});

test('slideshow wraps from the last slide back to the first without animating through the strip', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  const indicators = page.locator('.gallery__pagination [role="tab"]');
  const grid = page.locator('.gallery__grid');

  await indicators.nth(11).click();
  await waitForSelectedSlideshowIndex(page, 11);

  await page.locator('.gallery__next').click();
  await expect.poll(async () =>
    grid.evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw new Error('Expected .gallery__grid to be an HTMLElement');
      return node.scrollLeft;
    }),
  ).toBeLessThan(5);
  await waitForSelectedSlideshowIndex(page, 0);
});

test('slideshow counter shows correct text', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');

  const counter = page.locator('.gallery__counter');
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText('1 of 12');
});

test('slideshow arrows stay vertically aligned when pagination style changes', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  const prev = page.locator('.gallery__prev');
  const next = page.locator('.gallery__next');

  const baseline = await readSlideshowArrowTops(page);

  for (const pagination of ['dots', 'dashes', 'thumbnails', 'counter'] as const) {
    await checkRadio(page, 'pagination', pagination);

    const current = await readSlideshowArrowTops(page);

    expect(Math.abs(current.prevTop - baseline.prevTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(current.nextTop - baseline.nextTop)).toBeLessThanOrEqual(1);
  }

  await expect(prev).toBeVisible();
  await expect(next).toBeVisible();
});

test('slideshow arrows stay vertically aligned when captions toggle', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');

  const baseline = await readSlideshowArrowTops(page);

  for (const captions of ['true', 'false'] as const) {
    await checkRadio(page, 'captions', captions);

    const current = await readSlideshowArrowTops(page);

    expect(Math.abs(current.prevTop - baseline.prevTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(current.nextTop - baseline.nextTop)).toBeLessThanOrEqual(1);
  }
});

test('slideshow arrows stay vertically aligned when auto aspect slides change height', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'aspect', 'auto');
  await expect
    .poll(async () => {
      const spacing = await readAutoAspectSpacing(page);
      return spacing.topGap > 0 && spacing.bottomGap > 0;
    })
    .toBe(true);

  const indicators = page.locator('.gallery__pagination [role="tab"]');
  const baseline = await readSlideshowArrowTops(page);

  for (const targetIndex of [3, 7, 11]) {
    await indicators.nth(targetIndex).click();
    await waitForSelectedSlideshowIndex(page, targetIndex);

    await expect
      .poll(async () => {
        const current = await readSlideshowArrowTops(page);
        return Math.max(
          Math.abs(current.prevTop - baseline.prevTop),
          Math.abs(current.nextTop - baseline.nextTop),
        );
      })
      .toBeLessThanOrEqual(1);
  }
});

test('slideshow auto aspect vertically centers shorter images', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'aspect', 'auto');
  await expect
    .poll(async () => {
      const spacing = await readAutoAspectSpacing(page);
      return spacing.topGap > 0 && spacing.bottomGap > 0 && Math.abs(spacing.topGap - spacing.bottomGap) <= 1;
    })
    .toBe(true);

  const spacing = await readAutoAspectSpacing(page);

  expect(spacing.topGap).toBeGreaterThan(0);
  expect(spacing.bottomGap).toBeGreaterThan(0);
  expect(Math.abs(spacing.topGap - spacing.bottomGap)).toBeLessThanOrEqual(1);
});

test('slideshow dots, dashes, and counter inherit the gallery text color', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'text-color', '#1841D4');

  const gallery = page.locator('.gallery');
  const expectedColor = await gallery.evaluate((node) => getComputedStyle(node).color);

  const dotColor = await page.locator('.gallery__pagination .gallery__indicator').first().evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  expect(dotColor).toBe(expectedColor);
  const dotBackgroundImage = await page.locator('.gallery__pagination .gallery__indicator').first().evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(dotBackgroundImage).toBe('none');

  await checkRadio(page, 'pagination', 'dashes');
  const dashColor = await page.locator('.gallery__pagination .gallery__indicator').first().evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  expect(dashColor).toBe(expectedColor);
  const dashBackgroundImage = await page.locator('.gallery__pagination .gallery__indicator').first().evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(dashBackgroundImage).toBe('none');

  await checkRadio(page, 'pagination', 'counter');
  const counter = page.locator('.gallery__counter');
  await expect(counter).toBeVisible();
  const counterColor = await counter.evaluate((node) => getComputedStyle(node).color);
  expect(counterColor).toBe(expectedColor);

  await checkRadio(page, 'pagination', 'thumbnails');
  const thumbnailBackgroundImage = await page.locator('.gallery__pagination .gallery__indicator').first().evaluate(
    (node) => getComputedStyle(node).backgroundImage,
  );
  expect(thumbnailBackgroundImage).not.toBe('none');
});

test('slideshow pagination stays within the image container across styles', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await page.locator('[data-viewport="375"]').click();
  await checkRadio(page, 'layout', 'slideshow');

  for (const pagination of ['dots', 'dashes', 'thumbnails'] as const) {
    await checkRadio(page, 'pagination', pagination);

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('.gallery__grid');
      const pagination = document.querySelector('.gallery__pagination');
      if (!(grid instanceof HTMLElement) || !(pagination instanceof HTMLElement)) {
        throw new Error('Expected slideshow grid and pagination');
      }

      return {
        gridWidth: grid.getBoundingClientRect().width,
        paginationWidth: pagination.getBoundingClientRect().width,
        paginationScrollWidth: pagination.scrollWidth,
        paginationClientWidth: pagination.clientWidth,
      };
    });

    expect(metrics.paginationWidth).toBeLessThanOrEqual(metrics.gridWidth + 1);
    expect(metrics.paginationScrollWidth).toBeLessThanOrEqual(metrics.paginationClientWidth + 1);
  }

  await checkRadio(page, 'pagination', 'counter');
  const counterMetrics = await page.evaluate(() => {
    const grid = document.querySelector('.gallery__grid');
    const counter = document.querySelector('.gallery__counter');
    if (!(grid instanceof HTMLElement) || !(counter instanceof HTMLElement)) {
      throw new Error('Expected slideshow grid and counter');
    }

    return {
      gridWidth: grid.getBoundingClientRect().width,
      counterWidth: counter.getBoundingClientRect().width,
    };
  });

  expect(counterMetrics.counterWidth).toBeLessThanOrEqual(counterMetrics.gridWidth + 1);
});

test('slideshow pagination does not stretch with only a few items', async ({ page }) => {
  await page.locator('.controls__picker').selectOption('gallery');
  await page.locator('[data-viewport="375"]').click();
  await page.locator('input[aria-label="Images"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected Images input');
    input.value = '3';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await checkRadio(page, 'layout', 'slideshow');

  for (const pagination of ['dots', 'dashes', 'thumbnails'] as const) {
    await checkRadio(page, 'pagination', pagination);

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('.gallery__grid');
      const pagination = document.querySelector('.gallery__pagination');
      if (!(grid instanceof HTMLElement) || !(pagination instanceof HTMLElement)) {
        throw new Error('Expected slideshow grid and pagination');
      }

      return {
        gridWidth: grid.getBoundingClientRect().width,
        paginationWidth: pagination.getBoundingClientRect().width,
      };
    });

    expect(metrics.paginationWidth).toBeLessThan(metrics.gridWidth - 20);
  }

  await checkRadio(page, 'pagination', 'counter');
  const counterMetrics = await page.evaluate(() => {
    const grid = document.querySelector('.gallery__grid');
    const counter = document.querySelector('.gallery__counter');
    if (!(grid instanceof HTMLElement) || !(counter instanceof HTMLElement)) {
      throw new Error('Expected slideshow grid and counter');
    }

    return {
      gridWidth: grid.getBoundingClientRect().width,
      counterWidth: counter.getBoundingClientRect().width,
    };
  });

  expect(counterMetrics.counterWidth).toBeLessThan(counterMetrics.gridWidth - 20);
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

test('URL reflects the active section, viewport, and saved section state', async ({ page }) => {
  await checkRadio(page, 'variant', 'tile');
  await checkRadio(page, 'capitalization', 'uppercase');
  await page.locator('[data-control="nav-items"] button[aria-label="Increase Nav items"]').click();
  await page.locator('[data-viewport="768"]').click();

  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');
  await page.locator('input[name="heading"]').fill('Shareable gallery');

  const params = await getSearchParams(page);

  expect(params.section).toBe('gallery');
  expect(params.viewport).toBe('768');
  expect(params['nav.variant']).toBe('tile');
  expect(params['nav.capitalization']).toBe('uppercase');
  expect(params['nav.custom:navItemCount']).toBe('5');
  expect(params['gallery.layout']).toBe('slideshow');
  expect(params['gallery.pagination']).toBe('counter');
  expect(params['gallery.heading']).toBe('Shareable gallery');
});

test('URL state restores the active section, viewport, and both section states on reload', async ({ page }) => {
  await checkRadio(page, 'variant', 'tile');
  await checkRadio(page, 'capitalization', 'uppercase');
  await page.locator('[data-control="nav-items"] button[aria-label="Increase Nav items"]').click();
  await page.locator('[data-viewport="1280"]').click();

  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');
  await checkRadio(page, 'captions', 'true');
  await page.locator('input[name="heading"]').fill('Reloaded gallery');

  const sharedUrl = page.url();
  await page.goto(sharedUrl);

  await expect(page.locator('.controls__picker')).toHaveValue('gallery');
  await expect(page.locator('.gallery')).toHaveAttribute('data-layout', 'slideshow');
  await expect(page.locator('.gallery')).toHaveAttribute('data-pagination', 'counter');
  await expect(page.locator('.gallery')).toHaveAttribute('data-captions', 'true');
  await expect(page.locator('.gallery')).toHaveAttribute('data-heading', 'Reloaded gallery');
  await expect(page.locator('input[name="heading"]')).toHaveValue('Reloaded gallery');
  await expect(page.locator('#preview-root')).toHaveAttribute('style', /width:\s*1280px/);

  await page.locator('.controls__picker').selectOption('nav');
  await expect(page.locator('.nav')).toHaveAttribute('data-variant', 'tile');
  await expect(page.locator('.nav')).toHaveAttribute('data-capitalization', 'uppercase');
  await expect(page.locator('input[name="variant"][value="tile"]')).toBeChecked();
  await expect(page.locator('input[name="capitalization"][value="uppercase"]')).toBeChecked();
  await expect(page.locator('[data-control="nav-items"] input[aria-label="Nav items"]')).toHaveValue('5');
});

test('reset clears URL params and restores default shell and section state', async ({ page }) => {
  await checkRadio(page, 'variant', 'tile');
  await checkRadio(page, 'capitalization', 'uppercase');
  await page.locator('[data-control="nav-items"] button[aria-label="Increase Nav items"]').click();
  await page.locator('[data-viewport="1280"]').click();

  await page.locator('.controls__picker').selectOption('gallery');
  await checkRadio(page, 'layout', 'slideshow');
  await checkRadio(page, 'pagination', 'counter');
  await page.locator('input[name="heading"]').fill('Reset me');

  await page.locator('[data-reset-state]').click();

  expect(await getSearchParams(page)).toEqual({});
  await expect(page.locator('.controls__picker')).toHaveValue('nav');
  await expect(page.locator('[data-viewport="375"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#preview-root')).toHaveAttribute('style', /width:\s*375px/);
  await expect(page.locator('.nav')).toHaveAttribute('data-variant', 'simple');
  await expect(page.locator('.nav')).toHaveAttribute('data-capitalization', 'normal');
  await expect(page.locator('input[name="variant"][value="simple"]')).toBeChecked();
  await expect(page.locator('input[name="capitalization"][value="normal"]')).toBeChecked();
  await expect(page.locator('[data-control="nav-items"] input[aria-label="Nav items"]')).toHaveValue('4');

  await page.locator('.controls__picker').selectOption('gallery');
  await expect(page.locator('.gallery')).toHaveAttribute('data-layout', 'grid');
  await expect(page.locator('.gallery')).toHaveAttribute('data-pagination', 'dots');
  await expect(page.locator('.gallery')).toHaveAttribute('data-heading', '');
  await expect(page.locator('input[name="heading"]')).toHaveValue('');
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
