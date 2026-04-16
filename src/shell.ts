// ─── Section interface ───

export interface Section {
  readonly id: string;
  readonly label: string;
  readonly previewHtml: string;
  init(previewRoot: HTMLElement, controlsContainer: HTMLElement): MountedSection;
}

export interface MountedSection {
  destroy(): void;
  saveState(): Record<string, string>;
}

// ─── Registry ───

const sections: Section[] = [];
const stateCache = new Map<string, Record<string, string>>();

let currentSection: Section | null = null;
let currentHandle: MountedSection | null = null;

// Viewport callback: sections can register a function to call on viewport change
let onViewportChange: (() => void) | null = null;

export function setOnViewportChange(cb: (() => void) | null): void {
  onViewportChange = cb;
}

// ─── Shell elements (resolved once at boot) ───

let previewRoot: HTMLElement;
let controlsContainer: HTMLElement;
let activeViewportWidth = '375';

// ─── switchTo ───

function applyStateToRoot(root: HTMLElement, state: Record<string, string>): void {
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined) continue;
    if (key.startsWith('css:')) {
      root.style.setProperty(key.slice(4), value);
    } else if (!key.startsWith('custom:')) {
      // Data attribute key
      root.dataset[key] = value;
    }
  }
}

function switchTo(section: Section): void {
  if (section === currentSection) return;

  // 1-2. Save outgoing state
  if (currentSection && currentHandle) {
    stateCache.set(currentSection.id, currentHandle.saveState());
    // 3. Destroy
    currentHandle.destroy();
  }

  // Clear viewport change callback
  onViewportChange = null;

  // 4-5. Clear containers
  previewRoot.innerHTML = '';
  controlsContainer.innerHTML = '';

  // 6. Inject new preview HTML
  previewRoot.innerHTML = section.previewHtml;

  // 7. If saved state, apply data-attrs and CSS props to root before init
  const saved = stateCache.get(section.id);
  const componentRoot = previewRoot.firstElementChild;
  if (saved && componentRoot instanceof HTMLElement) {
    applyStateToRoot(componentRoot, saved);
  }

  // 8. Init — controls read correct state from DOM
  try {
    currentHandle = section.init(previewRoot, controlsContainer);
  } catch (err) {
    console.error(`Failed to init section "${section.id}":`, err);
    currentSection = null;
    currentHandle = null;
    return;
  }

  currentSection = section;

  // 9. Ensure viewport width is applied to the new preview
  previewRoot.style.width = activeViewportWidth === 'fluid' ? '100%' : `${activeViewportWidth}px`;

  // 10. Reset scroll
  controlsContainer.scrollTop = 0;
}

// ─── Viewport wiring ───

function wireViewportButtons(): void {
  const viewportBtns = document.querySelectorAll<HTMLButtonElement>('[data-viewport]');
  viewportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.viewport;
      if (!w) return;
      activeViewportWidth = w;
      previewRoot.style.width = w === 'fluid' ? '100%' : `${w}px`;
      // Notify active section
      if (onViewportChange) onViewportChange();
      // Update pressed state
      viewportBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    });
  });
  // Set initial viewport state
  viewportBtns.forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.viewport === '375' ? 'true' : 'false');
  });
}

// ─── Picker ───

function buildPicker(): HTMLSelectElement {
  const header = document.createElement('div');
  header.className = 'controls__header';

  const select = document.createElement('select');
  select.className = 'controls__picker';
  select.setAttribute('aria-label', 'Select component');

  for (const s of sections) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    const section = sections.find(s => s.id === select.value);
    if (section) switchTo(section);
  });

  header.appendChild(select);

  const controlsRoot = document.getElementById('controls-root');
  if (controlsRoot) {
    controlsRoot.insertBefore(header, controlsRoot.firstChild);
  }

  return select;
}

// ─── Public API ───

export function registerSection(section: Section): void {
  sections.push(section);
}

export function getStateCache(): Map<string, Record<string, string>> {
  return stateCache;
}

export function initShell(): void {
  const pr = document.getElementById('preview-root');
  const cc = document.getElementById('controls-container');
  if (!pr) throw new Error('Missing #preview-root');
  if (!cc) throw new Error('Missing #controls-container');
  previewRoot = pr;
  controlsContainer = cc;

  // Build picker
  buildPicker();

  // Wire viewport buttons (shell-owned, persistent)
  wireViewportButtons();

  // Mount first section
  const first = sections[0];
  if (first) switchTo(first);
}
