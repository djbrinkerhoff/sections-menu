// Shared section-width schema.
// Both gallery and single-image (and future sections) import these
// so changing a tier definition (e.g. "narrow" = 480px) propagates everywhere.

export const BG_WIDTHS = ['full', 'hug'] as const;
export const CONTENT_WIDTHS = ['full', 'wide', 'medium', 'narrow'] as const;

type BgWidth = (typeof BG_WIDTHS)[number];
type ContentWidth = (typeof CONTENT_WIDTHS)[number];

export const BG_WIDTH_LABELS: Record<BgWidth, string> = {
  full: 'Full',
  hug: 'Hug content',
};

export const CONTENT_WIDTH_LABELS: Record<ContentWidth, string> = {
  full: 'Full',
  wide: 'Wide',
  medium: 'Medium',
  narrow: 'Narrow',
};
