# feat: Multi-Component Shell with Image Gallery

## Overview

Add a dropdown to switch between Navigation and Image Gallery components. Each component has its own preview HTML, controls, and isolated state that persists across switches.

## Key Decisions

- **Mount/unmount, not show/hide.** Document-level keydown listeners and ResizeObservers would conflict between hidden sections.
- **Apply saved state to DOM before init().** Controls derive initial checked states from the DOM, so data-attributes must be set before `initControls` runs.
- **`switchTo()` must remain synchronous.** ResizeObserver disconnect and AbortController abort safety depend on it.
- **Fix real bugs regardless:** `submenuOriginalParent` stale reference and `animatingTimeout` dangling timeout.

## Section Interface

Defined inline at the top of `shell.ts`:

```ts
interface Section {
  readonly id: string;
  readonly label: string;
  readonly previewHtml: string;
  init(previewRoot: HTMLElement, controlsContainer: HTMLElement): MountedSection;
}

interface MountedSection {
  destroy(): void;
  saveState(): Record<string, string>;
}
```

No `restoreState` on the interface — each section handles its own custom restore logic inside `init()` by checking the state cache.

## Mount/Unmount Lifecycle

```
Switch from A → B:
1. saved = A.handle.saveState()
2. stateCache.set(A.id, saved)
3. A.handle.destroy()       // resetEphemeral → resetModuleState → abort → disconnect
4. Clear #preview-root innerHTML
5. Clear #controls-container innerHTML
6. Set #preview-root innerHTML = B.previewHtml
7. If stateCache has B: apply data-attrs and CSS props to section root in DOM
8. B.handle = B.init(previewRoot, controlsContainer)  // reads correct state from DOM
9. controlsContainer.scrollTop = 0
```

## Bugs to Fix in nav.ts

**1. `submenuOriginalParent` stale reference:** If nav is destroyed while submenu is relocated (top variant, submenu open), remounting appends the new submenu to a detached DOM node. Fix: null it in `resetNavModuleState()`.

**2. Dangling `animatingTimeout`:** The 250ms `setTimeout` for the double-click guard isn't cancelled by AbortController. Fix: track the timeout ID, cancel it in `resetNavModuleState()`.

**3. Export `resetNavModuleState()`:** Nulls all module-level variables: `previewEl`, `inertDepth`, `submenuOriginalParent`, `animating`, `animatingTimeout`, `previousMenuFocus`, `previousCartFocus`, `currentSidebarCleanup`.

## Destroy Ordering (Critical)

```
1. resetEphemeralState(navRoot)     // closes menus/cart/search, drains inert, unlocks scroll
2. resetNavModuleState()            // nulls module state, cancels timeout
3. cleanupNav()                     // aborts nav listeners, disconnects observers
4. cleanupControls()                // aborts controls listeners, removes controls DOM
```

---

## Phase A: Shell + Nav Section Wrapper

**Goal:** Build the shell, extract viewport wiring, wrap nav as a Section. App should work identically to before with a single-option picker.

**Tasks:**

- [x] Create `src/shell.ts`:
  - `Section` and `MountedSection` interfaces at top
  - `stateCache: Map<string, Record<string, string>>`
  - `switchTo(section)` with early return `if (section === currentSection) return`
  - `initShell()`: build native `<select>` picker, wire change listener, mount initial section
  - Viewport button wiring (moved from `controls.ts` lines 276–293)
  - Viewport width persistence (track active width, reapply on switch)
  - On viewport change: call `resetEphemeralState` on the active section's root if available (direct callback, not custom event)
- [x] Update `src/main.ts`: call `initShell()` instead of direct nav init
- [x] Modify `src/controls.ts`:
  - Accept `container: HTMLElement` parameter instead of finding `#controls-root` by ID
  - Remove `<h2>Navigation</h2>` heading
  - Remove viewport wiring (lines 276–293)
  - Derive initial checked/selected states from DOM (`navRoot.dataset[key]`) instead of `values[0]`
- [x] Modify `src/nav.ts`:
  - Track `animatingTimeout` and cancel it in reset
  - Export `resetNavModuleState()` that nulls all 8 module-level variables
- [x] Create `src/nav.section.ts`:
  - `id: 'nav'`, `label: 'Navigation'`
  - `previewHtml` from `nav.partial.html?raw`
  - `init()`: find `.nav` root, check stateCache for custom keys (navItemCount, cartCount) and apply them after `initControls`, return `MountedSection`
  - `destroy()`: resetEphemeral → resetModuleState → cleanupNav → cleanupControls
  - `saveState()`: iterate dataset (skip ephemeral: open, topInline, simpleInline, tileInline), save CSS props (--menu-color, --text-color, --nav-inset, --border-radius), save custom keys (navItemCount, cartCount)
