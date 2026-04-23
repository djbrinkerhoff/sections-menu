import type { Page } from 'playwright/test';

export async function checkRadio(page: Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export async function setRangeValue(page: Page, name: string, value: number) {
  await page.locator(`input[name="${name}"]`).evaluate((input, nextValue) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected range input');
    if (typeof nextValue !== 'number') throw new Error('Expected numeric range value');
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
