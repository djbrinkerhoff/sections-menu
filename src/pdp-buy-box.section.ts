import type { MountedSection, Section, SectionInitContext } from './shell';
import { setOnViewportChange } from './shell';
import pdpBuyBoxHtml from './pdp-buy-box.partial.html?raw';
import { initPdpBuyBoxControls } from './pdp-buy-box.controls';
import { initPdpBuyBox } from './pdp-buy-box';

export const pdpBuyBoxSection: Section = {
  id: 'pdp-buy-box',
  label: 'PDP Buy Box',
  previewHtml: pdpBuyBoxHtml,

  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    { onStateChange }: SectionInitContext,
  ): MountedSection {
    const root = previewRoot.querySelector<HTMLElement>('.pdp-buy-box');
    if (!root) throw new Error('PDP buy box root .pdp-buy-box not found in previewHtml');

    const preview = initPdpBuyBox(root);
    const controls = initPdpBuyBoxControls(root, controlsContainer, preview, onStateChange);
    setOnViewportChange(() => preview.handleViewportChange());

    return {
      destroy() {
        controls.cleanup();
        preview.cleanup();
      },
      saveState() {
        const state: Record<string, string> = {};

        for (const [key, value] of Object.entries(root.dataset)) {
          if (value !== undefined) {
            state[key] = value;
          }
        }

        return state;
      },
    };
  },
};
