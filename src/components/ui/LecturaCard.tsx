import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
import type { Lectura } from '../../types/models';
import {
  etiquetaEstadoEnvio,
  etiquetaEstadoVerificacion,
  etiquetaTipoEstado,
} from '../../utils/etiquetas';
import { formatearFechaHora, formatearMetros } from '../../utils/format';
import { nombrePeriodo } from '../../utils/periodo';
import { Badge, type TonoBadge } from './Badge';
import { TarjetaPresionable } from './Card';
import { Texto } from './Texto';

interface LecturaCardProps {
  lectura: Lectura;
  onPress: () => void;
}

function presentacionEstado(lectura: Lectura): {
  tono: TonoBadge;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  if (lectura.estadoEnvio === 'enviado') {
    return { tono: 'exito', icono: 'checkmark-circle', color: colors.success };
  }
  if (lectura.estadoEnvio === 'requiere_revision') {
    return { tono: 'peligro', icono: 'alert-circle', color: colors.danger };
  }
  if (lectura.estadoEnvio === 'enviando') {
    return { tono: 'info', icono: 'sync', color: colors.info };
  }
  return { tono: 'advertencia', icono: 'time', color: colors.warning };
}

export function LecturaCard({ lectura, onPress }: LecturaCardProps) {
  const estado = presentacionEstado(lectura);
  const consumo =
    lectura.consumoCalculado != null ? formatearMetros(lectura.consumoCalculado) : 'Sin consumo';

  return (
    <TarjetaPresionable
      onPress={onPress}
      accessibilityLabel={`Lectura ${lectura.codigoMedidor}, ${etiquetaEstadoEnvio(
        lectura.estadoEnvio,
      )}`}
      className="gap-2 border-l-[5px] p-3 rounded-3xl"
      estilo={{ borderLeftColor: estado.color }}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-shrink flex-row items-center gap-1">
          <Ionicons name={estado.icono} size={18} color={estado.color} />
          <Texto variante="mono" peso="bold" color={colors.brand}>
            {lectura.codigoMedidor}
          </Texto>
        </View>
        <Badge texto={etiquetaEstadoEnvio(lectura.estadoEnvio)} tono={estado.tono} icono={estado.icono} />
      </View>

      <View className="flex-row flex-wrap gap-4">
        <View className="min-w-[82px] gap-px">
          <Texto variante="micro" color={colors.textMuted}>
            Periodo
          </Texto>
          <Texto variante="caption" peso="medium">
            {nombrePeriodo(lectura.periodo)}
          </Texto>
        </View>
        <View className="min-w-[82px] gap-px">
          <Texto variante="micro" color={colors.textMuted}>
            Consumo
          </Texto>
          <Texto variante="caption" peso="medium">
            {consumo}
          </Texto>
        </View>
        <View className="min-w-[82px] gap-px">
          <Texto variante="micro" color={colors.textMuted}>
            Estado
          </Texto>
          <Texto variante="caption" peso="medium">
            {etiquetaTipoEstado(lectura.tipoEstado)}
          </Texto>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center gap-2 border-t border-slate-200/50 pt-1">
        <Texto variante="micro" color={colors.textSoft} className="shrink-0">
          {formatearFechaHora(lectura.fechaRegistro)}
        </Texto>
        {lectura.fotoUri ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="camera" size={13} color={colors.textMuted} />
            <Texto variante="micro" color={colors.textMuted}>
              Foto
            </Texto>
          </View>
        ) : null}
        {lectura.estadoVerificacion !== 'no_aplica' ? (
          <Texto variante="micro" color={estado.color} numberOfLines={1} className="flex-1 text-right">
            {etiquetaEstadoVerificacion(lectura.estadoVerificacion)}
          </Texto>
        ) : null}
      </View>
    </TarjetaPresionable>
  );
}
