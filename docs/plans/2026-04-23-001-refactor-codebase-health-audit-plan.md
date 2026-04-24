---
title: "refactor: Codebase Health Audit — Missing Tests, Duplicated Code, and Documentation Gaps"
type: refactor
status: active
date: 2026-04-23
deepened: 2026-04-23
---

# refactor: Codebase Health Audit — Missing Tests, Duplicated Code, and Documentation Gaps

## Overview

Comprehensive audit of the sections-menu codebase (~14K lines across 24 TS source files, 9 CSS files, and 5 test files) to address three systemic issues discovered during review: significant test coverage gaps in newer sections, duplicated infrastructure between the two lightbox implementations, and documentation/convention drift as the codebase has grown from 1 section to 4.

---

## Problem Frame

The codebase has grown organically from a single nav prototype to a 4-section shell with two independent lightbox systems, a slideshow engine, and a shared section-width system. Each section was built incrementally, and while the architecture is fundamentally sound, several areas have accumulated technical debt:

1. **Test coverage is uneven** — Nav and shell have thorough e2e tests, but PDP controls (price modes, sold-out states, control toggles) and single-image width controls have zero test coverage. Gallery image set switching is also untested.
2. **Two lightbox implementations share ~200 lines of duplicated logic** — `image.lightbox.ts` (792 lines) and `pdp-buy-box.lightbox.ts` (648 lines) independently implement `getFocusableElements`, `findScrollContainer`, `syncDialogPosition`, `lockScroll/unlockScroll`, `clearInert/applyInert`, `setTriggerExpanded`, focus trapping, and keyboard handlers.
3. **Documentation hasn't kept pace** — CLAUDE.md doesn't mention the PDP buy box section, the `image.targets.ts` zoom system, the `image-radius.ts` shared module, or the `range-control.ts` builder. No inline schema documentation exists for the PDP section's complex variant/stock/pricing data model.
4. **Controls file naming is inconsistent** — Nav's controls are in `controls.ts` (a generic name) while other sections use `gallery.controls.ts`, `single-image.controls.ts`, `pdp-buy-box.controls.ts`.
5. **saveState patterns diverge** — Gallery, single-image, and nav all use generic `Object.entries(root.dataset)` iteration (nav adds ephemeral key filtering). PDP buy box is the outlier: it uses a hardcoded allowlist of 10 named keys with fallback defaults, meaning new data attributes require manual saveState updates.

---

## Requirements Trace

- R1. Close the most impactful test coverage gaps (PDP pricing/sold-out, single-image width controls, gallery image sets)
- R2. Extract shared lightbox infrastructure to eliminate the ~200 lines of duplicated code
- R3. Update CLAUDE.md to reflect the current 4-section architecture
- R4. Normalize the nav controls filename to match the established `{section}.controls.ts` convention
- R5. Standardize saveState patterns across all sections
- R6. Add missing test helpers to reduce duplication across test files
- R7. Clean up stale plan files and solution docs
- R8. Remove dead CSS rules and unused TypeScript exports
- R9. Fix `image.lightbox.css` using `@media` instead of `@container` for responsive styles
- R10. Deduplicate `clampIndex` utility used across PDP files

---

## Scope Boundaries

- No new features or sections — this is purely housekeeping
- No visual/CSS changes — behavior must remain identical
- No framework introduction — stays vanilla TypeScript
- No build system changes (Vite, Tailwind, TypeScript config)
- No changes to the shell lifecycle or Section interface

### Deferred to Follow-Up Work

- Full lightbox unification (merging the two lightbox systems into one configurable component) — too large for this audit; the extraction in U4 establishes the foundation
- Unit tests for shared utilities (colors.ts, control-builders.ts, range-control.ts) — low risk, well-exercised through e2e
- Autoplay timing tests — inherently difficult in e2e without timer stubs
- Extract `createColorGroup` from nav and gallery controls into shared builder — the two implementations diverge enough (nav has APCA band-mixing) that extraction requires careful interface design
- Extract thumbnail-picker pattern from nav variant picker and gallery layout picker — low duplication count (2 instances), not worth the abstraction yet
- Rename `gallery.slideshow.ts` — it's reused by PDP media, but renaming requires updating imports in both sections and the name is still descriptive enough
- Refactor nav.ts module-level mutable state into closure pattern — high risk of regression in the most complex section for a structural improvement

