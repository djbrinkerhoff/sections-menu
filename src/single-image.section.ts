import type { MountedSection, Section, SectionInitContext } from './shell';
import { setOnViewportChange } from './shell';
import { initImageLightbox } from './image.lightbox';
import singleImageHtml from './single-image.partial.html?raw';

export const singleImageSection: Section = {
  id: 'single-image',
  label: 'Single Image',
  previewHtml: singleImageHtml,

  init(
    previewRoot: HTMLElement,
    _controlsContainer: HTMLElement,
    _context: SectionInitContext,
  ): MountedSection {
    const root = previewRoot.querySelector<HTMLElement>('.single-image');
    if (!root) throw new Error('Single image root .single-image not found in previewHtml');

    const lightbox = initImageLightbox(root);
    setOnViewportChange(() => lightbox.handleViewportChange());

    return {
      destroy() {
        lightbox.cleanup();
      },
      saveState() {
        return {};
      },
    };
  },
};
