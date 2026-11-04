import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
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
      className="flex-row items-center gap-3 rounded-3xl p-3"
    >
      <View className="h-[46px] w-[46px] items-center justify-center rounded-xl border border-white bg-indigo-100">
        <Ionicons name="speedometer-outline" size={21} color={colors.accentDark} />
      </View>
      <View className="flex-1 gap-px">
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
