import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
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
      estilo={[estilos.tarjeta, { borderLeftColor: estado.color }]}
    >
      <View style={estilos.filaSuperior}>
        <View style={estilos.codigoFila}>
          <Ionicons name={estado.icono} size={18} color={estado.color} />
          <Texto variante="mono" peso="bold" color={colors.brand}>
            {lectura.codigoMedidor}
          </Texto>
        </View>
        <Badge texto={etiquetaEstadoEnvio(lectura.estadoEnvio)} tono={estado.tono} icono={estado.icono} />
      </View>

      <View style={estilos.filaDatos}>
        <View style={estilos.dato}>
          <Texto variante="micro" color={colors.textMuted}>
            Periodo
          </Texto>
          <Texto variante="caption" peso="medium">
            {nombrePeriodo(lectura.periodo)}
          </Texto>
        </View>
        <View style={estilos.dato}>
          <Texto variante="micro" color={colors.textMuted}>
            Consumo
          </Texto>
          <Texto variante="caption" peso="medium">
            {consumo}
          </Texto>
        </View>
        <View style={estilos.dato}>
          <Texto variante="micro" color={colors.textMuted}>
            Estado
          </Texto>
          <Texto variante="caption" peso="medium">
            {etiquetaTipoEstado(lectura.tipoEstado)}
          </Texto>
        </View>
      </View>

      <View style={estilos.filaInferior}>
        <Texto variante="micro" color={colors.textSoft} style={estilos.fecha}>
          {formatearFechaHora(lectura.fechaRegistro)}
        </Texto>
        {lectura.fotoUri ? (
          <View style={estilos.indicador}>
            <Ionicons name="camera" size={13} color={colors.textMuted} />
            <Texto variante="micro" color={colors.textMuted}>
              Foto
            </Texto>
          </View>
        ) : null}
        {lectura.estadoVerificacion !== 'no_aplica' ? (
          <Texto variante="micro" color={estado.color} numberOfLines={1} style={estilos.verificacion}>
            {etiquetaEstadoVerificacion(lectura.estadoVerificacion)}
          </Texto>
        ) : null}
      </View>
    </TarjetaPresionable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: spacing.sm,
    borderLeftWidth: 5,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  codigoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  filaDatos: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  dato: {
    gap: 1,
    minWidth: 82,
  },
  filaInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(183,194,222,0.45)',
    paddingTop: spacing.xs,
  },
  fecha: {
    flexShrink: 0,
  },
  indicador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verificacion: {
    flex: 1,
    textAlign: 'right',
  },
});
