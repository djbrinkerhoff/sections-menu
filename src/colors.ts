export const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  yellow: '#F4D923',
  pink: '#F8B4D0',
  red: '#ED1818',
  blue: '#1841D4',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorName];

export const COLOR_LABELS: Record<ColorName, string> = {
  white: 'White',
  black: 'Black',
  yellow: 'Yellow',
  pink: 'Pink',
  red: 'Red',
  blue: 'Blue',
  transparent: 'Transparent',
};