- [x] In `index.html`: add `<div id="controls-container"></div>` inside `#controls-root`
- [x] Style the picker: native `<select>` with `background: #09090b`, `color: #f4f4f5`, `border: 1px solid #27272a`, `color-scheme: dark`, `aria-label="Select component"`

**Files:**
| File | Action |
|---|---|
| `src/shell.ts` | Create |
| `src/nav.section.ts` | Create |
| `src/main.ts` | Modify |
| `src/controls.ts` | Modify (container param, remove viewport, remove heading, DOM-derived defaults) |
| `src/nav.ts` | Modify (export resetNavModuleState, track animatingTimeout) |
| `index.html` | Modify (add #controls-container) |

**Success criteria:**
- App boots identically to before
- Picker shows "Navigation" as only option
- Viewport buttons work (shell-owned)
- Existing Playwright tests pass

---

## Phase B: Image Gallery + Switching Tests

**Goal:** Add gallery component, verify switching and state round-trips work.

**Tasks:**

- [x] Create `src/gallery.partial.html`:
  - Root: `<div class="gallery" data-columns="3" data-gap="md" data-aspect="square" data-captions="false" style="--gallery-color: #ffffff; --gallery-accent: #000000;">`
  - 6–9 placeholder image slots (CSS gradient backgrounds)
  - BEM: `.gallery__grid`, `.gallery__item`, `.gallery__image`, `.gallery__caption`
  - `container-type: inline-size` on `.gallery`
- [x] Create `src/gallery.css`:
  - CSS Grid driven by `data-columns` and `data-gap` attribute selectors
  - `aspect-ratio` driven by `data-aspect`
  - Caption toggle via `data-captions`
  - Container queries for responsive column count
- [x] Create `src/gallery.controls.ts`:
  - Schema arrays inlined at top: `COLUMNS`, `GAPS`, `ASPECTS`
  - `initGalleryControls(galleryRoot, container)` → cleanup function
  - Own builder functions (not shared with nav) for: columns, gap, aspect ratio, captions toggle
  - Derive initial states from `galleryRoot.dataset`
- [x] Create `src/gallery.section.ts`:
  - `id: 'gallery'`, `label: 'Image Gallery'`
  - `init()`, `destroy()`, `saveState()` following same pattern as nav.section.ts
  - No separate `gallery.ts` behavior file (no interactive behavior yet)
- [x] Register `gallerySection` in `shell.ts`
- [x] Update `src/main.css` to import `gallery.css`
- [x] Update Playwright test import path if `initControls` signature changed
- [x] Add `tests/shell-switching.spec.ts`:
  - Switch to gallery → verify nav removed, gallery visible
  - State round-trip: configure nav → gallery → nav → verify state
  - Regression: top variant → open submenu → switch → switch back → submenu present
  - Regression: open menu → switch within 250ms → switch back → menu toggle works
  - Controls sync: set tile variant → switch → switch back → controls show tile
  - Viewport persistence across switches

**Files:**
| File | Action |
|---|---|
| `src/gallery.partial.html` | Create |
| `src/gallery.css` | Create |
| `src/gallery.controls.ts` | Create |
| `src/gallery.section.ts` | Create |
| `src/shell.ts` | Modify (register gallery) |
| `src/main.css` | Modify (import gallery.css) |
| `tests/shell-switching.spec.ts` | Create |

**Success criteria:**
- Picker shows "Navigation" and "Image Gallery"
- Selecting gallery unmounts nav, shows gallery
- Gallery controls work
- Switching back restores nav state
- Viewport width persists
- No regressions

---

## New Files Summary (5 total)

1. `src/shell.ts` — interfaces + shell orchestration
2. `src/nav.section.ts` — nav Section wrapper
3. `src/gallery.partial.html` — gallery markup
4. `src/gallery.css` — gallery styles
5. `src/gallery.controls.ts` — gallery controls (schema inlined)
6. `src/gallery.section.ts` — gallery Section wrapper
7. `tests/shell-switching.spec.ts` — switching tests

## References

- `src/nav.ts:5-8,282,316,371-375` — module-level mutable state
- `src/nav.ts:323` — animating setTimeout (dangling timeout)
- `src/nav.ts:327` — resetEphemeralState
- `src/controls.ts:276-293` — viewport wiring to extract
- `src/controls.ts:409` — hardcoded `values[0]` to fix
- `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md` — overlay rules for future gallery lightbox