---

## Context & Research

### Relevant Code and Patterns

- Section interface: `src/shell.ts:1-21` — `Section`, `MountedSection`, `SectionInitContext`
- Established control builder pattern: `src/control-builders.ts` — `createStepperGroup`, `createSegmentedGroup`
- Section width shared schema: `src/section-width.ts` — consumed by gallery and single-image
- Image radius shared module: `src/image-radius.ts` — consumed by gallery, single-image, pdp-buy-box
- Zoom target system: `src/image.targets.ts` — consumed by image.lightbox.ts
- Nav schema-first pattern: `src/nav.schema.ts` — model for how options should be defined

### Institutional Learnings

- **Overlay containment**: Never use `position: fixed` or `showModal()` inside `#preview-root`. Use `position: absolute` + `dialog.show()`. Both lightbox implementations comply. (See `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`)
- **FLIP animation measurement**: Capture `getBoundingClientRect()` before any layout mutations. The `computeSourceRect()` function in `image.lightbox.ts:114` accounts for `object-fit: cover` geometry. (See `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`)

---

## Key Technical Decisions

- **Extract, don't merge, lightbox infra**: The two lightboxes serve different UX patterns (FLIP-animated single/collection vs. Huckberry stacked-scroll). Extracting shared helpers is safer than attempting a full unification.
- **Rename `controls.ts` → `nav.controls.ts`**: The generic name is confusing when the file is nav-specific. All imports update via a simple rename.
- **Standardize saveState on generic dataset iteration**: The PDP section hardcodes keys, which means new data attributes require updating both the controls and saveState. Nav, gallery, and single-image already use the generic approach (nav adds ephemeral key filtering).
- **Test files stay in `tests/`**: No new test infrastructure (fixtures, helpers directory) — just add missing tests to existing files and extract shared helpers into a `tests/helpers.ts` if warranted.

---

## Open Questions

### Resolved During Planning

- **Should we add unit tests for shared utilities?** No — they're well-exercised through e2e tests, and the marginal value doesn't justify the effort for a prototype.
- **Should the lightbox extraction change any public API?** No — the extraction is internal. `initImageLightbox` and `initPdpBuyBoxLightbox` keep their current signatures.

### Deferred to Implementation

- **Exact helper function signatures** for extracted lightbox utilities — depends on what falls out cleanly during extraction
- **Whether PDP saveState needs CSS custom property support** — the PDP section currently doesn't use inline CSS props, but the convention says it should have the plumbing

---

## Implementation Units

- [ ] U1. **Add missing PDP Buy Box test coverage**

**Goal:** Cover the untested pricing modes, sold-out variant interactions, and control toggles that represent the highest-risk gaps in the test suite.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `tests/pdp-buy-box.spec.ts`

**Approach:**
- Add tests for `priceDisplay` modes: 'highest' shows max price, 'range' shows min–max format
- Add tests for `currencyNotation` modes: 'code' renders "USD", 'none' renders bare number
- Add tests for `priceFormat`: 'whole' renders without decimals
- Add tests for sold-out variant interactions: selecting a color that causes chips to become disabled/aria-disabled
- Add tests for `showVariants` toggle: off hides option groups
- Add tests for `showBnpl` toggle: off hides BNPL message

**Patterns to follow:**
- Existing `checkRadio` helper in the file
- Existing product switching tests as model for control interaction patterns

**Test scenarios:**
- Happy path: set priceDisplay to 'range' with chip options present, confirm price shows "min–max" format
- Happy path: set currencyNotation to 'code', confirm price text contains "USD"
- Happy path: set priceFormat to 'whole', confirm price lacks decimal point
- Edge case: select a sold-out color variant, confirm chips become disabled with aria-disabled="true"
- Edge case: select a color that conditionally sells out one chip, confirm only that chip is disabled
- Happy path: toggle showVariants off, confirm both option groups are hidden
- Happy path: toggle showBnpl off, confirm BNPL message is not visible

**Verification:**
- All new tests pass with `npm run test:e2e`
- No existing tests break

---

