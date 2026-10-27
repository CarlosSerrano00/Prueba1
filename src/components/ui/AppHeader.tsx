import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clayBorder, clayShadowSoft, colors, radius, spacing } from '../../constants/ui';
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
    paddingTop: spacing.xs,
  },
  botonAtras: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...clayBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadowSoft,
  },
  presionado: {
    backgroundColor: colors.surfaceAlt,
    transform: [{ scale: 0.96 }],
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadowSoft,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  derecha: {
    alignItems: 'flex-end',
  },
});
