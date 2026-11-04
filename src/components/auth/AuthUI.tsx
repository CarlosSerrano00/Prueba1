import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { evaluarFortalezaClave } from '@/lib/fortaleza-clave';

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-aqua-background"
      keyboardShouldPersistTaps="handled"
    >
      <View className="relative flex-grow justify-center overflow-hidden px-6 py-10">
        <View pointerEvents="none" className="absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[#D9D7FF] opacity-70" />
        <View pointerEvents="none" className="absolute -left-20 top-[360px] h-48 w-48 rounded-full bg-[#C9F5EA] opacity-70" />
        <View pointerEvents="none" className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#FFE0D4] opacity-70" />
        <View className="mx-auto w-full max-w-xl">{children}</View>
      </View>
    </ScrollView>
  );
}

export function AuthHeading({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  const reducirMovimiento = useReducedMotion();
  return (
    <Animated.View
      entering={reducirMovimiento ? undefined : FadeInDown.duration(350).reduceMotion(ReduceMotion.System)}
      className="mb-7 gap-2"
    >
      <Text className="text-sm font-bold uppercase tracking-widest text-aqua-brand">AquaRuta</Text>
      <Text className="text-3xl font-bold text-aqua-text">{title}</Text>
      <Text className="text-base leading-6 text-aqua-text-muted">{subtitle}</Text>
    </Animated.View>
  );
}

export function AuthField({
  autoCapitalize = 'none',
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  value,
  secure = false,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
  secure?: boolean;
}) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-aqua-text-muted">{label}</Text>
      <View className="clay-inset min-h-14 flex-row items-center rounded-[20px] bg-[#E8EDF9] px-4 shadow-inner">
        <TextInput
          className="min-h-14 flex-1 py-3 text-base text-aqua-text"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8B93AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure && !mostrar}
          autoComplete={secure ? 'password' : keyboardType === 'email-address' ? 'email' : 'off'}
          accessibilityLabel={label}
        />
        {secure ? (
          <Pressable
            onPress={() => setMostrar((actual) => !actual)}
            accessibilityRole="button"
            accessibilityLabel={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name={mostrar ? 'eye-off-outline' : 'eye-outline'} size={21} color="#5E6687" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const escala = useSharedValue(1);
  const reducirMovimiento = useReducedMotion();
  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));
  const inactivo = loading || disabled;
  return (
    <Animated.View style={estiloAnimado}>
      <Pressable
        onPress={onPress}
        disabled={inactivo}
        onPressIn={() => {
          animarEscala(escala, reducirMovimiento ? 1 : 0.98);
        }}
        onPressOut={() => {
          animarEscala(escala, 1);
        }}
        className={`clay-raised min-h-14 items-center justify-center rounded-[20px] border px-5 shadow-md ${
          secondary ? 'bg-aqua-surface' : 'bg-aqua-brand'
        } ${inactivo ? 'opacity-55' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactivo, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={secondary ? '#1e40af' : '#ffffff'} />
        ) : (
          <Text className={`text-base font-bold ${secondary ? 'text-aqua-brand' : 'text-white'}`}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function animarEscala(escala: SharedValue<number>, valor: number) {
  escala.value = withSpring(valor);
}

export function AuthNotice({ children, success = false }: { children: string; success?: boolean }) {
  const reducirMovimiento = useReducedMotion();
  return (
    <Animated.View
      entering={reducirMovimiento ? undefined : FadeInDown.duration(220)}
      exiting={reducirMovimiento ? undefined : FadeOutUp.duration(180)}
      className={`clay-raised rounded-[20px] border px-4 py-3 shadow-sm ${
        success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
      }`}
      accessibilityRole="alert"
    >
      <Text className={success ? 'text-emerald-800' : 'text-rose-800'}>{children}</Text>
    </Animated.View>
  );
}

function FortitudeSegment({
  active,
  color,
}: {
  active: boolean;
  color: string;
}) {
  const progreso = useSharedValue(active ? 1 : 0.35);
  const reducirMovimiento = useReducedMotion();
  useEffect(() => {
    progreso.value = reducirMovimiento ? (active ? 1 : 0.35) : withTiming(active ? 1 : 0.35, { duration: 220 });
  }, [active, progreso, reducirMovimiento]);
  const estilo = useAnimatedStyle(() => ({
    opacity: reducirMovimiento ? (active ? 1 : 0.38) : withTiming(active ? 1 : 0.38, { duration: 220 }),
    transform: [{ scaleX: progreso.value }],
  }));
  return (
    <Animated.View
      className={`h-2 flex-1 rounded-full ${active ? color : 'bg-slate-200'}`}
      style={estilo}
    />
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const reducirMovimiento = useReducedMotion();
  if (!password) return null;
  const evaluacion = evaluarFortalezaClave(password);
  if (!evaluacion) return null;
  const puntuacion = evaluacion.puntuacion;
  const nivel = puntuacion === 3 ? 'Fuerte' : puntuacion === 2 ? 'Media' : 'Débil';
  const color =
    puntuacion === 3 ? 'bg-emerald-500' : puntuacion === 2 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <Animated.View
      entering={reducirMovimiento ? undefined : FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
      className="gap-2"
      accessibilityLabel={`Seguridad de la contraseña: ${nivel}`}
    >
      <Text className="text-sm font-medium text-aqua-text-muted">Seguridad de la contraseña</Text>
      <View className="flex-row gap-2">
        {[1, 2, 3].map((segmento) => (
          <FortitudeSegment
            key={segmento}
            active={puntuacion >= segmento}
            color={color}
          />
        ))}
      </View>
      <Text className="text-sm text-aqua-text-muted">{nivel}</Text>
    </Animated.View>
  );
}

export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="min-h-11 items-center justify-center px-3">
      <Text className="text-center font-semibold text-aqua-accent-dark">{label}</Text>
    </Pressable>
  );
}