- [ ] U2. **Add missing PDP lightbox edge case tests**

**Goal:** Cover focus trapping, backdrop click, and keyboard boundary behavior in the PDP lightbox that are tested for the gallery lightbox but missing for the PDP implementation.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `tests/pdp-buy-box-lightbox.spec.ts`

**Approach:**
- Add focus trap test: open lightbox, Tab through elements, confirm focus stays within dialog
- Add backdrop click test: click backdrop, confirm lightbox closes
- Add ArrowLeft boundary test: at index 0, press ArrowLeft, confirm stays at 0 (clamped, not wrapping)
- Add ArrowRight boundary test: at last image, press ArrowRight, confirm stays at last index
- Add section-switch lifecycle test: open PDP lightbox, switch to nav, switch back, confirm lightbox is closed

**Patterns to follow:**
- Gallery lightbox tests in `tests/image-lightbox.spec.ts` — especially the "focus is trapped" and "backdrop click" tests

**Test scenarios:**
- Happy path: focus trap cycles within dialog on Tab and Shift+Tab
- Happy path: backdrop click closes the lightbox
- Edge case: ArrowLeft at index 0 stays at index 0 (no wrap)
- Edge case: ArrowRight at last index stays at last index (no wrap)
- Integration: lightbox does not persist across section switches

**Verification:**
- All new tests pass
- Existing PDP lightbox tests remain green

---

- [ ] U3. **Add missing gallery and single-image test coverage**

**Goal:** Cover gallery image set switching, subheading/headingAlign controls, and single-image width controls.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `tests/shell-switching.spec.ts`
- Modify: `tests/image-lightbox.spec.ts`

**Approach:**
- In shell-switching: add test for switching gallery image set via select control, verify items rebuild
- In shell-switching: add test for gallery subheading input and headingAlign radio
- In shell-switching: add test for single-image bgWidth and contentWidth controls updating data attributes
- In image-lightbox: add test for lightbox radius in grid layout (existing test only covers slideshow)

**Patterns to follow:**
- Existing gallery control tests in `shell-switching.spec.ts`
- Existing `checkRadio` helper pattern

**Test scenarios:**
- Happy path: switch gallery image set to 'seller-1', confirm gallery items show seller-1 images
- Happy path: type subheading text, confirm data-subheading updates and element text changes
- Happy path: change heading alignment, confirm data-heading-align updates
- Happy path: set single-image bgWidth to 'hug', confirm data-bg-width='hug'
- Happy path: set single-image contentWidth to 'narrow', confirm data-content-width='narrow'
- Integration: single-image width state persists across section switches

**Verification:**
- All new tests pass alongside existing test suite

---

- [ ] U4. **Extract shared lightbox infrastructure**

**Goal:** Eliminate ~200 lines of duplicated code between `image.lightbox.ts` and `pdp-buy-box.lightbox.ts` by extracting shared helpers into a new module.

**Requirements:** R2

**Dependencies:** U1, U2, U3 (tests must exist first to catch regressions)

**Files:**
- Create: `src/lightbox.shared.ts`
- Modify: `src/image.lightbox.ts`
- Modify: `src/pdp-buy-box.lightbox.ts`

**Approach:**
- Extract these duplicated functions into `lightbox.shared.ts`:
  - `getFocusableElements(root)` — identical in both files, pure function
  - `findScrollContainer(host)` — identical pattern, pure function
  - `setTriggerExpanded(trigger, expanded)` — identical, pure function
- For closure-dependent functions (`syncDialogPosition`, `lockScroll`/`unlockScroll`, `clearInert`/`applyInert`), the extraction is more nuanced because they lazily initialize `scrollContainer` from a closure variable. Options: (a) accept pre-resolved parameters, (b) return resolved values for callers to cache, or (c) extract only the pure logic and leave caching in callers. The implementer should evaluate which approach keeps the call sites cleanest.
- Focus-trap logic is inline in both keyboard handlers and differs slightly (PDP falls back to `closeButton.focus()` when no focusable elements; image lightbox simply returns). Do not extract a shared `trapFocus` — leave focus trapping inline in each handler to preserve their distinct behaviors.
- Both lightbox files import from the shared module
- No public API changes — `initImageLightbox` and `initPdpBuyBoxLightbox` keep their signatures

