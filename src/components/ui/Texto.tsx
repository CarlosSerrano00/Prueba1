import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts, fontSize } from '../../constants/ui';

export type VarianteTexto =
  | 'display'
  | 'titulo'
  | 'encabezado'
  | 'subtitulo'
  | 'cuerpo'
  | 'cuerpoFuerte'
  | 'etiqueta'
  | 'caption'
  | 'micro'
  | 'mono';

interface TextoProps extends TextProps {
  variante?: VarianteTexto;
  color?: string;
  peso?: 'regular' | 'medium' | 'bold';
  centrado?: boolean;
}

export function Texto({
  variante = 'cuerpo',
  color = colors.text,
  peso,
  centrado,
  style,
  ...props
}: TextoProps) {
  return (
    <Text
      {...props}
      style={[
        estilos.base,
        variantes[variante],
        peso === 'bold' && estilos.bold,
        peso === 'medium' && estilos.medium,
        centrado && estilos.centrado,
        { color },
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  base: {
    fontFamily: fonts.regular,
    includeFontPadding: false,
  },
  bold: {
    fontFamily: fonts.medium,
    fontWeight: '700',
  },
  medium: {
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  centrado: {
    textAlign: 'center',
  },
});

const variantes = StyleSheet.create({
  display: {
    fontSize: fontSize.display,
    lineHeight: 42,
    fontWeight: '700',
  },
  titulo: {
    fontSize: fontSize.xxl,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  encabezado: {
    fontSize: fontSize.xl,
    lineHeight: 26,
    fontWeight: '700',
  },
  subtitulo: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    fontWeight: '600',
  },
  cuerpo: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  cuerpoFuerte: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: '600',
  },
  etiqueta: {
    fontSize: fontSize.xs,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  micro: {
    fontSize: fontSize.xs,
    lineHeight: 15,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});
