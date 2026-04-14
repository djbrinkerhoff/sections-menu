export const VARIANTS = ['simple', 'fullscreen', 'sidebar', 'top', 'tile'] as const;
export const BUTTON_STYLES = ['hamburger', 'plus', 'text'] as const;
export const ALIGNMENTS = ['left', 'center', 'right'] as const;
export const CAPITALIZATIONS = ['normal', 'lowercase', 'uppercase'] as const;
export const CART_ICONS = ['cart', 'bag'] as const;
export const LOGO_STYLES = ['small', 'stacked'] as const;
export const BORDER_RADIUS_STEPS = ['0px', '4px', '8px', '16px', '9999px'] as const;

export const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#F4D923',
  pink: '#F8B4D0',
  lightBlue: '#BEE8F0',
  transparent: 'transparent',
} as const;

export type Variant = (typeof VARIANTS)[number];
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export type Alignment = (typeof ALIGNMENTS)[number];
export type Capitalization = (typeof CAPITALIZATIONS)[number];
export type CartIcon = (typeof CART_ICONS)[number];
export type LogoStyle = (typeof LOGO_STYLES)[number];
export type ColorName = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorName];

export type ControlMap = {
  variant: Variant;
  open: 'true' | 'false';
  buttonStyle: ButtonStyle;
  alignment: Alignment;
  capitalization: Capitalization;
  cartIcon: CartIcon;
  logoStyle: LogoStyle;
  inset: 'true' | 'false';
  borderRadius: '0' | '1' | '2' | '3' | '4';
};