**Patterns to follow:**
- Existing shared modules: `src/image-radius.ts`, `src/section-width.ts`, `src/control-builders.ts`
- AbortController cleanup pattern used throughout the codebase

**Test scenarios:**
- Test expectation: none — behavioral change is zero; existing e2e tests are the regression suite

**Verification:**
- `npm run build` passes (typecheck + build)
- All existing lightbox tests pass unchanged
- Both lightboxes behave identically in the browser

---

- [ ] U5. **Rename `controls.ts` → `nav.controls.ts`**

**Goal:** Normalize the nav controls filename to match the `{section}.controls.ts` convention used by all other sections.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Rename: `src/controls.ts` → `src/nav.controls.ts`
- Modify: `src/nav.section.ts` (update import path)

**Approach:**
- Git rename to preserve history
- Update the single import in `nav.section.ts`
- Update CLAUDE.md reference

**Patterns to follow:**
- `src/gallery.controls.ts`, `src/single-image.controls.ts`, `src/pdp-buy-box.controls.ts`

**Test scenarios:**
- Test expectation: none — pure rename, no behavioral change

**Verification:**
- `npm run build` passes
- All nav tests pass

---

- [ ] U6. **Standardize saveState across all sections**

**Goal:** Make PDP buy box's saveState use the same generic dataset iteration pattern as gallery and single-image, plus add CSS custom property support for forward compatibility.

**Requirements:** R5

**Dependencies:** U1 (PDP tests must exist to catch regressions)

**Files:**
- Modify: `src/pdp-buy-box.section.ts`

**Approach:**
- Replace the hardcoded saveState key list with generic `Object.entries(root.dataset)` iteration (matching gallery.section.ts pattern)
- `productId` is already a data attribute (`root.dataset.productId`) that the shell's `applyStateToRoot` restores to the DOM before init. The generic iteration captures it automatically — no `custom:` prefix needed. Do NOT use `custom:productId` because `applyStateToRoot` skips `custom:` keys, which would break restoration.
- Keep nav.section.ts as-is — it already uses generic iteration with ephemeral key filtering

**Patterns to follow:**
- `src/gallery.section.ts:29-47` — generic dataset + CSS prop iteration
- `src/single-image.section.ts:29-39` — generic dataset iteration
- `src/nav.section.ts:52-75` — ephemeral key exclusion + CSS prop + custom keys

**Test scenarios:**
- Happy path: PDP buy box state round-trips across section switches (already tested)
- Edge case: verify all PDP data attributes are present on root.dataset after init (not undefined) — the current hardcoded saveState uses `??` fallbacks that mask missing attributes; generic iteration would skip undefined keys
- Edge case: any new data attributes added to PDP in the future are automatically saved without updating saveState

**Verification:**
- PDP state persistence tests still pass
- URL serialization tests still pass
- Manual verification: configure PDP, switch to nav and back, all state restored

---

- [ ] U7. **Update CLAUDE.md to reflect current architecture**

**Goal:** Bring the project documentation up to date with the actual 4-section codebase.

**Requirements:** R3

**Dependencies:** U4, U5 (captures the rename and new shared module)

**Files:**
- Modify: `CLAUDE.md`

**Approach:**
- Add PDP Buy Box section to the Architecture section with its file list
- Add Single Image section description
- Document the shared modules: `image.lightbox.ts`, `lightbox.shared.ts` (after U4), `image-radius.ts`, `image.targets.ts`, `range-control.ts`, `section-width.ts`
- Update the nav section to reference `nav.controls.ts` (after U5)
- Add a "Shared modules" subsection documenting the cross-section utilities
- Update the Testing section with all 5 test files
- Document the `custom:` key convention in saveState

**Patterns to follow:**
- Existing CLAUDE.md formatting and section structure

**Test scenarios:**
- Test expectation: none — documentation only

**Verification:**
- CLAUDE.md accurately describes the current file structure
- All referenced file paths exist

---

- [ ] U8. **Extract shared test helpers**

**Goal:** Reduce test code duplication by extracting common helpers used across multiple test files.

**Requirements:** R6

**Dependencies:** U1, U2, U3

