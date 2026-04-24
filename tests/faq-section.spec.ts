import { expect, test } from 'playwright/test';
import { checkRadio } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.controls__picker').selectOption('faq');
});

async function setStepperValue(page: import('playwright/test').Page, controlName: string, value: number) {
  await page.locator(`[data-control="${controlName}"] .control-stepper__value`).evaluate((input, nextValue) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected stepper input');
    if (typeof nextValue !== 'number') throw new Error('Expected numeric stepper value');
    input.value = String(nextValue);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function chooseSwatch(page: import('playwright/test').Page, controlName: string, label: string) {
  await page.locator(`input[name="${controlName}"][aria-label="${label}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected swatch input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function parseRgb(value: string): [number, number, number] {
  const match = /^rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/.exec(value);
  if (!match) throw new Error(`Expected rgb color, received ${value}`);

  const [, r, g, b] = match;
  if (!r || !g || !b) throw new Error(`Expected rgb color, received ${value}`);

  return [Number(r), Number(g), Number(b)];
}

function apcaY([r, g, b]: [number, number, number]): number {
  return 0.2126729 * (r / 255) ** 2.4
    + 0.7151522 * (g / 255) ** 2.4
    + 0.0721750 * (b / 255) ** 2.4;
}

function apcaLc(textY: number, backgroundY: number): number {
  const softClamp = (y: number) => y > 0.022 ? y : y + (0.022 - y) ** 1.414;
  const textYc = softClamp(textY);
  const backgroundYc = softClamp(backgroundY);

  if (Math.abs(backgroundYc - textYc) < 0.0005) return 0;

  if (backgroundYc > textYc) {
    const contrast = (backgroundYc ** 0.56 - textYc ** 0.57) * 1.14;
    return contrast < 0.1 ? 0 : contrast - 0.027;
  }

  const contrast = (backgroundYc ** 0.65 - textYc ** 0.62) * 1.14;
  return contrast > -0.1 ? 0 : contrast + 0.027;
}

function absApcaLc(text: [number, number, number], background: [number, number, number]): number {
  return Math.abs(apcaLc(apcaY(text), apcaY(background)) * 100);
}

test('FAQ section renders Family-style defaults with three accordion questions', async ({ page }) => {
  const faq = page.locator('.faq');

  await expect(faq).toBeVisible();
  await expect(faq).toHaveAttribute('data-layout', 'list');
  await expect(faq).toHaveAttribute('data-heading-placement', 'beside');
  await expect(faq).toHaveAttribute('data-accordion', 'true');
  await expect(faq).toHaveAttribute('data-indicator', 'plus');
  await expect(faq).toHaveAttribute('data-count', '3');

  await expect(page.locator('.faq__heading')).toHaveText('Frequently Asked Questions');
  await expect(page.locator('.faq__item')).toHaveCount(3);
  await expect(page.locator('.faq__question-button')).toHaveCount(3);
  await expect(page.locator('.faq__answer').first()).toBeHidden();
  await expect(page.locator('.faq__link')).toHaveText('See More FAQs');
  await expect(page.locator('.faq__link')).not.toHaveAttribute('href', /.+/);

  const questionWeight = await page.locator('.faq__question-text').first().evaluate((question) =>
    Number.parseInt(getComputedStyle(question).fontWeight, 10),
  );
  expect(questionWeight).toBeGreaterThanOrEqual(700);

  await expect(page.locator('[data-control="headingPlacement"]')).not.toHaveClass(/control-group--style/);
  await expect(page.locator('[data-control="indicator"]')).not.toHaveClass(/control-group--style/);
  await expect(page.locator('[data-control="indicator"] .segmented-btn svg')).toHaveCount(2);
  await expect(page.locator('input[name="text-color"][aria-label="Black"]')).toBeChecked();
  await expect(page.locator('input[name="highlight-color"][aria-label="Red"]')).toBeChecked();

  const controlOrder = await page.locator('#controls-container .controls > .control-group').evaluateAll((groups) =>
    groups.map((group) => (group as HTMLElement).dataset.control ?? ''),
  );
  expect(controlOrder.indexOf('count')).toBeLessThan(controlOrder.indexOf('bgWidth'));
});

test('FAQ controls update layout, content, count, link, and persisted state', async ({ page }) => {
  const faq = page.locator('.faq');

  await checkRadio(page, 'bgWidth', 'hug');
  await checkRadio(page, 'contentWidth', 'medium');
  await checkRadio(page, 'layout', 'cards');
  await checkRadio(page, 'headingPlacement', 'above');
  await setStepperValue(page, 'count', 4);
  await page.locator('input[name="heading"]').fill('Questions');
  await page.locator('input[name="subheading"]').fill('Everything shoppers ask before buying.');
  await page.locator('input[name="linkLabel"]').fill('View all questions');
  await chooseSwatch(page, 'text-color', 'Blue');
  await chooseSwatch(page, 'highlight-color', 'Yellow');

  await expect(faq).toHaveAttribute('data-bg-width', 'hug');
  await expect(faq).toHaveAttribute('data-content-width', 'medium');
  await expect(faq).toHaveAttribute('data-layout', 'cards');
  await expect(faq).toHaveAttribute('data-heading-placement', 'above');
  await expect(faq).toHaveAttribute('data-count', '4');
  await expect(page.locator('.faq__item')).toHaveCount(4);
  await expect(page.locator('.faq__heading')).toHaveText('Questions');
  await expect(page.locator('.faq__subheading')).toHaveText('Everything shoppers ask before buying.');
  await expect(page.locator('.faq__link')).toHaveText('View all questions');
  await expect(page.locator('.faq__link')).not.toHaveAttribute('href', /.+/);
  await expect.poll(async () =>
    faq.evaluate((node) => (node as HTMLElement).style.getPropertyValue('--faq-text-color').trim()),
  ).toBe('#1841D4');
  await expect.poll(async () =>
    faq.evaluate((node) => (node as HTMLElement).style.getPropertyValue('--faq-highlight-color').trim()),
  ).toBe('#F4D923');

  await page.locator('.controls__picker').selectOption('nav');
  await page.locator('.controls__picker').selectOption('faq');

  await expect(page.locator('.faq')).toHaveAttribute('data-layout', 'cards');
  await expect(page.locator('.faq')).toHaveAttribute('data-count', '4');
  await expect(page.locator('input[name="layout"][value="cards"]')).toBeChecked();
  await expect(page.locator('[data-control="count"] .control-stepper__value')).toHaveValue('4');
  await expect(page.locator('input[name="heading"]')).toHaveValue('Questions');
  await expect(page.locator('input[name="text-color"][aria-label="Blue"]')).toBeChecked();
  await expect(page.locator('input[name="highlight-color"][aria-label="Yellow"]')).toBeChecked();
});

test('FAQ more link has a visible hover state', async ({ page }) => {
  const link = page.locator('.faq__link');

  const initialBackground = await link.evaluate((node) => getComputedStyle(node).backgroundColor);
  const initialArrowTransform = await link.evaluate((node) => getComputedStyle(node, '::after').transform);

  await link.hover();

  await expect.poll(async () => link.evaluate((node) => getComputedStyle(node).backgroundColor))
    .not.toBe(initialBackground);
  await expect.poll(async () => link.evaluate((node) => getComputedStyle(node, '::after').transform))
    .not.toBe(initialArrowTransform);
});

test('FAQ derives answer copy color within APCA body-text guidance', async ({ page }) => {
  await chooseSwatch(page, 'background-color', 'White');
  await chooseSwatch(page, 'text-color', 'Blue');
  await page.locator('.faq__question-button').first().click();

  const blueOnWhite = await page.evaluate(() => {
    const answer = document.querySelector('.faq__answer');
    const background = document.querySelector('.faq__bg');
    if (!(answer instanceof HTMLElement) || !(background instanceof HTMLElement)) {
      throw new Error('Expected FAQ answer and background');
    }

    return {
      answerColor: getComputedStyle(answer).color,
      backgroundColor: getComputedStyle(background).backgroundColor,
    };
  });

  expect(absApcaLc(parseRgb(blueOnWhite.answerColor), parseRgb(blueOnWhite.backgroundColor)))
    .toBeGreaterThanOrEqual(75);

  await chooseSwatch(page, 'text-color', 'Yellow');

  const yellowOnWhite = await page.evaluate(() => {
    const answer = document.querySelector('.faq__answer');
    const background = document.querySelector('.faq__bg');
    if (!(answer instanceof HTMLElement) || !(background instanceof HTMLElement)) {
      throw new Error('Expected FAQ answer and background');
    }

    return {
      answerColor: getComputedStyle(answer).color,
      backgroundColor: getComputedStyle(background).backgroundColor,
    };
  });

  expect(absApcaLc(parseRgb(yellowOnWhite.answerColor), parseRgb(yellowOnWhite.backgroundColor)))
    .toBeGreaterThanOrEqual(75);
});

test('FAQ accordion expands independently and updates plus and chevron indicators', async ({ page }) => {
  const firstItem = page.locator('.faq__item').first();
  const secondItem = page.locator('.faq__item').nth(1);
  const firstButton = page.locator('.faq__question-button').first();
  const secondButton = page.locator('.faq__question-button').nth(1);

  await firstButton.click();

  await expect(firstButton).toBeFocused();
  await expect(firstButton).toHaveAttribute('aria-expanded', 'true');
  await expect(firstItem.locator('.faq__answer')).toBeVisible();
  await expect(firstItem).toHaveAttribute('data-open', 'true');

  const plusContent = await firstItem.locator('.faq__indicator').evaluate((indicator) =>
    getComputedStyle(indicator, '::before').content,
  );
  expect(plusContent).toContain('\u2212');

  await secondButton.click();
  await expect(firstButton).toHaveAttribute('aria-expanded', 'true');
  await expect(secondButton).toHaveAttribute('aria-expanded', 'true');
  await expect(secondItem).toHaveAttribute('data-open', 'true');

  await checkRadio(page, 'indicator', 'chevrons');
  await expect(firstItem).toHaveAttribute('data-open', 'true');
  const openChevronTransform = await firstItem.locator('.faq__indicator').evaluate((indicator) =>
    getComputedStyle(indicator, '::before').transform,
  );

  await firstButton.click();
  await expect(firstItem).toHaveAttribute('data-open', 'false');

  await expect.poll(async () =>
    firstItem.locator('.faq__indicator').evaluate((indicator) =>
      getComputedStyle(indicator, '::before').transform,
    ),
  ).not.toBe(openChevronTransform);
});

test('accordion off renders static visible answers without expanded state', async ({ page }) => {
  await checkRadio(page, 'accordion', 'false');

  await expect(page.locator('.faq')).toHaveAttribute('data-accordion', 'false');
  await expect(page.locator('.faq__question-button')).toHaveCount(0);
  await expect(page.locator('.faq [aria-expanded]')).toHaveCount(0);
  await expect(page.locator('.faq__answer')).toHaveCount(3);
  await expect(page.locator('.faq__answer').first()).toBeVisible();

  await page.locator('.faq__question--static').first().click();
  await expect(page.locator('.faq__answer').first()).toBeVisible();
});

test('more link can be disabled and hides link-specific controls', async ({ page }) => {
  await checkRadio(page, 'linkEnabled', 'false');

  await expect(page.locator('.faq')).toHaveAttribute('data-link-enabled', 'false');
  await expect(page.locator('.faq__link')).toBeHidden();
  await expect(page.locator('[data-control="linkLabel"]')).toBeHidden();
  await expect(page.locator('[data-control="linkUrl"]')).toHaveCount(0);
});

test('beside heading placement is side-by-side on desktop and stacked on mobile', async ({ page }) => {
  await page.getByRole('button', { name: '1280' }).click();
  await checkRadio(page, 'headingPlacement', 'beside');

  const desktopMetrics = await page.evaluate(() => {
    const intro = document.querySelector('.faq__intro');
    const content = document.querySelector('.faq__content');
    if (!(intro instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      throw new Error('Expected FAQ intro and content');
    }
    const introRect = intro.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      introRight: introRect.right,
      contentLeft: contentRect.left,
      introTop: introRect.top,
      contentTop: contentRect.top,
    };
  });

  expect(desktopMetrics.contentLeft).toBeGreaterThan(desktopMetrics.introRight);
  expect(Math.abs(desktopMetrics.introTop - desktopMetrics.contentTop)).toBeLessThanOrEqual(2);

  await page.getByRole('button', { name: '375' }).click();

  const mobileMetrics = await page.evaluate(() => {
    const intro = document.querySelector('.faq__intro');
    const content = document.querySelector('.faq__content');
    if (!(intro instanceof HTMLElement) || !(content instanceof HTMLElement)) {
      throw new Error('Expected FAQ intro and content');
    }
    const introRect = intro.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      introBottom: introRect.bottom,
      contentTop: contentRect.top,
    };
  });

  expect(mobileMetrics.contentTop).toBeGreaterThan(mobileMetrics.introBottom);
  await expect.poll(async () =>
    page.locator('.faq__heading').evaluate((heading) => getComputedStyle(heading).maxWidth),
  ).toBe('none');

  await checkRadio(page, 'headingPlacement', 'above');
  await expect.poll(async () =>
    page.locator('.faq__heading').evaluate((heading) => getComputedStyle(heading).maxWidth),
  ).toBe('none');
});

test('above heading placement lets the heading use the available content width', async ({ page }) => {
  await page.getByRole('button', { name: '1280' }).click();
  await checkRadio(page, 'contentWidth', 'narrow');
  await checkRadio(page, 'headingPlacement', 'above');

  await expect(page.locator('.faq')).toHaveAttribute('data-heading-placement', 'above');
  await expect.poll(async () =>
    page.locator('.faq__heading').evaluate((heading) => getComputedStyle(heading).maxWidth),
  ).toBe('none');

  const widthDelta = await page.evaluate(() => {
    const heading = document.querySelector('.faq__heading');
    const intro = document.querySelector('.faq__intro');
    if (!(heading instanceof HTMLElement) || !(intro instanceof HTMLElement)) {
      throw new Error('Expected FAQ heading and intro');
    }
    return Math.abs(heading.getBoundingClientRect().width - intro.getBoundingClientRect().width);
  });

  expect(widthDelta).toBeLessThanOrEqual(1);
});

test('FAQ state serializes to URL and restores before controls initialize', async ({ page }) => {
  await checkRadio(page, 'layout', 'cards');
  await checkRadio(page, 'bgWidth', 'hug');
  await checkRadio(page, 'contentWidth', 'narrow');
  await checkRadio(page, 'accordion', 'false');
  await setStepperValue(page, 'count', 5);
  await page.locator('input[name="heading"]').fill('Store help');
  await chooseSwatch(page, 'text-color', 'Black');
  await chooseSwatch(page, 'highlight-color', 'Blue');

  const url = page.url();
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  expect(params['faq.layout']).toBe('cards');
  expect(params['faq.bgWidth']).toBe('hug');
  expect(params['faq.contentWidth']).toBe('narrow');
  expect(params['faq.accordion']).toBe('false');
  expect(params['faq.count']).toBe('5');
  expect(params['faq.linkUrl']).toBeUndefined();
  expect(params['faq.css:--faq-text-color']).toBe('#000000');
  expect(params['faq.css:--faq-highlight-color']).toBe('#1841D4');
  expect(params.section).toBe('faq');

  await page.goto(url);

  await expect(page.locator('.controls__picker')).toHaveValue('faq');
  await expect(page.locator('.faq')).toHaveAttribute('data-layout', 'cards');
  await expect(page.locator('.faq')).toHaveAttribute('data-count', '5');
  await expect(page.locator('.faq')).toHaveAttribute('data-accordion', 'false');
  await expect(page.locator('.faq__heading')).toHaveText('Store help');
  await expect.poll(async () =>
    page.locator('.faq').evaluate((node) => (node as HTMLElement).style.getPropertyValue('--faq-highlight-color').trim()),
  ).toBe('#1841D4');
  await expect(page.locator('input[name="layout"][value="cards"]')).toBeChecked();
  await expect(page.locator('[data-control="count"] .control-stepper__value')).toHaveValue('5');
});
