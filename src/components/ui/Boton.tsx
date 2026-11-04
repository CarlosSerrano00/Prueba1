import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { colors } from '../../constants/ui';
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
  className?: string;
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
  className,
  accessibilityLabel,
  testID,
}: BotonProps) {
  const paleta = paletas[variante];
  const inactivo = deshabilitado || cargando;
  const reducirMovimiento = useReducedMotion();
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  return (
    <Animated.View style={estiloAnimado}>
      <Pressable
        onPress={onPress}
        disabled={inactivo}
        onPressIn={() => animarEscala(escala, inactivo || reducirMovimiento ? 1 : 0.97, !reducirMovimiento)}
        onPressOut={() => animarEscala(escala, 1, !reducirMovimiento)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? titulo}
        accessibilityState={{ disabled: inactivo, busy: cargando }}
        testID={testID}
        android_ripple={{ color: paleta.ripple }}
        className={`clay-raised min-h-12 justify-center overflow-hidden rounded-[20px] border px-4 shadow-md ${
          variante === 'fantasma' ? 'self-start border-0 shadow-none' : ''
        } ${anchoCompleto ? 'self-stretch' : 'self-start'} ${inactivo ? 'opacity-55' : ''} ${className ?? ''}`}
        style={[{ backgroundColor: inactivo ? colors.disabled : paleta.fondo }, estilo]}
      >
        <View pointerEvents="none" className="absolute left-2.5 right-2.5 top-0.5 h-[38%] rounded-full bg-white/10" />
        <View className="flex-row items-center justify-center gap-2">
          {cargando ? (
            <ActivityIndicator
              size="small"
              color={variante === 'secundario' || variante === 'fantasma' ? colors.brand : colors.white}
            />
          ) : (
            <>
              {icono ? <Ionicons name={icono} size={20} color={paleta.texto} style={{ marginTop: -1 }} /> : null}
              <Texto variante="cuerpoFuerte" color={paleta.texto} className="shrink">
                {titulo}
              </Texto>
              {iconoDerecha ? <Ionicons name={iconoDerecha} size={20} color={paleta.texto} style={{ marginTop: -1 }} /> : null}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function animarEscala(escala: SharedValue<number>, valor: number, animar: boolean) {
  escala.value = animar ? withSpring(valor) : valor;
}
