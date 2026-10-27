import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { clayBorder, clayShadowSoft, colors, radius, spacing } from '../../constants/ui';
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
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <View style={estilos.tituloFila}>
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
        <View style={estilos.marcoFoto}>
          <Image source={{ uri }} style={estilos.foto} contentFit="cover" transition={180} />
          <View style={estilos.accionesFoto}>
            <Pressable
              onPress={onTomar}
              disabled={cargando || deshabilitado}
              accessibilityRole="button"
              accessibilityLabel="Repetir la foto del medidor"
              style={({ pressed }) => [estilos.accion, pressed && estilos.accionPresionada]}
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
                style={({ pressed }) => [estilos.accion, pressed && estilos.accionPresionada]}
              >
                <Ionicons name="trash-outline" size={17} color={colors.white} />
                <Texto variante="caption" peso="bold" color={colors.white}>
                  Quitar
                </Texto>
              </Pressable>
            ) : null}
          </View>
          {cargando ? (
            <View style={estilos.velo}>
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
          style={({ pressed }) => [estilos.marcoVacio, pressed && estilos.marcoPresionado]}
        >
          {cargando ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <View style={estilos.camaraCirculo}>
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
        <View style={estilos.error}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Texto variante="caption" color={colors.danger} style={estilos.textoError}>
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  marcoFoto: {
    height: 230,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    ...clayBorder,
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  accionesFoto: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7, 59, 76, 0.82)',
  },
  accionPresionada: {
    backgroundColor: colors.brand,
  },
  velo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(7, 59, 76, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcoVacio: {
    minHeight: 188,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: 5,
    ...clayShadowSoft,
  },
  marcoPresionado: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  camaraCirculo: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...clayShadowSoft,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  textoError: {
    flex: 1,
  },
});
