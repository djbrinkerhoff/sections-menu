# Nav Component Requirements Handoff

## Overview

This document captures the current requirements implied by the built navigation prototype in `src/nav.*`, `src/controls.ts`, `src/nav.css`, and the Playwright coverage in `tests/nav-accessibility.spec.ts` and `tests/shell-switching.spec.ts`.

The nav is a section inside the prototype shell. It is not a generic site header. It must work inside a simulated preview viewport, support live configuration from the controls panel, and survive mount/unmount cycles when switching between sections.

## Product Goal

Build a configurable storefront navigation prototype with:

- five visual variants: `simple`, `fullscreen`, `sidebar`, `top`, `tile`
- responsive behavior across the shell's preview widths: `375`, `768`, `1280`, and `fluid`
- a settings panel that updates the nav live
- accessible keyboard behavior for menu, search, submenu, and cart drawer
- correct teardown and state restoration when switching between shell sections

## Component Boundaries

- The nav section consists of:
  - a root `<header class="nav">`
  - a primary nav region with links and submenu
  - optional social links group
  - search UI
  - cart trigger with optional count badge
  - a preview-scoped cart drawer using `<dialog>`
- The nav renders inside `#preview-root`, which acts as the containing block for overlays and drawers.
- The settings UI renders in the controls panel and is part of the nav section contract.

## State Model

### Persistent state

The following state must persist when the user switches away from the nav section and returns:

- all non-ephemeral `data-*` attributes on `.nav`
- CSS custom properties:
  - `--menu-color`
  - `--text-color`
  - `--nav-inset`
  - `--border-radius`
- JS-owned values:
  - nav item count
  - cart count

### Ephemeral state

The following state must never persist across viewport changes, section switches, or control changes that rebuild layout:

- `data-open`
- `data-top-inline`
- `data-simple-inline`
- `data-tile-inline`
- open search state
- open submenu state
- open cart drawer state
- inert state
- scroll-lock state
- focus-return state

### State restoration order

When restoring the nav section, persisted `data-*` attributes and CSS properties must be applied to the nav root before `init()` runs, so controls and behavior initialize from the restored DOM state.

## Settings Panel Requirements

### Settings groups

The controls panel must expose the nav settings in this order:

1. `Style`
2. `Colors`
3. `Layout`
4. `Content`

### Supported settings

| Setting | Values | Default | Notes |
|---|---|---|---|
| Variant | `simple`, `fullscreen`, `sidebar`, `top`, `tile` | `simple` | Thumbnail radio grid |
| Menu color | `white`, `black`, `yellow`, `pink`, `red`, `blue`, `transparent` | `black` | Drives `--menu-color` |
| Text color | `white`, `black`, `yellow`, `pink`, `red`, `blue` | `white` | Transparent is not allowed |
| Logo | `small`, `stacked` | `small` | Hidden for `tile` |
| Button style | `hamburger`, `plus`, `text` | `hamburger` | Hidden for `top` and `tile` |
| Logo position | `left`, `center`, `right` | `left` | Hidden for `sidebar` and `tile` |
| Inset | `off`, `on` | `off` | Hidden for `sidebar` and `tile` |
| Border radius | step values `0px`, `4px`, `8px`, `16px`, `9999px` | `0px` | Hidden for `sidebar`; hidden for `tile` control UI even though tile styling uses radius values |
| Search | `off`, `on` | `on` | Hides/shows search affordance |
| Social links | `off`, `on` | `off` | One group, not per-network toggles |
| Capitalization | `normal`, `lowercase`, `uppercase` | `normal` | Applies to nav links |
| Cart icon | `cart`, `bag` | `cart` | Switches icon glyph |
| Cart count | integer `0-99` | `0` | Updates badge and cart button label |
| Nav items | integer `0-20` | `4` | Rebuilds the primary nav list |

### Control visibility rules

The settings UI must hide controls per variant exactly as follows:

| Variant | Hidden controls |
|---|---|
| `top` | `button-style` |
| `sidebar` | `inset`, `border-radius`, `alignment` |
| `tile` | `inset`, `logo-style`, `alignment`, `button-style` |

### Setting side effects

- Changing `variant` must reset ephemeral nav state.
- Changing `variant` to `top` or `tile` must force `data-open="false"`.
- Turning `inset` on must set `--nav-inset: 16px`; off must set `0px`.
- Changing nav item count must rebuild `.nav__list` while preserving `.nav__social`.
- Changing nav item count must reset ephemeral nav state before/while rebuilding.
- Changing cart count must:
  - update `data-cart-count`
  - update `.nav__cart-count` text
  - hide the badge at `0`
  - update the cart button accessible label to include the item count when count > 0

