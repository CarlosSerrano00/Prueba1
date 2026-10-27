import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
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
      style={({ pressed }) => [
        estilos.tarjeta,
        seleccionado && { borderColor: color, backgroundColor: fondo },
        pressed && estilos.presionada,
      ]}
    >
      <View style={[estilos.icono, { backgroundColor: seleccionado ? color : colors.surfaceAlt }]}>
        <Ionicons name={icono} size={21} color={seleccionado ? colors.white : colors.textMuted} />
      </View>

      <View style={estilos.textos}>
        <Texto variante="cuerpoFuerte" color={seleccionado ? color : colors.text}>
          {titulo}
        </Texto>
        <Texto variante="caption" color={seleccionado ? color : colors.textMuted}>
          {descripcion}
        </Texto>
      </View>

      <View style={[estilos.radio, seleccionado && { borderColor: color }]}>
        {seleccionado ? <View style={[estilos.radioCentro, { backgroundColor: color }]} /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  presionada: {
    opacity: 0.88,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCentro: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
