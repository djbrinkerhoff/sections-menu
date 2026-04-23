---
date: 2026-04-23
topic: single-image-mask-shapes
---

# Single Image Mask Shapes

## Problem Frame

The single-image section currently offers border-radius as its only shape control. Users want to apply decorative shape masks to their hero image — circles, arches, organic blobs — to create more expressive layouts. The system needs to ship with an initial set of shapes and make it trivially easy to add more over time.

---

## Requirements

**Mask shape system**
- R1. A schema array defines all available mask shapes. Each entry declares an identifier, display label, path to an SVG asset, and a forced aspect ratio.
- R2. Adding a new mask shape requires only two steps: add an SVG file and add one entry to the schema array.
- R3. SVG mask assets are standalone files with a filled black shape on transparent background. Both geometric (circle, arch) and organic (blob, leaf) shapes are supported by the same mechanism.

**Applying masks**
- R4. When a mask is selected, the image container adopts the mask's forced aspect ratio and the image is clipped to the shape.
- R5. The mask control replaces the border-radius control. Selecting "None" removes the mask entirely (sharp corners, no radius). Border-radius is not available as a separate control.
- R6. The mask is a presentation treatment only. Opening the lightbox always shows the full unmasked image regardless of the active mask.

**Picker control**
- R7. The mask picker is a grid of shape swatches. Each swatch renders the SVG shape silhouette as a solid color fill at thumbnail scale.
- R8. The selected shape has a visible selection ring. Only one shape can be active at a time.
- R9. The "None" option displays as an outlined/empty rectangle, visually distinct from the filled shape swatches.

**State and lifecycle**
- R10. The active mask is persisted as a `data-*` attribute on the section root, following the existing state serialization convention. Switching sections and returning preserves the selected mask.

---

## Acceptance Examples

- AE1. **Covers R4, R5.** Given the user selects "Circle", the image container becomes 1:1 and the image is clipped to a circle. The border-radius control is not visible.
- AE2. **Covers R5.** Given the user selects "None", the image displays with sharp corners and no mask. No border-radius slider appears.
- AE3. **Covers R6.** Given a circle mask is active and the user clicks the image to open the lightbox, the lightbox shows the full rectangular image without any mask.
- AE4. **Covers R2, R3.** Given a designer creates a new star-burst SVG and a developer adds it to the schema, the shape appears in the picker with no other code changes required.

---

## Success Criteria

- The mask picker feels like a natural extension of the existing controls — same dark-theme panel, same interaction patterns (click to select, instant preview update).
- A new shape can be added in under 5 minutes by someone who has never touched the codebase, given the SVG file.

---

## Scope Boundaries

- The initial set ships with 4 shapes (specific shapes chosen during planning). "None" is a 5th option, not counted as a shape.
- Mask shapes apply to the single-image section only. Gallery and PDP are out of scope.
- No animated transitions between mask shapes.
- No user-uploadable custom masks.
- No soft-edge or feathered masks (binary visible/hidden only for v1).

---

## Key Decisions

- **Mask replaces border-radius entirely**: Simpler mental model — one shape control, not two competing ones. "None" gives you sharp corners; there is no separate radius slider.
- **Mask forces aspect ratio**: Each shape declares its own ratio rather than stretching to fit the image's natural dimensions. More polished results, especially for geometric shapes like circles.
- **SVG files as standalone assets**: Matches the existing `public/logos/` pattern. Keeps shapes editable in any SVG tool and decoupled from code.
- **Shape swatch picker over text-based controls**: Shapes are inherently visual. A grid of solid-filled silhouettes with a selection ring communicates faster than text labels.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] Which CSS mechanism to use — `mask-image` (already used for logos in nav) vs `clip-path: url()` — and how to handle vendor prefixes.
- [Affects R7][Needs research] How to render the SVG shape silhouettes in the picker swatches — inline SVG, mask-image on a colored div, or `<img>` tags.
- [Affects R4][Technical] How aspect-ratio enforcement interacts with the section-width system and container queries at narrow viewports.
- [Affects R1][Needs research] Which 4 initial shapes to ship. Candidates: circle, arch/rounded-top, blob, leaf, diamond, squircle.

---

## Next Steps

-> `/ce-plan` for structured implementation planning
