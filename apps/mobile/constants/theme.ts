export const COLORS = {
  cream: '#FAF6F1',
  warmSand: '#F0EBE3',
  charcoal: '#1C1C1C',
  stone: '#8C8279',
  sage: '#7A9E7E',
  terracotta: '#C17C5E',
  linen: '#E8E2DA',
  pinGreen: '#5B9A6B',
  pinRed: '#C75D5D',
  pinBlue: '#5B89A6',
  pinAmber: '#C4944A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const FONTS = {
  display: 'Nunito',
  body: 'NunitoSans',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADII = {
  card: 16,
  button: 12,
  chip: 20,
  full: 9999,
} as const;

// Sydney CBD coordinates
export const MAP_DEFAULT = {
  latitude: -33.8688,
  longitude: 151.2093,
  zoom: 13,
} as const;
