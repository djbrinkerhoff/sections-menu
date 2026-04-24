---
date: 2026-04-24
topic: faq-section
---

# FAQ Section

## Problem Frame

Storefront builders need a reusable FAQ section that can answer common buyer questions without forcing every storefront into the same visual treatment. The section should feel native to the existing section prototype: configurable from the controls panel, constrained by the shared width system, and polished enough to preview list-style accordions or card-based FAQ layouts.

---

## Actors

- A1. Storefront designer: Configures the FAQ section in the prototype controls panel.
- A2. Shopper: Reads questions and opens answers in the storefront preview.

---

## Key Flows

- F1. Configure FAQ layout
  - **Trigger:** A designer switches to the FAQ section.
  - **Actors:** A1
  - **Steps:** The designer chooses list or card layout, sets background/content width, edits heading/subheading, chooses whether the heading sits above or beside the FAQ items, and chooses how many seeded questions are visible.
  - **Outcome:** The preview updates immediately and the configured state is preserved when switching away and back.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7

- F2. Read FAQ answers
  - **Trigger:** A shopper selects a question in accordion mode.
  - **Actors:** A2
  - **Steps:** The shopper activates a question row, the answer expands inline, the indicator changes state, and activating it again collapses the answer.
  - **Outcome:** The shopper can inspect answers without leaving the section or losing orientation.
  - **Covered by:** R8, R9, R10, R11, R12

---

## Requirements

**Section content and width**
- R1. The FAQ section includes a configurable heading, configurable subheading, background color, and 10 seeded question/answer pairs.
- R2. The section uses the established background width and content width settings, supporting the same `full`/`hug` background choices and `full`/`wide`/`medium`/`narrow` content choices used by existing sections.
- R3. The heading/subheading can be positioned either above the FAQ items or beside them. Beside mode stacks to a readable single-column layout on narrow preview widths.
- R4. A control chooses how many seeded FAQs are shown, from 1 through 10.
- R5. The section can show an optional “See more FAQs” link below the visible questions. The link has editable label and URL values, with “See More FAQs” as the default label.

**Layouts and visual controls**
- R6. The section supports two layout options: `list` and `cards`.
- R7. Layout, heading placement, and indicator style controls use thumbnail-style option previews consistent with the existing nav and gallery visual pickers.
- R8. In `list` layout with accordion enabled, the visual treatment follows the Family homepage FAQ reference: large heading column, FAQ column, thin dividers, compact question rows, indicator on the left, answer text indented under the question, and link below the list.
- R9. In `cards` layout, each question/answer pair is presented as an individual card while preserving the same content, accordion setting, indicator setting, and visible-count behavior.

**Accordion behavior**
- R10. Accordion mode defaults to on.
- R11. When accordion mode is on, FAQ answers are collapsed by default and each question can be expanded/collapsed independently.
- R12. Accordion mode can be turned off. When off, all visible answers are shown statically and the rows are not interactive accordions.
- R13. Indicator style can be set to `chevrons` or `plus`. Chevrons rotate when opened; plus indicators become minus indicators when opened.
- R14. Accordion interactions are accessible: interactive rows expose expanded/collapsed state, keyboard activation works, and focus remains on the invoked question.

**State and lifecycle**
- R15. All FAQ controls persist through section switching using the existing section state behavior.
- R16. Switching away from the FAQ section tears down event listeners and switching back restores the configured state before controls initialize.

---

## Seed FAQ Content

- “How long does shipping take?” Answer: “Most orders ship within 2-3 business days. Delivery timing depends on the shipping method selected at checkout.”
- “Can I track my order?” Answer: “Yes. After your order ships, you will receive a confirmation email with tracking details.”
- “What is your return policy?” Answer: “Unused items can be returned within 30 days of delivery. Final sale items are not eligible for return.”
- “Can I exchange an item?” Answer: “Exchanges are available when replacement inventory is in stock. Start a return and choose exchange as the preferred resolution.”
- “How do I choose the right size?” Answer: “Use the size guide on each product page and compare it with an item you already own.”
- “Do you ship internationally?” Answer: “International shipping availability depends on the destination and shipping carrier options at checkout.”
- “Can I change or cancel my order?” Answer: “Contact support as soon as possible. Orders can only be changed or canceled before they are packed.”
- “What payment methods do you accept?” Answer: “The shop accepts major credit cards and other payment methods shown at checkout.”
- “Do you offer gift cards?” Answer: “Gift cards can be offered as a digital product and delivered by email after purchase.”
- “How do I contact support?” Answer: “Use the contact link in the shop footer and include your order number when the question is order-related.”

---

## Acceptance Examples

- AE1. **Covers R2, R3.** Given the FAQ section is visible, when the designer sets background width to `hug`, content width to `medium`, and heading placement to `beside`, the FAQ body appears on the shared grid with the heading beside the questions at desktop preview widths.
- AE2. **Covers R4.** Given 10 seeded FAQs exist, when the designer sets visible questions to 4, only the first 4 question/answer pairs appear and the control displays 4.
- AE3. **Covers R10, R11, R13.** Given accordion mode is on and indicator style is `plus`, when a shopper opens the first question, its answer appears and the plus becomes a minus.
- AE4. **Covers R12.** Given accordion mode is off, when the shopper views the FAQ section, all visible answers are shown and question rows do not expose accordion-expanded state.
- AE5. **Covers R5.** Given the “See more FAQs” option is enabled, when the designer edits the label and URL, the link appears below the visible FAQ list with the edited label and href.

---

## Success Criteria

- The FAQ section feels like a natural peer of the nav, gallery, single-image, and PDP sections: same shell behavior, same width controls, same immediate-preview control model.
- The list accordion clearly evokes the Family homepage FAQ reference while remaining generic enough for storefronts.
- Planning does not need to invent product behavior for layout, heading placement, accordion defaults, indicator behavior, link behavior, visible count, or seeded content.

---

## Scope Boundaries

- FAQ question/answer editing, reordering, adding custom FAQ items, and deleting individual FAQ items are out of scope for v1.
- Rich text answers, images inside answers, nested accordions, and categories/groups are out of scope.
- The “See more FAQs” link is a normal link preview, not a routed page builder integration.
- No external FAQ data source or merchant settings integration is required.
- The Family reference applies specifically to the `list` layout; the `cards` layout should be complementary, not a clone of that reference.

---

## Key Decisions

- Default accordion on, all answers collapsed: This matches the referenced Family FAQ behavior and keeps long FAQ lists compact.
- Static seeded content for v1: This keeps the feature bounded while still exercising layout, accordion, count, and link behavior.
- Thumbnail-style controls for visual choices: Layout, heading placement, and indicator style are easier to understand visually than text-only segmented labels.
- Optional link with editable label and URL: A link-only option covers “See more FAQs” without implying page management or routing.

---

## Dependencies / Assumptions

- The visual reference is the Family homepage FAQ section at https://family.co/ as checked on 2026-04-24.
- Existing section conventions apply: manual DOM controls, data-attribute-driven preview state, shared section width system, and full mount/unmount lifecycle.
- “Create thumbnails like gallery and nav” is interpreted as thumbnail-style controls in the controls panel, not image thumbnails inside FAQ content.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R8][Technical] Exact spacing, type scale, and divider details needed to evoke the Family FAQ while fitting this prototype's existing visual system.
- [Affects R14][Technical] Whether the accordion should allow multiple open answers simultaneously or enforce one-open-at-a-time. Default assumption: multiple answers can be open independently.

---

## Next Steps

-> `/ce-plan` for structured implementation planning
