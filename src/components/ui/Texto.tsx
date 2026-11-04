import { Text, type TextProps } from 'react-native';

import { colors } from '../../constants/ui';

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
  className?: string;
}

const clasesPorVariante: Record<VarianteTexto, string> = {
  display: 'text-4xl leading-[42px] font-bold',
  titulo: 'text-2xl leading-[31px] font-bold tracking-tight',
  encabezado: 'text-xl leading-[26px] font-bold',
  subtitulo: 'text-lg leading-6 font-semibold',
  cuerpo: 'text-[15px] leading-[22px]',
  cuerpoFuerte: 'text-[15px] leading-[22px] font-semibold',
  etiqueta: 'text-[11px] leading-[15px] font-bold tracking-[0.8px] uppercase',
  caption: 'text-[13px] leading-[19px]',
  micro: 'text-[11px] leading-[15px]',
  mono: 'font-mono text-[13px] leading-[19px]',
};

export function Texto({
  variante = 'cuerpo',
  color = colors.text,
  peso,
  centrado,
  className,
  style,
  ...props
}: TextoProps) {
  const pesoClase = peso === 'bold' ? 'font-bold' : peso === 'medium' ? 'font-medium' : '';

  return (
    <Text
      {...props}
      className={`font-sans ${clasesPorVariante[variante]} ${pesoClase} ${centrado ? 'text-center' : ''} ${className ?? ''}`}
      style={[{ color, includeFontPadding: false }, style]}
    />
  );
}
