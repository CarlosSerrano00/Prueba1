import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
import { Texto } from './Texto';

type TonoAlerta = 'info' | 'exito' | 'advertencia' | 'peligro' | 'borrador';

interface AlertaProps {
  titulo?: string;
  children: ReactNode;
  tono?: TonoAlerta;
  icono?: keyof typeof Ionicons.glyphMap;
  accion?: ReactNode;
}

const paletas: Record<
  TonoAlerta,
  { fondo: string; borde: string; color: string; icono: keyof typeof Ionicons.glyphMap }
> = {
  info: {
    fondo: colors.infoSoft,
    borde: '#BAE6FD',
    color: colors.info,
    icono: 'information-circle',
  },
  exito: {
    fondo: colors.successSoft,
    borde: '#BBF7D0',
    color: colors.success,
    icono: 'checkmark-circle',
  },
  advertencia: {
    fondo: colors.warningSoft,
    borde: '#FDE68A',
    color: colors.warning,
    icono: 'warning',
  },
  peligro: {
    fondo: colors.dangerSoft,
    borde: '#FECACA',
    color: colors.danger,
    icono: 'alert-circle',
  },
  borrador: {
    fondo: colors.draftSoft,
    borde: '#DDD6FE',
    color: colors.draft,
    icono: 'document-text',
  },
};

export function Alerta({
  titulo,
  children,
  tono = 'info',
  icono,
  accion,
}: AlertaProps) {
  const paleta = paletas[tono];
  return (
    <View style={[estilos.alerta, { backgroundColor: paleta.fondo, borderColor: paleta.borde }]}>
      <View style={estilos.fila}>
        <Ionicons name={icono ?? paleta.icono} size={21} color={paleta.color} style={estilos.icono} />
        <View style={estilos.contenido}>
          {titulo ? (
            <Texto variante="cuerpoFuerte" color={paleta.color}>
              {titulo}
            </Texto>
          ) : null}
          {typeof children === 'string' ? (
            <Texto variante="caption" color={paleta.color} style={estilos.texto}>
              {children}
            </Texto>
          ) : (
            children
          )}
          {accion ? <View style={estilos.accion}>{accion}</View> : null}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  alerta: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icono: {
    marginTop: 1,
  },
  contenido: {
    flex: 1,
    gap: 3,
  },
  texto: {
    lineHeight: 20,
  },
  accion: {
    marginTop: spacing.sm,
  },
});
