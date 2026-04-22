import type { MountedSection, Section, SectionInitContext } from './shell';
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
    const controls = initPdpBuyBoxControls(root, controlsContainer, preview.setProduct, onStateChange);

    return {
      destroy() {
        controls.cleanup();
        preview.cleanup();
      },
      saveState() {
        return {
          productId: preview.getCurrentProductId(),
        };
      },
    };
  },
};
