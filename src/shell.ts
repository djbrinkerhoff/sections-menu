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
let controlsRoot: HTMLElement;
let pickerSelect: HTMLSelectElement;
let activeViewportWidth = '375';

// Shell-level AbortController for viewport listeners
const shellAbort = new AbortController();

// ─── switchTo ───

function applyStateToRoot(root: HTMLElement, state: Record<string, string>): void {
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined) continue;
    if (key.startsWith('css:')) {
      root.style.setProperty(key.slice(4), value);
    } else if (!key.startsWith('custom:')) {
      root.dataset[key] = value;
    }
  }
}

function switchTo(section: Section): void {
  if (section === currentSection) return;

  const previousSection = currentSection;

  // Save outgoing state and destroy
  if (currentSection && currentHandle) {
    stateCache.set(currentSection.id, currentHandle.saveState());
    currentHandle.destroy();
  }

  // Null references immediately after destroy (P2 #4)
  currentSection = null;
  currentHandle = null;
  onViewportChange = null;

  // Clear controls and inject new preview HTML
  controlsContainer.innerHTML = '';
  previewRoot.innerHTML = section.previewHtml;

  // If saved state, apply data-attrs and CSS props to root before init
  const saved = stateCache.get(section.id);
  const componentRoot = previewRoot.firstElementChild;
  if (saved && componentRoot instanceof HTMLElement) {
    applyStateToRoot(componentRoot, saved);
  }

  // Init — controls read correct state from DOM
  try {
    currentHandle = section.init(previewRoot, controlsContainer);
  } catch (err) {
    console.error(`Failed to init section "${section.id}":`, err);
    // Clear broken preview HTML on error (P2 #3)
    previewRoot.innerHTML = '';
    controlsContainer.innerHTML = '';
    // Revert picker to previous section if possible
    if (previousSection) {
      pickerSelect.value = previousSection.id;
    }
    return;
  }

  currentSection = section;

  // Ensure viewport width is applied to the new preview
  previewRoot.style.width = activeViewportWidth === 'fluid' ? '100%' : `${activeViewportWidth}px`;

  // Reset scroll
  controlsContainer.scrollTop = 0;
}

// ─── Viewport wiring ───

function wireViewportButtons(): void {
  const { signal } = shellAbort;
  const viewportBtns = document.querySelectorAll<HTMLButtonElement>('[data-viewport]');
  viewportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.viewport;
      if (!w) return;
      activeViewportWidth = w;
      previewRoot.style.width = w === 'fluid' ? '100%' : `${w}px`;
      if (onViewportChange) onViewportChange();
      viewportBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    }, { signal });
  });
  // Set initial viewport state
  viewportBtns.forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.viewport === '375' ? 'true' : 'false');
  });
}

// ─── Picker ───

function buildPicker(target: HTMLElement): HTMLSelectElement {
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
  }, { signal: shellAbort.signal });

  header.appendChild(select);
  target.insertBefore(header, target.firstChild);

  return select;
}

// ─── Public API ───

export function registerSection(section: Section): void {
  sections.push(section);
}

export function getSavedState(sectionId: string): Record<string, string> | undefined {
  return stateCache.get(sectionId);
}

export function initShell(): void {
  const pr = document.getElementById('preview-root');
  const cc = document.getElementById('controls-container');
  const cr = document.getElementById('controls-root');
  if (!pr) throw new Error('Missing #preview-root');
  if (!cc) throw new Error('Missing #controls-container');
  if (!cr) throw new Error('Missing #controls-root');
  previewRoot = pr;
  controlsContainer = cc;
  controlsRoot = cr;

  // Build picker into controls-root (above controls-container)
  pickerSelect = buildPicker(controlsRoot);

  // Wire viewport buttons (shell-owned, persistent via shellAbort)
  wireViewportButtons();

  // Mount first section
  const first = sections[0];
  if (first) switchTo(first);
}
