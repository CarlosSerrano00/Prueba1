import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  colors,
} from '../../constants/ui';
import { EstadoAnimado } from './EstadoAnimado';
import { Texto } from './Texto';

interface CardProps {
  children: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  className?: string;
}

export function Card({ children, estilo, className }: CardProps) {
  return (
    <View className={`clay-raised rounded-[26px] bg-aqua-surface p-4 shadow-md ${className ?? ''}`} style={estilo}>
      {children}
    </View>
  );
}

interface TarjetaPresionableProps extends CardProps {
  onPress: () => void;
  accessibilityLabel: string;
  deshabilitada?: boolean;
}

export function TarjetaPresionable({
  children,
  estilo,
  className,
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
      className={`clay-raised rounded-[26px] bg-aqua-surface p-4 shadow-md ${deshabilitada ? 'opacity-55' : ''} ${className ?? ''}`}
      style={({ pressed }) => [
        estilo,
        pressed && !deshabilitada ? { opacity: 0.92, transform: [{ scale: 0.985 }] } : null,
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
  animacion?: 'ubicacion';
}

export function SectionTitle({ titulo, descripcion, accion, animacion }: SectionTitleProps) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Texto variante="encabezado" className="flex-1">
            {titulo}
          </Texto>
          {animacion ? <EstadoAnimado tipo={animacion} tamano={38} /> : null}
        </View>
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
    <View className="min-h-[104px] flex-1 justify-center gap-0.5 rounded-3xl border border-white p-3 shadow-sm" style={{ backgroundColor: fondo }}>
      <Ionicons name={icono} size={18} color={color} />
      <Texto variante="titulo" color={color} className="mt-0.5 text-[26px] leading-[31px]">
        {valor}
      </Texto>
      <Texto variante="micro" color={color} peso="medium" className="leading-[14px]">
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
    <View className="flex-row items-start justify-between gap-4 py-2">
      <View className="flex-shrink flex-row items-center gap-1">
        {icono ? <Ionicons name={icono} size={15} color={colors.textSoft} /> : null}
        <Texto variante="caption" color={colors.textMuted}>
          {etiqueta}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte" color={color} className="shrink text-right">
        {valor}
      </Texto>
    </View>
  );
}
