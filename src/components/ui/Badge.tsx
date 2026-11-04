import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors } from '../../constants/ui';
import { Texto } from './Texto';

export type TonoBadge =
  | 'exito'
  | 'advertencia'
  | 'peligro'
  | 'info'
  | 'borrador'
  | 'neutral'
  | 'marca';

interface BadgeProps {
  texto: string;
  tono?: TonoBadge;
  icono?: keyof typeof Ionicons.glyphMap;
}

const paletas: Record<TonoBadge, { texto: string; clases: string }> = {
  exito: { texto: colors.success, clases: 'bg-emerald-100 border-emerald-200' },
  advertencia: { texto: colors.warning, clases: 'bg-amber-100 border-amber-200' },
  peligro: { texto: colors.danger, clases: 'bg-rose-100 border-rose-200' },
  info: { texto: colors.info, clases: 'bg-sky-100 border-sky-200' },
  borrador: { texto: colors.draft, clases: 'bg-violet-100 border-violet-200' },
  neutral: { texto: colors.textMuted, clases: 'bg-slate-100 border-white' },
  marca: { texto: colors.brand, clases: 'bg-indigo-100 border-white' },
};

export function Badge({ texto, tono = 'neutral', icono }: BadgeProps) {
  const paleta = paletas[tono];
  return (
    <View className={`flex-row items-center self-start gap-1 rounded-full border px-[9px] py-1 ${paleta.clases}`}>
      {icono ? <Ionicons name={icono} size={13} color={paleta.texto} /> : null}
      <Texto variante="micro" peso="bold" color={paleta.texto} className="tracking-[0.2px]">
        {texto}
      </Texto>
    </View>
  );
}
