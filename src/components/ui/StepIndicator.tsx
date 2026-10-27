import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
import type { PasoRegistro } from '../../types/models';
import { Texto } from './Texto';

interface StepIndicatorProps {
  paso: PasoRegistro;
  pasos?: readonly { numero: PasoRegistro; etiqueta: string }[];
}

const PASOS_POR_DEFECTO = [
  { numero: 1 as const, etiqueta: 'Datos' },
  { numero: 2 as const, etiqueta: 'Foto' },
  { numero: 3 as const, etiqueta: 'Resumen' },
];

export function StepIndicator({ paso, pasos = PASOS_POR_DEFECTO }: StepIndicatorProps) {
  return (
    <View style={estilos.fila}>
      {pasos.map((item, indice) => {
        const completado = paso > item.numero;
        const actual = paso === item.numero;
        return (
          <View key={item.numero} style={estilos.pasoContenedor}>
            <View style={estilos.pasoFila}>
              <View
                style={[
                  estilos.circulo,
                  completado && estilos.circuloCompletado,
                  actual && estilos.circuloActual,
                ]}
              >
                {completado ? (
                  <Ionicons name="checkmark" size={15} color={colors.white} />
                ) : (
                  <Texto
                    variante="micro"
                    peso="bold"
                    color={actual ? colors.white : colors.textMuted}
                  >
                    {item.numero}
                  </Texto>
                )}
              </View>
              {indice < pasos.length - 1 ? (
                <View style={[estilos.linea, completado && estilos.lineaCompletada]} />
              ) : null}
            </View>
            <Texto
              variante="micro"
              peso={actual ? 'bold' : 'medium'}
              color={actual ? colors.accentDark : colors.textMuted}
            >
              {item.etiqueta}
            </Texto>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  pasoContenedor: {
    flex: 1,
    gap: 5,
  },
  pasoFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circulo: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloActual: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  circuloCompletado: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  linea: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  lineaCompletada: {
    backgroundColor: colors.success,
  },
});
