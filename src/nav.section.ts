import type { Section, MountedSection, SectionInitContext } from './shell';
import { getSavedState, setOnViewportChange } from './shell';
import navHtml from './nav.partial.html?raw';
import { initNavBehavior, resetEphemeralState, resetNavModuleState } from './nav';
import { initControls } from './nav.controls';

const EPHEMERAL_KEYS = new Set(['open', 'topInline', 'simpleInline', 'tileInline']);

const CSS_PROPS = ['--menu-color', '--text-color', '--nav-font-scale', '--nav-logo-height', '--nav-inset', '--border-radius'] as const;

export const navSection: Section = {
  id: 'nav',
  label: 'Navigation',
  previewHtml: navHtml,

  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    { onStateChange }: SectionInitContext,
  ): MountedSection {
    const navRoot = previewRoot.querySelector<HTMLElement>('.nav');
    if (!navRoot) throw new Error('Nav root .nav not found in previewHtml');

    const cleanupNav = initNavBehavior(navRoot, previewRoot);
    const controls = initControls(navRoot, controlsContainer, onStateChange);

    // Restore custom keys (navItemCount, cartCount) that need JS logic
    const saved = getSavedState('nav');
    if (saved) {
      const navItems = saved['custom:navItemCount'];
      if (navItems !== undefined) {
        controls.setNavItemCount(Number.parseInt(navItems, 10) || 4);
      }
      const cartCount = saved['custom:cartCount'];
      if (cartCount !== undefined) {
        controls.setCartCount(Number.parseInt(cartCount, 10) || 0);
      }
    }

    // Register viewport change callback
    setOnViewportChange(() => resetEphemeralState(navRoot));

    return {
      destroy() {
        // Critical ordering: reset ephemeral → reset module state → abort listeners
        resetEphemeralState(navRoot);
        resetNavModuleState();
        cleanupNav();
        controls.cleanup();
      },

      saveState(): Record<string, string> {
        const state: Record<string, string> = {};

        // Data attributes (skip ephemeral)
        for (const [key, value] of Object.entries(navRoot.dataset)) {
          if (value !== undefined && !EPHEMERAL_KEYS.has(key)) {
            state[key] = value;
          }
        }

        // CSS custom properties
        for (const prop of CSS_PROPS) {
          const val = navRoot.style.getPropertyValue(prop).trim();
          if (val) {
            state[`css:${prop}`] = val;
          }
        }

        // Custom keys (JS-only state)
        state['custom:navItemCount'] = String(controls.navItemCount);
        state['custom:cartCount'] = navRoot.dataset.cartCount ?? '0';

        return state;
      },
    };
  },
};