## Markup Requirements

- The nav root must carry `data-*` defaults for all persisted settings.
- The primary nav must contain:
  - a list of nav items
  - a Shop submenu item with button trigger and submenu list
  - a social links list as a sibling of `.nav__list`, not nested inside it
- The social links group must contain exactly three links:
  - Instagram
  - Facebook
  - TikTok
- Social links must open in a new tab and include `rel="noopener noreferrer me"`.
- The cart drawer must remain in the normal DOM flow inside the preview container and must not use `showModal()`.

## Visual Variant Requirements

### 1. Simple

- Mobile and collapsed desktop state:
  - shows logo, actions, and menu toggle in a bar
  - opening the menu turns the nav into a full preview-scoped overlay
  - hides the actions cluster when open
  - renders the primary nav as a vertical list with separators
  - renders submenu items below the Shop row
  - renders social links below the nav list when enabled
- Desktop inline state:
  - hides the menu toggle
  - shows links inline in the masthead when they fit
  - keeps the primary links between the logo and actions
  - can still collapse back to overlay mode if links do not fit

### 2. Fullscreen

- Closed state:
  - search icon remains hidden but reserves layout space
- Open state:
  - nav fills the preview frame, not the browser viewport
  - logo is hidden
  - menu toggle becomes a close control
  - actions dissolve so search and cart become direct flex children
  - search becomes a full-width input row near the top
  - opening the menu must auto-open the search state
  - the search input must not auto-focus when the menu opens
  - the primary list must be vertically centered and scroll when too long
  - cart sits at the bottom
  - social links, when enabled, render between the link list and the cart

### 3. Sidebar

- Mobile:
  - opening the menu reveals a panel sliding in from the right edge of the preview
- Desktop:
  - closed state shows a vertical right-side rail treatment
  - open state expands into a larger panel
  - the logo must be visible and clickable when closed
  - the logo must be hidden when the panel is open
- Shared open-state behavior:
  - search is closed before the panel opens
  - outside click closes the panel
  - Shop submenu is always open and non-toggleable
  - the Shop group is rendered first as a section header block
  - long nav lists must scroll vertically
  - when social links are enabled, the panel must allow the list and social group to scroll together

### 4. Top

- This variant never uses a menu toggle.
- The masthead always contains logo, search, and cart.
- The primary links render as a full-width horizontal strip below the masthead by default.
- On mobile, the link strip must left-align and scroll horizontally.
- When links fit in available space, the links must be promoted into the masthead row.
- Inline promotion must not occur when alignment is `center`.
- Inline promotion must use hysteresis:
  - promote only when there is at least 16px of extra clearance
  - collapse immediately once links stop fitting
- When the Shop submenu opens, its submenu must be relocated so it renders as a full-width row directly under the masthead/link strip and is not clipped by the primary nav container.
- Social links, when enabled, must join the masthead cluster and not appear as a separate menu.

### 5. Tile

- Closed mobile and collapsed desktop state:
  - nav container background is transparent
  - logo, search, cart, and menu toggle render as individual boxed tiles
  - opening search replaces the logo box with a search box
- Open mobile and collapsed desktop state:
  - nav becomes a preview-scoped inset overlay
  - primary nav renders as a tile grid
  - regular items render as filled square tiles
  - the submenu item is a tile that expands in place
  - social links render as three tiles in a 3-column row when enabled
- Desktop inline state:
  - menu toggle is hidden
  - logo, primary nav, and actions render in a horizontal tile bar
  - links render as filled rectangular tiles that can wrap
  - submenu becomes an anchored dropdown below its parent tile
  - if links stop fitting, the layout must auto-collapse back to the boxed-header treatment
  - social links render as one combined tile group at the end of the bar

## Responsive and Layout Rules

- The nav root must use container queries rather than window-size-specific logic.
- The preview width controls are shell-owned; the nav must react when the preview width changes.
- Auto-inline/collapse behaviors are based on actual measured available width, not breakpoint only.
- Width-fit logic must include space used by:
  - logo
  - search
  - cart
  - social links, when enabled
- Width-fit logic must re-run when these inputs change:
  - variant
  - alignment
  - logo style
  - cart count
  - social links on/off
  - open/closed state
  - primary content changes

## Interaction Requirements

### Menu toggle

