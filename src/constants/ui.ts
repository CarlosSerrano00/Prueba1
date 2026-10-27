import { Platform } from 'react-native';

/**
 * Identidad visual de AquaRuta.
 * Los colores de estado siempre se acompañan de texto e icono en la interfaz.
 */
export const colors = {
  brand: '#073B4C',
  brandSoft: '#0A4F63',
  brandMuted: '#14647A',
  accent: '#0E7490',
  accentDark: '#155E75',
  accentSoft: '#E0F2FE',
  background: '#F4F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF2F5',
  surfaceBrand: '#E8F4F8',
  border: '#D5E2E8',
  borderStrong: '#A9C2CC',
  text: '#0F2A33',
  textMuted: '#5A7079',
  textSoft: '#7C929A',
  textOnBrand: '#FFFFFF',
  textOnBrandMuted: '#B9D7E1',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#A85A06',
  warningSoft: '#FEF3C7',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  info: '#0369A1',
  infoSoft: '#E0F2FE',
  draft: '#6D28D9',
  draftSoft: '#EDE9FE',
  pending: '#A85A06',
  pendingSoft: '#FEF3C7',
  sent: '#15803D',
  sentSoft: '#DCFCE7',
  overlay: 'rgba(7, 59, 76, 0.55)',
  white: '#FFFFFF',
  black: '#000000',
  disabled: '#B8C7CD',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const minTouch = 48;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0B2B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 2,
  },
  default: {},
});

export const fonts = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;
