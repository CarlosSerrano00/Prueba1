import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/ui';
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

const paletas: Record<TonoBadge, { fondo: string; texto: string; borde: string }> = {
  exito: { fondo: colors.successSoft, texto: colors.success, borde: '#BBF7D0' },
  advertencia: { fondo: colors.warningSoft, texto: colors.warning, borde: '#FDE68A' },
  peligro: { fondo: colors.dangerSoft, texto: colors.danger, borde: '#FECACA' },
  info: { fondo: colors.infoSoft, texto: colors.info, borde: '#BAE6FD' },
  borrador: { fondo: colors.draftSoft, texto: colors.draft, borde: '#DDD6FE' },
  neutral: { fondo: colors.surfaceAlt, texto: colors.textMuted, borde: colors.border },
  marca: { fondo: colors.surfaceBrand, texto: colors.brand, borde: '#B9DDE9' },
};

export function Badge({ texto, tono = 'neutral', icono }: BadgeProps) {
  const paleta = paletas[tono];
  return (
    <View style={[estilos.badge, { backgroundColor: paleta.fondo, borderColor: paleta.borde }]}>
      {icono ? <Ionicons name={icono} size={13} color={paleta.texto} /> : null}
      <Texto variante="micro" peso="bold" color={paleta.texto} style={estilos.texto}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  texto: {
    letterSpacing: 0.2,
  },
});
