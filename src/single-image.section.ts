import type { MountedSection, Section, SectionInitContext } from './shell';
import { setOnViewportChange } from './shell';
import { initImageLightbox } from './image.lightbox';
import { initSingleImageControls } from './single-image.controls';
import singleImageHtml from './single-image.partial.html?raw';

export const singleImageSection: Section = {
  id: 'single-image',
  label: 'Single Image',
  previewHtml: singleImageHtml,

  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    { onStateChange }: SectionInitContext,
  ): MountedSection {
    const root = previewRoot.querySelector<HTMLElement>('.single-image');
    if (!root) throw new Error('Single image root .single-image not found in previewHtml');

    const lightbox = initImageLightbox(root);
    const controls = initSingleImageControls(root, controlsContainer, onStateChange);
    setOnViewportChange(() => lightbox.handleViewportChange());

    return {
      destroy() {
        controls.cleanup();
        lightbox.cleanup();
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
