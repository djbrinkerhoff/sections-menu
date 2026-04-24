import { FAQ_ITEMS } from './faq.data';

type FaqLayout = 'list' | 'cards';
type FaqHeadingPlacement = 'above' | 'beside';
type FaqAccordion = 'true' | 'false';
type FaqIndicator = 'plus' | 'chevrons';

interface FaqState {
  layout: FaqLayout;
  headingPlacement: FaqHeadingPlacement;
  accordion: FaqAccordion;
  indicator: FaqIndicator;
  count: number;
  heading: string;
  subheading: string;
  linkEnabled: FaqAccordion;
  linkLabel: string;
}

type RGB = [number, number, number];

export interface FaqHandle {
  sync(): void;
  cleanup(): void;
}

const MIN_ANSWER_APCA_LC = 76;
const TARGET_ANSWER_BG_MIX = 0.32;

const DEFAULT_STATE: FaqState = {
  layout: 'list',
  headingPlacement: 'beside',
  accordion: 'true',
  indicator: 'plus',
  count: 3,
  heading: 'Frequently Asked Questions',
  subheading: '',
  linkEnabled: 'true',
  linkLabel: 'See More FAQs',
};

function parseHexColor(value: string, fallback: RGB): RGB {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return fallback;

  const hex = match[1];
  if (!hex) return fallback;

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function formatRgb([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function mixRgb(foreground: RGB, background: RGB, backgroundMix: number): RGB {
  return [
    foreground[0] + (background[0] - foreground[0]) * backgroundMix,
    foreground[1] + (background[1] - foreground[1]) * backgroundMix,
    foreground[2] + (background[2] - foreground[2]) * backgroundMix,
  ];
}

function apcaY([r, g, b]: RGB): number {
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

function absApcaLc(text: RGB, background: RGB): number {
  return Math.abs(apcaLc(apcaY(text), apcaY(background)) * 100);
}

function highestContrastFallback(text: RGB, background: RGB): RGB {
  const candidates: RGB[] = [text, [0, 0, 0], [255, 255, 255]];
  let best = candidates[0];
  let bestLc = best ? absApcaLc(best, background) : 0;

  for (const candidate of candidates.slice(1)) {
    const candidateLc = absApcaLc(candidate, background);
    if (candidateLc > bestLc) {
      best = candidate;
      bestLc = candidateLc;
    }
  }

  return best ?? text;
}

function deriveAnswerColor(text: RGB, background: RGB): RGB {
  if (absApcaLc(text, background) < MIN_ANSWER_APCA_LC) {
    return highestContrastFallback(text, background);
  }

  const target = mixRgb(text, background, TARGET_ANSWER_BG_MIX);
  if (absApcaLc(target, background) >= MIN_ANSWER_APCA_LC) {
    return target;
  }

  let low = 0;
  let high = TARGET_ANSWER_BG_MIX;

  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const candidate = mixRgb(text, background, mid);

    if (absApcaLc(candidate, background) >= MIN_ANSWER_APCA_LC) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return mixRgb(text, background, low);
}

function syncDerivedColors(root: HTMLElement): void {
  const background = parseHexColor(root.style.getPropertyValue('--faq-color'), [255, 255, 255]);
  const text = parseHexColor(root.style.getPropertyValue('--faq-text-color'), [0, 0, 0]);

  root.style.setProperty('--faq-answer-color', formatRgb(deriveAnswerColor(text, background)));
}

function readChoice<T extends string>(value: string | undefined, validValues: readonly T[], fallback: T): T {
  return validValues.includes(value as T) ? value as T : fallback;
}

function readCount(root: HTMLElement): number {
  const parsed = Number.parseInt(root.dataset.count ?? '', 10);
  const count = Number.isFinite(parsed) ? parsed : DEFAULT_STATE.count;
  return Math.max(1, Math.min(FAQ_ITEMS.length, count));
}

function readState(root: HTMLElement): FaqState {
  return {
    layout: readChoice(root.dataset.layout, ['list', 'cards'] as const, DEFAULT_STATE.layout),
    headingPlacement: readChoice(root.dataset.headingPlacement, ['above', 'beside'] as const, DEFAULT_STATE.headingPlacement),
    accordion: readChoice(root.dataset.accordion, ['true', 'false'] as const, DEFAULT_STATE.accordion),
    indicator: readChoice(root.dataset.indicator, ['plus', 'chevrons'] as const, DEFAULT_STATE.indicator),
    count: readCount(root),
    heading: root.dataset.heading ?? DEFAULT_STATE.heading,
    subheading: root.dataset.subheading ?? DEFAULT_STATE.subheading,
    linkEnabled: readChoice(root.dataset.linkEnabled, ['true', 'false'] as const, DEFAULT_STATE.linkEnabled),
    linkLabel: root.dataset.linkLabel ?? DEFAULT_STATE.linkLabel,
  };
}

function syncRootState(root: HTMLElement, state: FaqState): void {
  root.dataset.layout = state.layout;
  root.dataset.headingPlacement = state.headingPlacement;
  root.dataset.accordion = state.accordion;
  root.dataset.indicator = state.indicator;
  root.dataset.count = String(state.count);
  root.dataset.heading = state.heading;
  root.dataset.subheading = state.subheading;
  root.dataset.linkEnabled = state.linkEnabled;
  root.dataset.linkLabel = state.linkLabel;
  delete root.dataset.linkUrl;
}

export function initFaq(root: HTMLElement): FaqHandle {
  const abortController = new AbortController();
  const { signal } = abortController;

  const heading = root.querySelector<HTMLElement>('.faq__heading');
  const subheading = root.querySelector<HTMLElement>('.faq__subheading');
  const items = root.querySelector<HTMLElement>('.faq__items');
  const link = root.querySelector<HTMLAnchorElement>('.faq__link');

  if (!heading) throw new Error('FAQ: .faq__heading not found');
  if (!subheading) throw new Error('FAQ: .faq__subheading not found');
  if (!items) throw new Error('FAQ: .faq__items not found');
  if (!link) throw new Error('FAQ: .faq__link not found');

  const headingEl = heading;
  const subheadingEl = subheading;
  const itemsEl = items;
  const linkEl = link;

  const openItems = new Set<number>();
  let previousRenderKey = '';

  function getRenderKey(state: FaqState): string {
    return `${state.layout}:${state.accordion}:${state.count}`;
  }

  function syncOpenState(): void {
    for (const item of itemsEl.querySelectorAll<HTMLElement>('.faq__item')) {
      const index = Number.parseInt(item.dataset.faqIndex ?? '', 10);
      const isOpen = Number.isFinite(index) && openItems.has(index);
      item.dataset.open = isOpen ? 'true' : 'false';

      const button = item.querySelector<HTMLButtonElement>('.faq__question-button');
      const answer = item.querySelector<HTMLElement>('.faq__answer');
      const indicator = item.querySelector<HTMLElement>('.faq__indicator');

      if (!button) {
        item.dataset.open = 'true';
        if (answer) answer.hidden = false;
        continue;
      }

      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (answer) answer.hidden = !isOpen;
      if (indicator) indicator.dataset.state = isOpen ? 'open' : 'closed';
    }
  }

  function renderItems(state: FaqState): void {
    itemsEl.innerHTML = '';

    for (let index = 0; index < state.count; index++) {
      const item = FAQ_ITEMS[index];
      if (!item) continue;

      const article = document.createElement('article');
      article.className = 'faq__item';
      article.dataset.faqIndex = String(index);
      article.dataset.open = 'false';

      if (state.accordion === 'true') {
        const answerId = `faq-answer-${index}`;
        const button = document.createElement('button');
        button.className = 'faq__question faq__question-button';
        button.type = 'button';
        button.dataset.faqIndex = String(index);
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', answerId);

        const indicator = document.createElement('span');
        indicator.className = 'faq__indicator';
        indicator.dataset.state = 'closed';
        indicator.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'faq__question-text';
        text.textContent = item.question;

        button.appendChild(indicator);
        button.appendChild(text);

        const answer = document.createElement('div');
        answer.className = 'faq__answer';
        answer.id = answerId;
        answer.hidden = true;

        const answerText = document.createElement('p');
        answerText.textContent = item.answer;
        answer.appendChild(answerText);

        article.appendChild(button);
        article.appendChild(answer);
      } else {
        const title = document.createElement('h3');
        title.className = 'faq__question faq__question--static';
        title.textContent = item.question;

        const answer = document.createElement('div');
        answer.className = 'faq__answer faq__answer--static';

        const answerText = document.createElement('p');
        answerText.textContent = item.answer;
        answer.appendChild(answerText);

        article.dataset.open = 'true';
        article.appendChild(title);
        article.appendChild(answer);
      }

      itemsEl.appendChild(article);
    }

    syncOpenState();
  }

  function sync(): void {
    const state = readState(root);
    syncRootState(root, state);
    syncDerivedColors(root);

    headingEl.textContent = state.heading;
    subheadingEl.textContent = state.subheading;

    if (state.linkEnabled === 'true' && state.linkLabel.trim()) {
      linkEl.hidden = false;
      linkEl.textContent = state.linkLabel;
      linkEl.removeAttribute('href');
      linkEl.setAttribute('aria-disabled', 'true');
    } else {
      linkEl.hidden = true;
      linkEl.textContent = '';
      linkEl.removeAttribute('href');
      linkEl.removeAttribute('aria-disabled');
    }

    const renderKey = getRenderKey(state);
    if (renderKey !== previousRenderKey) {
      openItems.clear();
      previousRenderKey = renderKey;
    }

    renderItems(state);
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>('.faq__question-button');
    if (!button || !root.contains(button)) return;

    const index = Number.parseInt(button.dataset.faqIndex ?? '', 10);
    if (!Number.isFinite(index)) return;

    if (openItems.has(index)) {
      openItems.delete(index);
    } else {
      openItems.add(index);
    }
    syncOpenState();
  }, { signal });

  sync();

  return {
    sync,
    cleanup() {
      abortController.abort();
      openItems.clear();
    },
  };
}
