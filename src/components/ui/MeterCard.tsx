import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
import type { Medidor } from '../../types/models';
import { formatearFechaHora, formatearMetros } from '../../utils/format';
import { TarjetaPresionable } from './Card';
import { Texto } from './Texto';

interface MeterCardProps {
  medidor: Medidor;
  onPress: () => void;
}

export function MeterCard({ medidor, onPress }: MeterCardProps) {
  return (
    <TarjetaPresionable
      onPress={onPress}
      accessibilityLabel={`Abrir medidor ${medidor.codigo}, ${medidor.direccion}`}
      estilo={estilos.tarjeta}
    >
      <View style={estilos.icono}>
        <Ionicons name="speedometer-outline" size={21} color={colors.accentDark} />
      </View>
      <View style={estilos.textos}>
        <Texto variante="mono" peso="bold" color={colors.brand}>
          {medidor.codigo}
        </Texto>
        <Texto variante="caption" numberOfLines={1}>
          {medidor.direccion}
        </Texto>
        <Texto variante="micro" color={colors.textMuted}>
          {medidor.sector} · Última: {formatearMetros(medidor.ultimaLectura)}
        </Texto>
        <Texto variante="micro" color={colors.textSoft}>
          Consultado el {formatearFechaHora(medidor.consultadoEn)}
        </Texto>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.textSoft} />
    </TarjetaPresionable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  icono: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceBrand,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 1,
  },
});
