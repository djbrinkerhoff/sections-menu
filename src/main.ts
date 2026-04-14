import './main.css';
import navHtml from './nav.partial.html?raw';
import { initNavBehavior, resetEphemeralState } from './nav';
import { initControls } from './controls';

function requireElement<T extends Element>(selector: string, parent: ParentNode = document): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el;
}

const preview = requireElement<HTMLElement>('#preview-root');
preview.innerHTML = navHtml;
const navRoot = requireElement<HTMLElement>('.nav', preview);

const cleanupNav = initNavBehavior(navRoot, preview);
const cleanupControls = initControls(navRoot);

// Cleanup contract available if the preview ever re-mounts.
void cleanupNav;
void cleanupControls;
void resetEphemeralState;
