import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { colors } from '../../constants/ui';
import { Badge } from './Badge';
import { Texto } from './Texto';

interface FotoMedidorProps {
  uri: string | null;
  obligatoria: boolean;
  motivo: string;
  onTomar: () => void;
  onQuitar: () => void;
  cargando?: boolean;
  error?: string | null;
  deshabilitado?: boolean;
}

export function FotoMedidor({
  uri,
  obligatoria,
  motivo,
  onTomar,
  onQuitar,
  cargando = false,
  error,
  deshabilitado = false,
}: FotoMedidorProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="camera" size={19} color={colors.brand} />
          <Texto variante="cuerpoFuerte">Foto del medidor</Texto>
        </View>
        <Badge
          texto={obligatoria ? 'Obligatoria' : 'Opcional'}
          tono={obligatoria ? 'advertencia' : 'neutral'}
          icono={obligatoria ? 'alert-circle' : 'checkmark-circle-outline'}
        />
      </View>

      <Texto variante="caption" color={colors.textMuted}>
        {motivo}
      </Texto>

      {uri ? (
        <View className="h-[230px] overflow-hidden rounded-3xl border border-white bg-slate-100">
          <Image source={{ uri }} className="h-full w-full" contentFit="cover" transition={180} />
          <View className="absolute bottom-2 left-2 right-2 flex-row gap-2">
            <Pressable
              onPress={onTomar}
              disabled={cargando || deshabilitado}
              accessibilityRole="button"
              accessibilityLabel="Repetir la foto del medidor"
              className="min-h-[38px] flex-row items-center gap-1 rounded-full bg-slate-900/80 px-3"
              style={({ pressed }) => pressed ? { backgroundColor: colors.brand } : undefined}
            >
              <Ionicons name="camera-reverse-outline" size={17} color={colors.white} />
              <Texto variante="caption" peso="bold" color={colors.white}>
                Repetir
              </Texto>
            </Pressable>
            {!obligatoria ? (
              <Pressable
                onPress={onQuitar}
                disabled={cargando || deshabilitado}
                accessibilityRole="button"
                accessibilityLabel="Quitar la foto del medidor"
                className="min-h-[38px] flex-row items-center gap-1 rounded-full bg-slate-900/80 px-3"
                style={({ pressed }) => pressed ? { backgroundColor: colors.brand } : undefined}
              >
                <Ionicons name="trash-outline" size={17} color={colors.white} />
                <Texto variante="caption" peso="bold" color={colors.white}>
                  Quitar
                </Texto>
              </Pressable>
            ) : null}
          </View>
          {cargando ? (
            <View className="absolute inset-0 items-center justify-center bg-slate-900/45">
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={onTomar}
          disabled={cargando || deshabilitado}
          accessibilityRole="button"
          accessibilityLabel="Tomar foto del medidor"
          className="min-h-[188px] items-center justify-center gap-1 rounded-3xl border border-dashed border-slate-300 bg-slate-100 p-4 shadow-sm"
          style={({ pressed }) => pressed ? { backgroundColor: colors.accentSoft, borderColor: colors.accent } : undefined}
        >
          {cargando ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <View className="mb-1 h-[68px] w-[68px] items-center justify-center rounded-full border border-white bg-white shadow-sm">
                <Ionicons name="camera-outline" size={30} color={colors.accent} />
              </View>
              <Texto variante="cuerpoFuerte" color={colors.accentDark}>
                Tomar foto con la cámara
              </Texto>
              <Texto variante="caption" color={colors.textMuted} centrado>
                La imagen se guarda en el teléfono como respaldo de la lectura.
              </Texto>
            </>
          )}
        </Pressable>
      )}

      {error ? (
        <View className="flex-row items-start gap-1">
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Texto variante="caption" color={colors.danger} className="flex-1">
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
