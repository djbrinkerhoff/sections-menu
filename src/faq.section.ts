import type { MountedSection, Section, SectionInitContext } from './shell';
import faqHtml from './faq.partial.html?raw';
import { initFaq } from './faq';
import { initFaqControls } from './faq.controls';

const CSS_PROPS = ['--faq-color', '--faq-text-color', '--faq-highlight-color'] as const;

export const faqSection: Section = {
  id: 'faq',
  label: 'FAQ',
  previewHtml: faqHtml,

  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    { onStateChange }: SectionInitContext,
  ): MountedSection {
    const root = previewRoot.querySelector<HTMLElement>('.faq');
    if (!root) throw new Error('FAQ root .faq not found in previewHtml');

    const faq = initFaq(root);
    const controls = initFaqControls(root, controlsContainer, faq, onStateChange);

    return {
      destroy() {
        controls.cleanup();
        faq.cleanup();
      },

      saveState(): Record<string, string> {
        const state: Record<string, string> = {};

        for (const [key, value] of Object.entries(root.dataset)) {
          if (value !== undefined) {
            state[key] = value;
          }
        }

        for (const prop of CSS_PROPS) {
          const value = root.style.getPropertyValue(prop).trim();
          if (value) {
            state[`css:${prop}`] = value;
          }
        }

        return state;
      },
    };
  },
};
