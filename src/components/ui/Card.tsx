import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cardShadow, colors, radius, spacing } from '../../constants/ui';
import { Texto } from './Texto';

interface CardProps {
  children: ReactNode;
  estilo?: StyleProp<ViewStyle>;
}

export function Card({ children, estilo }: CardProps) {
  return <View style={[estilos.card, estilo]}>{children}</View>;
}

interface TarjetaPresionableProps extends CardProps {
  onPress: () => void;
  accessibilityLabel: string;
  deshabilitada?: boolean;
}

export function TarjetaPresionable({
  children,
  estilo,
  onPress,
  accessibilityLabel,
  deshabilitada = false,
}: TarjetaPresionableProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [
        estilos.card,
        estilo,
        pressed && !deshabilitada ? estilos.presionada : null,
        deshabilitada ? estilos.deshabilitada : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

interface SectionTitleProps {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}

export function SectionTitle({ titulo, descripcion, accion }: SectionTitleProps) {
  return (
    <View style={estilos.sectionTitle}>
      <View style={estilos.sectionTitleTextos}>
        <Texto variante="encabezado">{titulo}</Texto>
        {descripcion ? (
          <Texto variante="caption" color={colors.textMuted}>
            {descripcion}
          </Texto>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

interface StatCardProps {
  valor: number | string;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  fondo: string;
}

export function StatCard({ valor, etiqueta, icono, color, fondo }: StatCardProps) {
  return (
    <View style={[estilos.stat, { backgroundColor: fondo }]}>
      <Ionicons name={icono} size={18} color={color} />
      <Texto variante="titulo" color={color} style={estilos.statValor}>
        {valor}
      </Texto>
      <Texto variante="micro" color={color} peso="medium" style={estilos.statEtiqueta}>
        {etiqueta}
      </Texto>
    </View>
  );
}

interface InfoRowProps {
  etiqueta: string;
  valor: string;
  color?: string;
  icono?: keyof typeof Ionicons.glyphMap;
}

export function InfoRow({ etiqueta, valor, color = colors.text, icono }: InfoRowProps) {
  return (
    <View style={estilos.infoRow}>
      <View style={estilos.infoEtiqueta}>
        {icono ? <Ionicons name={icono} size={15} color={colors.textSoft} /> : null}
        <Texto variante="caption" color={colors.textMuted}>
          {etiqueta}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte" color={color} style={estilos.infoValor}>
        {valor}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...cardShadow,
  },
  presionada: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  deshabilitada: {
    opacity: 0.55,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitleTextos: {
    flex: 1,
    gap: 2,
  },
  stat: {
    flex: 1,
    minHeight: 100,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
    justifyContent: 'center',
  },
  statValor: {
    fontSize: 26,
    lineHeight: 31,
    marginTop: 2,
  },
  statEtiqueta: {
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  infoEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  infoValor: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
