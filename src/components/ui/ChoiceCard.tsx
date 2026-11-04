import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { colors } from '../../constants/ui';
import { Texto } from './Texto';

interface ChoiceCardProps {
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
  seleccionado: boolean;
  onPress: () => void;
  color?: string;
  fondo?: string;
}

export function ChoiceCard({
  titulo,
  descripcion,
  icono,
  seleccionado,
  onPress,
  color = colors.accentDark,
  fondo = colors.accentSoft,
}: ChoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionado }}
      accessibilityLabel={`${titulo}. ${descripcion}`}
      android_ripple={{ color: fondo }}
      className="clay-raised flex-row items-center gap-3 rounded-3xl bg-aqua-surface p-3 shadow-sm"
      style={({ pressed }) => [
        seleccionado ? { borderColor: color, backgroundColor: fondo } : undefined,
        pressed ? { opacity: 0.9, transform: [{ scale: 0.985 }] } : undefined,
      ]}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl border border-white/50" style={{ backgroundColor: seleccionado ? color : colors.surfaceAlt }}>
        <Ionicons name={icono} size={21} color={seleccionado ? colors.white : colors.textMuted} />
      </View>

      <View className="flex-1 gap-px">
        <Texto variante="cuerpoFuerte" color={seleccionado ? color : colors.text}>
          {titulo}
        </Texto>
        <Texto variante="caption" color={seleccionado ? color : colors.textMuted}>
          {descripcion}
        </Texto>
      </View>

      <View className="h-[22px] w-[22px] items-center justify-center rounded-full border-2" style={{ borderColor: seleccionado ? color : colors.borderStrong }}>
        {seleccionado ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      </View>
    </Pressable>
  );
}