**Files:**
- Create: `tests/helpers.ts`
- Modify: `tests/pdp-buy-box.spec.ts`
- Modify: `tests/pdp-buy-box-lightbox.spec.ts`
- Modify: `tests/shell-switching.spec.ts`
- Modify: `tests/image-lightbox.spec.ts`
- Modify: `tests/nav-accessibility.spec.ts`

**Approach:**
- Extract `checkRadio(page, name, value)` — duplicated in 3 test files (shell-switching, image-lightbox, pdp-buy-box)
- Extract `setRangeValue(page, name, value)` — duplicated in 3 test files (nav-accessibility, shell-switching, image-lightbox)
- Import from `./helpers` in each consuming test file
- Note: `setStepperValue` exists only in nav-accessibility.spec.ts — leave it in place

**Patterns to follow:**
- Keep helpers simple — just move, don't abstract further

**Test scenarios:**
- Test expectation: none — pure extraction, no behavioral change

**Verification:**
- All existing tests pass with imports from the shared helpers file

---

- [ ] U9. **Clean up stale documentation**

**Goal:** Remove or update plan files and solution docs that are now historical artifacts.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Review: `docs/plans/feat-section-width-system.md` (no date prefix, predates convention)
- Review: `docs/plans/2026-04-17-001-feat-image-lightbox-zoom-plan.md` (implemented)
- Review: `docs/plans/2026-04-22-001-feat-pdp-buy-box-section-plan.md` (implemented)
- Review: `docs/plans/2026-04-22-002-feat-pdp-image-gallery-plan.md` (implemented)
- Review: `docs/plans/2026-04-22-003-feat-huckberry-pdp-lightbox-plan.md` (implemented)
- Review: `docs/plans/2026-04-22-004-refactor-6-12-column-grid-plan.md` (implemented)

**Approach:**
- Mark implemented plans as `status: completed` in their frontmatter
- Add `problem_type: ui_bug` to solution doc frontmatter where missing (per learnings researcher recommendation)

**Patterns to follow:**
- Plan frontmatter convention: `status: active | completed`

**Test scenarios:**
- Test expectation: none — documentation only

**Verification:**
- All plan files have correct status reflecting implementation state

---

- [ ] U10. **Remove dead CSS and unused TypeScript exports**

**Goal:** Clean up dead code identified by the maintainability and pattern review agents.

**Requirements:** R8

**Dependencies:** None

**Files:**
- Modify: `src/pdp-buy-box.lightbox.css` (remove 3 dead `[data-state="opening"]` selectors — JS never sets this state)
- Modify: `src/controls.css` (remove dead `.swatch--transparent-disabled` rule and `.controls__title` rule)
- Modify: `src/image-radius.ts` (unexport `DEFAULT_IMAGE_RADIUS`, `ImageRadiusValue`, `ImageRadiusStop`, `getImageRadiusStop`)
- Modify: `src/image.targets.ts` (unexport `ZOOM_TRIGGER_SELECTOR`, `resolveZoomTarget`)
- Modify: `src/section-width.ts` (unexport `BgWidth`, `ContentWidth`)
- Modify: `src/nav.schema.ts` (unexport `ButtonStyle`, `Alignment`, `Capitalization`, `CartIcon`, `LogoStyle`)

**Approach:**
- CSS: remove the selectors identified as unreachable
- TypeScript: remove `export` keyword from symbols that have no external consumers. With `noUnusedLocals: true`, the compiler will flag if any are actually needed.

**Patterns to follow:**
- Keep unused types only if they serve as documentation for the `as const` arrays they derive from

**Test scenarios:**
- Test expectation: none — dead code removal, no behavioral change

**Verification:**
- `npm run build` passes
- All tests pass
- No visual regression

---

- [ ] U11. **Fix `image.lightbox.css` using `@media` instead of `@container`**

**Goal:** The image lightbox CSS uses `@media (max-width: 767px)` for responsive adjustments, but the lightbox is positioned inside `#preview-root` and should respond to the preview container width, not the browser viewport. This means the lightbox responsive styles fire incorrectly when the browser window is wide but the preview is set to a narrow viewport (e.g., 375px).

**Requirements:** R9