- Applicable to `simple`, `fullscreen`, `sidebar`, and `tile`.
- Must update `aria-expanded` and accessible label between menu/close states.
- Must ignore rapid double-click toggles during the transition window.

### Search

- Must be fully disabled visually when `data-search="false"`.
- In non-fullscreen variants, clicking outside an open search field must close it.
- Escape must close search before closing other UI when search is open.
- When search closes via Escape, focus must return to the search toggle.
- In `top` and desktop `simple`, opening search must not shift layout width for nearby elements; hidden elements should reserve their grid space.
- In `tile`, opening search changes the layout rather than only expanding an inline input.

### Shop submenu

- The Shop item is the second nav item whenever nav item count is at least 2.
- Submenu toggle must use delegated event handling so rebuilt nav items continue to work.
- Escape must close an open submenu before closing the menu.
- When submenu closes via Escape, focus must return to the submenu trigger.
- In `sidebar`, submenu is always open and non-interactive.

### Cart drawer

- Clicking the cart button opens a drawer scoped to the preview.
- The drawer must use `dialog.show()`, not `showModal()`.
- Clicking the backdrop closes the drawer.
- Escape closes the drawer.
- Closing the drawer via Escape or backdrop must restore focus to the prior focused control.

## Focus, Inert, and Scroll Lock

- Opening `simple`, `fullscreen`, `sidebar`, or `tile` menus must inert the non-nav preview siblings.
- `top` does not use menu open state and must not inert the preview.
- Opening `simple`, `fullscreen`, or `tile` menus must lock preview scrolling.
- Opening `sidebar` must not use the same full-preview scroll lock behavior as the full overlay variants.
- Opening the cart drawer must inert non-dialog preview siblings.
- Inert state must be reference-counted so menu and cart drawer can coexist safely.
- Destroying the section must fully reset inert state and preview overflow styles.

## Accessibility Requirements

- Search input must have an accessible label: `Search Site`.
- Search form must use `role="search"`.
- Menu toggle, search toggle, cart button, submenu button, and stepper buttons must expose accessible names.
- The cart button accessible label must include the item count when count > 0.
- Social links must have accessible labels for each network.
- Primary nav must remain keyboard reachable across all variants.
- The top variant primary region must be keyboard-focusable for horizontal scrolling and expose `role="region"`.
- Focus-visible styles must exist for interactive controls.

## Asset Requirements

- Logo marks must use mask-image assets from `public/logos/`.
- Social icons must use mask-image assets from `public/icons/instagram.svg`, `facebook.svg`, and `tiktok.svg`.
- Icon colors must inherit from `currentColor` so they respond automatically to menu/text color changes.

## Technical Constraints

- Implementation must remain framework-free and DOM-driven.
- Root state must stay data-attribute-driven.
- Styling must stay driven by `data-*` selectors plus scoped CSS custom properties.
- The nav root must keep `container-type: inline-size`.
- Event listeners must use `AbortController` cleanup.
- Section destroy order for nav is mandatory:
  1. reset ephemeral state
  2. reset nav module state
  3. abort/remove nav behavior listeners
  4. clean up controls
- Overlay containment rules are mandatory:
  - do not use `position: fixed` for preview-scoped overlays
  - do not use `showModal()` for the cart drawer
  - do not introduce positioned ancestors that trap absolute overlays unexpectedly

## Acceptance Criteria

- Switching away from nav and back restores all persistent settings and control selections.
- Switching away from nav and back does not restore open overlays, open search, open submenu, or cart drawer.
- Viewport width persists across section switches.
- Nav item count changes do not remove or corrupt social links.
- Each variant works at mobile and desktop preview widths without layout breakage.
- Large nav item counts still render usable overflow behavior:
  - `simple`: vertical overflow in open state
  - `fullscreen`: vertical overflow in list
  - `sidebar`: vertical overflow in panel list
  - `top`: horizontal overflow in link strip
  - `tile`: open-state grid or wrapped inline tiles depending on layout mode
- Escape handling works in this priority:
  - search
  - cart drawer
  - submenu
  - menu
- Cart drawer, fullscreen overlay, and sidebar panel remain visually contained inside `#preview-root`.

## Source of Truth

If implementation and this document diverge, the current source of truth is:

- markup: `src/nav.partial.html`
- settings/schema: `src/nav.schema.ts`, `src/controls.ts`
- behavior: `src/nav.ts`, `src/nav.section.ts`
- styling: `src/nav.css`
- expected behavior coverage: `tests/nav-accessibility.spec.ts`, `tests/shell-switching.spec.ts`
