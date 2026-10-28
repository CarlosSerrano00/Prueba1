import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { clayShadowSoft, colors, radius, spacing } from '../../constants/ui';
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

function renderizarContenido(children: ReactNode, color: string): ReactNode[] {
  const contenido: ReactNode[] = [];
  let texto = '';

  function agregarTexto() {
    if (!texto) return;
    contenido.push(
      <Texto
        key={`texto-${contenido.length}`}
        variante="caption"
        color={color}
        style={estilos.texto}
      >
        {texto}
      </Texto>,
    );
    texto = '';
  }

  Children.toArray(children).forEach((child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      texto += child;
      return;
    }

    agregarTexto();
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      contenido.push(...renderizarContenido(child.props.children, color));
    } else if (child != null && typeof child !== 'boolean') {
      contenido.push(child);
    }
  });

  agregarTexto();
  return contenido;
}

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
          {renderizarContenido(children, paleta.color)}
          {accion ? <View style={estilos.accion}>{accion}</View> : null}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  alerta: {
    borderWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderLeftColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
    padding: spacing.md,
    ...clayShadowSoft,
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
