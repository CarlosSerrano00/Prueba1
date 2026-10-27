import { Platform } from 'react-native';

/**
 * Identidad visual de AquaRuta con Claymorphism.
 *
 * Las superficies combinan un borde claro, una sombra exterior suave y un
 * borde interior oscuro simulado con los bordes superior/izquierdo. En
 * Android la profundidad se refuerza con `elevation`; en iOS con sombras
 * nativas. Los estados siempre se acompañan de texto e icono, nunca solo de
 * color.
 */
export const colors = {
  brand: '#5B5BD6',
  brandSoft: '#6E6EE8',
  brandMuted: '#8585F2',
  accent: '#0EA5A4',
  accentDark: '#0F766E',
  accentSoft: '#CCFBF1',
  background: '#E9EDF8',
  surface: '#F3F6FF',
  surfaceAlt: '#E3E9F8',
  surfaceBrand: '#E4E7FF',
  border: '#D8DFF1',
  borderStrong: '#B7C2DE',
  text: '#1D2340',
  textMuted: '#5E6687',
  textSoft: '#8B93AF',
  textOnBrand: '#FFFFFF',
  textOnBrandMuted: '#E0E2FF',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#E11D48',
  dangerSoft: '#FFE4E6',
  info: '#0369A1',
  infoSoft: '#DBEAFE',
  draft: '#7C3AED',
  draftSoft: '#EDE9FE',
  pending: '#B45309',
  pendingSoft: '#FEF3C7',
  sent: '#15803D',
  sentSoft: '#DCFCE7',
  overlay: 'rgba(29, 35, 64, 0.48)',
  white: '#FFFFFF',
  black: '#000000',
  disabled: '#B8C2D6',
  blobLavender: '#D9D7FF',
  blobMint: '#C9F5EA',
  blobPeach: '#FFE0D4',
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
  sm: 14,
  md: 20,
  lg: 26,
  xl: 32,
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

/** Borde de arcilla: claro arriba/izquierda, sombreado abajo/derecha. */
export const clayBorder = {
  borderWidth: 1.5,
  borderColor: 'rgba(255, 255, 255, 0.92)',
  borderTopColor: 'rgba(255, 255, 255, 0.98)',
  borderLeftColor: 'rgba(255, 255, 255, 0.95)',
  borderBottomColor: 'rgba(130, 139, 183, 0.24)',
  borderRightColor: 'rgba(130, 139, 183, 0.24)',
} as const;

/** Hueco de arcilla para campos: sombra interior simulada. */
export const clayInset = {
  borderWidth: 1.5,
  borderColor: '#D6DDF0',
  borderTopColor: 'rgba(137, 147, 190, 0.48)',
  borderLeftColor: 'rgba(137, 147, 190, 0.30)',
  borderBottomColor: 'rgba(255, 255, 255, 0.98)',
  borderRightColor: 'rgba(255, 255, 255, 0.98)',
  backgroundColor: '#E8EDF9',
} as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#737EAE',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  android: {
    elevation: 7,
  },
  default: {},
});

export const clayShadowStrong = Platform.select({
  ios: {
    shadowColor: '#5B5BD6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.26,
    shadowRadius: 22,
  },
  android: {
    elevation: 10,
  },
  default: {},
});

export const clayShadowSoft = Platform.select({
  ios: {
    shadowColor: '#7C86B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
  },
  android: {
    elevation: 3,
  },
  default: {},
});

export const fonts = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;
