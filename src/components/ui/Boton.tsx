import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { clayBorder, clayShadowSoft, colors, minTouch, radius, spacing } from '../../constants/ui';
import { Texto } from './Texto';

type Icono = keyof typeof Ionicons.glyphMap;
type Variante = 'primario' | 'acento' | 'secundario' | 'fantasma' | 'peligro' | 'exito';

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: Icono;
  iconoDerecha?: Icono;
  cargando?: boolean;
  deshabilitado?: boolean;
  anchoCompleto?: boolean;
  estilo?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const paletas: Record<
  Variante,
  { fondo: string; borde: string; texto: string; ripple: string }
> = {
  primario: {
    fondo: colors.brand,
    borde: colors.brand,
    texto: colors.textOnBrand,
    ripple: 'rgba(255,255,255,0.18)',
  },
  acento: {
    fondo: colors.accent,
    borde: colors.accent,
    texto: colors.white,
    ripple: 'rgba(255,255,255,0.2)',
  },
  secundario: {
    fondo: colors.surface,
    borde: colors.white,
    texto: colors.brand,
    ripple: colors.surfaceAlt,
  },
  fantasma: {
    fondo: 'transparent',
    borde: 'transparent',
    texto: colors.accentDark,
    ripple: colors.accentSoft,
  },
  peligro: {
    fondo: colors.dangerSoft,
    borde: '#F3B8B2',
    texto: colors.danger,
    ripple: '#F9CFCB',
  },
  exito: {
    fondo: colors.success,
    borde: colors.success,
    texto: colors.white,
    ripple: 'rgba(255,255,255,0.2)',
  },
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  iconoDerecha,
  cargando = false,
  deshabilitado = false,
  anchoCompleto = true,
  estilo,
  accessibilityLabel,
  testID,
}: BotonProps) {
  const paleta = paletas[variante];
  const inactivo = deshabilitado || cargando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      testID={testID}
      android_ripple={{ color: paleta.ripple }}
      style={({ pressed }) => [
        estilos.base,
        variante === 'fantasma' && estilos.fantasma,
        {
          backgroundColor: inactivo ? colors.disabled : paleta.fondo,
          borderColor: inactivo ? colors.disabled : paleta.borde,
          opacity: pressed && !inactivo ? 0.9 : 1,
          transform: [{ scale: pressed && !inactivo ? 0.97 : 1 }],
        },
        anchoCompleto ? estilos.completo : estilos.ajustado,
        estilo,
      ]}
    >
      <View pointerEvents="none" style={estilos.brillo} />
      <View style={estilos.contenido}>
        {cargando ? (
          <ActivityIndicator
            size="small"
            color={variante === 'secundario' || variante === 'fantasma' ? colors.brand : colors.white}
          />
        ) : (
          <>
            {icono ? (
              <Ionicons name={icono} size={20} color={paleta.texto} style={estilos.icono} />
            ) : null}
            <Texto variante="cuerpoFuerte" color={paleta.texto} style={estilos.titulo}>
              {titulo}
            </Texto>
            {iconoDerecha ? (
              <Ionicons name={iconoDerecha} size={20} color={paleta.texto} style={estilos.icono} />
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: minTouch,
    borderRadius: radius.lg,
    ...clayBorder,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    overflow: 'hidden',
    ...clayShadowSoft,
  },
  fantasma: {
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  brillo: {
    position: 'absolute',
    top: 2,
    left: 10,
    right: 10,
    height: '38%',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  completo: {
    alignSelf: 'stretch',
  },
  ajustado: {
    alignSelf: 'flex-start',
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icono: {
    marginTop: -1,
  },
  titulo: {
    flexShrink: 1,
  },
});
