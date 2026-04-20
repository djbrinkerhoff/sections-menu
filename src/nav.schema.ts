export const VARIANTS = ['simple', 'fullscreen', 'sidebar', 'top', 'tile'] as const;
export const BUTTON_STYLES = ['hamburger', 'plus', 'text'] as const;
export const ALIGNMENTS = ['left', 'center', 'right'] as const;
export const CAPITALIZATIONS = ['normal', 'lowercase', 'uppercase'] as const;
export const CART_ICONS = ['cart', 'bag'] as const;
export const LOGO_STYLES = ['small', 'stacked'] as const;
export const FONT_SCALES = ['0', '1', '2', '3', '4'] as const;

export type Variant = (typeof VARIANTS)[number];
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export type Alignment = (typeof ALIGNMENTS)[number];
export type Capitalization = (typeof CAPITALIZATIONS)[number];
export type CartIcon = (typeof CART_ICONS)[number];
export type LogoStyle = (typeof LOGO_STYLES)[number];
export type FontScale = (typeof FONT_SCALES)[number];

export type ControlMap = {
  variant: Variant;
  open: 'true' | 'false';
  buttonStyle: ButtonStyle;
  alignment: Alignment;
  capitalization: Capitalization;
  cartIcon: CartIcon;
  logoStyle: LogoStyle;
  fontScale: FontScale;
  inset: 'true' | 'false';
  borderRadius: '0' | '4' | '8' | '16' | '9999';
  socialLinks: 'true' | 'false';
  search: 'true' | 'false';
};
