import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
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
    <View style={[estilos.contenedor, compacto && estilos.compacto]}>
      <View style={estilos.circulo}>
        <Ionicons name={icono} size={30} color={colors.accent} />
      </View>
      <Texto variante="subtitulo" centrado>
        {titulo}
      </Texto>
      <Texto variante="caption" color={colors.textMuted} centrado>
        {mensaje}
      </Texto>
      {accion ? <View style={estilos.accion}>{accion}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  compacto: {
    paddingVertical: spacing.lg,
  },
  circulo: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  accion: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
