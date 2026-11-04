import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
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
  { color: string; icono: keyof typeof Ionicons.glyphMap; clases: string }
> = {
  info: {
    color: colors.info,
    icono: 'information-circle',
    clases: 'border-sky-200 bg-sky-50',
  },
  exito: {
    color: colors.success,
    icono: 'checkmark-circle',
    clases: 'border-emerald-200 bg-emerald-50',
  },
  advertencia: {
    color: colors.warning,
    icono: 'warning',
    clases: 'border-amber-200 bg-amber-50',
  },
  peligro: {
    color: colors.danger,
    icono: 'alert-circle',
    clases: 'border-rose-200 bg-rose-50',
  },
  borrador: {
    color: colors.draft,
    icono: 'document-text',
    clases: 'border-violet-200 bg-violet-50',
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
        className="leading-5"
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
    <View className={`rounded-2xl border p-3 shadow-sm ${paleta.clases}`}>
      <View className="flex-row items-start gap-2">
        <Ionicons name={icono ?? paleta.icono} size={21} color={paleta.color} style={{ marginTop: 1 }} />
        <View className="flex-1 gap-1">
          {titulo ? (
            <Texto variante="cuerpoFuerte" color={paleta.color}>
              {titulo}
            </Texto>
          ) : null}
          {renderizarContenido(children, paleta.color)}
          {accion ? <View className="mt-2">{accion}</View> : null}
        </View>
      </View>
    </View>
  );
}
