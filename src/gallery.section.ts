import type { Section, MountedSection, SectionInitContext } from './shell';
import galleryHtml from './gallery.partial.html?raw';
import { initGalleryControls } from './gallery.controls';
import { setOnViewportChange } from './shell';

export const gallerySection: Section = {
  id: 'gallery',
  label: 'Image Gallery',
  previewHtml: galleryHtml,

  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    { onStateChange }: SectionInitContext,
  ): MountedSection {
    const galleryRoot = previewRoot.querySelector<HTMLElement>('.gallery');
    if (!galleryRoot) throw new Error('Gallery root .gallery not found in previewHtml');

    const controls = initGalleryControls(galleryRoot, controlsContainer, onStateChange);
    setOnViewportChange(() => {
      controls.handleViewportChange();
    });

    return {
      destroy() {
        controls.cleanup();
      },

      saveState(): Record<string, string> {
        const state: Record<string, string> = {};

        for (const [key, value] of Object.entries(galleryRoot.dataset)) {
          if (value !== undefined) {
            state[key] = value;
          }
        }

        for (const prop of ['--gallery-color', '--gallery-accent'] as const) {
          const val = galleryRoot.style.getPropertyValue(prop).trim();
          if (val) {
            state[`css:${prop}`] = val;
          }
        }

        return state;
      },
    };
  },
};
