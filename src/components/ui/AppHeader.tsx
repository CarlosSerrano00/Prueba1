import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
import { Texto } from './Texto';

interface AppHeaderProps {
  titulo: string;
  subtitulo?: string;
  onBack?: () => void;
  derecha?: ReactNode;
  marca?: boolean;
}

export function AppHeader({ titulo, subtitulo, onBack, derecha, marca }: AppHeaderProps) {
  return (
    <View style={estilos.fila}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={6}
          style={({ pressed }) => [estilos.botonAtras, pressed && estilos.presionado]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
      ) : marca ? (
        <View style={estilos.logo}>
          <Ionicons name="water" size={20} color={colors.white} />
        </View>
      ) : null}

      <View style={estilos.textos}>
        <Texto variante="titulo" numberOfLines={2}>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="caption" color={colors.textMuted} numberOfLines={2}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>

      {derecha ? <View style={estilos.derecha}>{derecha}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  botonAtras: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: {
    backgroundColor: colors.surfaceAlt,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  derecha: {
    alignItems: 'flex-end',
  },
});
