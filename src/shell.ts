// ─── Section interface ───

export interface Section {
  readonly id: string;
  readonly label: string;
  readonly previewHtml: string;
  init(
    previewRoot: HTMLElement,
    controlsContainer: HTMLElement,
    context: SectionInitContext,
  ): MountedSection;
}

export interface MountedSection {
  destroy(): void;
  saveState(): Record<string, string>;
}

export interface SectionInitContext {
  onStateChange(): void;
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
const VIEWPORTS = ['375', '768', '1280', 'fluid'] as const;
type ViewportWidth = (typeof VIEWPORTS)[number];

let activeViewportWidth: ViewportWidth = '375';

// Shell-level AbortController for viewport listeners
const shellAbort = new AbortController();

function isViewportWidth(value: string): value is ViewportWidth {
  return VIEWPORTS.includes(value as ViewportWidth);
}

function applyViewportWidth(viewport: ViewportWidth): void {
  activeViewportWidth = viewport;
  previewRoot.style.width = viewport === 'fluid' ? '100%' : `${viewport}px`;
}

function syncViewportButtons(): void {
  const viewportBtns = document.querySelectorAll<HTMLButtonElement>('[data-viewport]');
  viewportBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.viewport === activeViewportWidth ? 'true' : 'false');
  });
}

function syncUrlState(): void {
  const params = new URLSearchParams();
  const persistedState = new Map(stateCache);

  if (currentSection && currentHandle) {
    persistedState.set(currentSection.id, currentHandle.saveState());
    params.set('section', currentSection.id);
  } else {
    const firstSection = sections[0];
    if (firstSection) params.set('section', firstSection.id);
  }

  params.set('viewport', activeViewportWidth);

  for (const section of sections) {
    const state = persistedState.get(section.id);
    if (!state) continue;

    for (const key of Object.keys(state).sort()) {
      const value = state[key];
      if (value !== undefined) {
        params.set(`${section.id}.${key}`, value);
      }
    }
  }

  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
}

function commitCurrentSectionState(): void {
  if (!currentSection || !currentHandle) return;
  stateCache.set(currentSection.id, currentHandle.saveState());
  syncUrlState();
}

function hydrateStateFromUrl(): Section | null {
  const params = new URLSearchParams(window.location.search);
  const sectionIds = new Set(sections.map(section => section.id));
  const restoredState = new Map<string, Record<string, string>>();

  let requestedSectionId: string | null = null;

  stateCache.clear();

  for (const [key, value] of params.entries()) {
    if (key === 'section') {
      if (sectionIds.has(value)) requestedSectionId = value;
      continue;
    }

    if (key === 'viewport') {
      if (isViewportWidth(value)) activeViewportWidth = value;
      continue;
    }

    const separatorIndex = key.indexOf('.');
    if (separatorIndex <= 0) continue;

    const sectionId = key.slice(0, separatorIndex);
    const stateKey = key.slice(separatorIndex + 1);

    if (!sectionIds.has(sectionId) || !stateKey) continue;

    const sectionState = restoredState.get(sectionId) ?? {};
    sectionState[stateKey] = value;
    restoredState.set(sectionId, sectionState);
  }

  for (const [sectionId, sectionState] of restoredState) {
    stateCache.set(sectionId, sectionState);
  }

  if (!requestedSectionId) return null;
  return sections.find(section => section.id === requestedSectionId) ?? null;
}

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

  pickerSelect.value = section.id;

  // Init — controls read correct state from DOM
  try {
    currentHandle = section.init(previewRoot, controlsContainer, {
      onStateChange: commitCurrentSectionState,
    });
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
  applyViewportWidth(activeViewportWidth);

  // Reset scroll
  controlsContainer.scrollTop = 0;

  syncUrlState();
}

// ─── Viewport wiring ───

function wireViewportButtons(): void {
  const { signal } = shellAbort;
  const viewportBtns = document.querySelectorAll<HTMLButtonElement>('[data-viewport]');
  viewportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.dataset.viewport;
      if (!w || !isViewportWidth(w)) return;
      applyViewportWidth(w);
      if (onViewportChange) onViewportChange();
      syncViewportButtons();
      syncUrlState();
    }, { signal });
  });

  applyViewportWidth(activeViewportWidth);
  syncViewportButtons();
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

  const initialSection = hydrateStateFromUrl();

  // Build picker into controls-root (above controls-container)
  pickerSelect = buildPicker(controlsRoot);

  // Wire viewport buttons (shell-owned, persistent via shellAbort)
  wireViewportButtons();

  // Mount first section
  const first = initialSection ?? sections[0];
  if (first) switchTo(first);
}
