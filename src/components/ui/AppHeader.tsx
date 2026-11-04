import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '../../constants/ui';
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
    <View className="flex-row items-center gap-3 pb-2 pt-1">
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={6}
          className="clay-raised h-12 w-12 items-center justify-center rounded-2xl bg-aqua-surface shadow-sm"
          style={({ pressed }) => pressed ? { opacity: 0.9, transform: [{ scale: 0.96 }] } : undefined}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
      ) : marca ? (
        <View className="clay-raised h-12 w-12 items-center justify-center rounded-2xl bg-aqua-brand">
          <Ionicons name="water" size={20} color={colors.white} />
        </View>
      ) : null}

      <View className="flex-1 gap-0.5">
        <Texto variante="titulo" numberOfLines={2}>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto variante="caption" color={colors.textMuted} numberOfLines={2}>
            {subtitulo}
          </Texto>
        ) : null}
      </View>

      {derecha ? <View className="items-end">{derecha}</View> : null}
    </View>
  );
}
