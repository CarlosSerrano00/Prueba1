import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
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
    <View className="flex-row items-start gap-1">
      {pasos.map((item, indice) => {
        const completado = paso > item.numero;
        const actual = paso === item.numero;
        return (
          <View key={item.numero} className="flex-1 gap-1">
            <View className="flex-row items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full border border-white shadow-sm ${
                  completado ? 'bg-emerald-700' : actual ? 'bg-aqua-accent' : 'bg-aqua-surface'
                }`}
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
                <View className={`mx-1 h-1 flex-1 rounded-full ${completado ? 'bg-emerald-700' : 'bg-slate-200'}`} />
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