**Dependencies:** U3 (lightbox tests should exist for grid layout)

**Files:**
- Modify: `src/image.lightbox.css`

**Approach:**
- Replace `@media (max-width: 767px)` with an appropriate `@container` query targeting the section root's container
- The PDP lightbox already solves this correctly by using JS-driven `[data-mode="desktop"]`/`[data-mode="mobile"]` data attributes — the image lightbox should follow a similar container-query pattern
- Verify the lightbox renders correctly at all preview viewport widths (375, 768, 1280, fluid)

**Patterns to follow:**
- Container query usage in `gallery.css`, `pdp-buy-box.css`, `section-width.css`
- The PDP lightbox's JS-driven mode approach in `pdp-buy-box.lightbox.ts`

**Test scenarios:**
- Edge case: browser window at 1280px, preview viewport set to 375px — lightbox should use mobile/narrow styles
- Happy path: lightbox navigation chrome is correctly sized at each preview viewport width
- Edge case: verify `@container` queries apply correctly to a `position: absolute` dialog inside a container element — if containment doesn't propagate through the dialog, a JS-driven mode approach (like PDP's `data-mode`) may be needed instead

**Verification:**
- Visual check in browser: lightbox at 375px preview should show narrow-viewport styles regardless of browser width
- All existing lightbox containment tests pass

---

- [ ] U12. **Deduplicate `clampIndex` into lightbox shared module**

**Goal:** Move the duplicated `clampIndex` function into `lightbox.shared.ts` alongside the other shared helpers. The `queryRequired` duplication (2 copies across PDP files) is too trivial to justify its own module — leave it as-is.

**Requirements:** R10

**Dependencies:** U4 (lightbox.shared.ts must exist)

**Files:**
- Modify: `src/lightbox.shared.ts` (add `clampIndex`)
- Modify: `src/pdp-buy-box.lightbox.ts` (import `clampIndex` from lightbox.shared)
- Modify: `src/pdp-buy-box.media.ts` (import `clampIndex` from lightbox.shared)

**Approach:**
- `clampIndex(index, length)` is duplicated in `pdp-buy-box.lightbox.ts:37` and `pdp-buy-box.media.ts:24` — move to `lightbox.shared.ts`
- `queryRequired` stays local to its two PDP files (2 copies of a 3-line function don't justify a shared module)

**Patterns to follow:**
- Same shared module being created in U4

**Test scenarios:**
- Test expectation: none — pure extraction, no behavioral change

**Verification:**
- `npm run build` passes
- All PDP tests pass

---

## System-Wide Impact

- **Interaction graph:** The lightbox extraction (U4) changes internal module boundaries but no public APIs. Both `initImageLightbox` and `initPdpBuyBoxLightbox` maintain their current signatures.
- **Error propagation:** No changes to error handling paths.
- **State lifecycle risks:** The saveState standardization (U6) changes how PDP state is serialized. Existing URL state from before this change will still deserialize correctly because `applyStateToRoot` in `shell.ts` is already generic.
- **API surface parity:** No external API changes.
- **Integration coverage:** The new tests (U1-U3) significantly expand integration coverage for PDP pricing, sold-out states, and gallery image set switching.
- **Unchanged invariants:** Shell lifecycle, Section interface, data-attribute-driven rendering, AbortController cleanup pattern, overlay containment rules — all remain untouched.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Lightbox extraction breaks subtle animation timing | Existing e2e tests cover open/close/focus/keyboard. Manual visual check required for FLIP animation quality. |
| PDP saveState change breaks URL sharing | The shell's `applyStateToRoot` already handles generic keys. URL serialization tests validate. |
| Test helpers extraction causes import ordering issues | Playwright handles this natively; no special import ordering needed. |
| Renaming controls.ts breaks a stale reference somewhere | `npm run build` catches all TypeScript import errors. |

---

## Sources & References

- Related code: `src/image.lightbox.ts`, `src/pdp-buy-box.lightbox.ts` (duplication targets)
- Related learnings: `docs/solutions/ui-bugs/fixed-overlay-containment-preview.md`, `docs/solutions/ui-bugs/flip-animation-origin-lightbox.md`
- Existing plans: `docs/plans/` (6 plans covering prior feature work)
