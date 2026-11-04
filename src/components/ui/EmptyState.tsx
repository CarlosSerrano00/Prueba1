import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
import { Texto } from './Texto';

interface EmptyStateProps {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  mensaje: string;
  accion?: ReactNode;
  compacto?: boolean;
}

export function EmptyState({ icono, titulo, mensaje, accion, compacto }: EmptyStateProps) {
  return (
    <View className={`items-center justify-center gap-2 px-4 ${compacto ? 'py-4' : 'py-8'}`}>
      <View className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full border border-white bg-teal-100 shadow-sm">
        <Ionicons name={icono} size={30} color={colors.accent} />
      </View>
      <Texto variante="subtitulo" centrado>
        {titulo}
      </Texto>
      <Texto variante="caption" color={colors.textMuted} centrado>
        {mensaje}
      </Texto>
      {accion ? <View className="mt-2 self-stretch">{accion}</View> : null}
    </View>
  );
}
