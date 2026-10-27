import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../constants/ui';
import { ConnectionStrip } from './ConnectionStrip';

interface AppScreenProps {
  children: ReactNode;
  scroll?: boolean;
  mostrarConexion?: boolean;
  refrescando?: boolean;
  onRefresh?: () => void;
  evitarTeclado?: boolean;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function AppScreen({
  children,
  scroll = true,
  mostrarConexion = true,
  refrescando = false,
  onRefresh,
  evitarTeclado = false,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  style,
}: AppScreenProps) {
  const contenido = scroll ? (
    <ScrollView
      contentContainerStyle={[estilos.contenido, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[estilos.contenidoSinScroll, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[estilos.pantalla, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[estilos.blob, estilos.blobLavanda]} />
        <View style={[estilos.blob, estilos.blobMenta]} />
        <View style={[estilos.blob, estilos.blobDurazno]} />
      </View>
      {mostrarConexion ? <ConnectionStrip /> : null}
      {evitarTeclado ? (
        <KeyboardAvoidingView
          style={estilos.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {contenido}
        </KeyboardAvoidingView>
      ) : (
        contenido
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  contenido: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 118,
    gap: spacing.lg,
  },
  contenidoSinScroll: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
  blob: {
    position: 'absolute',
    borderRadius: radius.pill,
    opacity: 0.65,
  },
  blobLavanda: {
    width: 250,
    height: 250,
    right: -100,
    top: -90,
    backgroundColor: colors.blobLavender,
  },
  blobMenta: {
    width: 190,
    height: 190,
    left: -95,
    top: 340,
    backgroundColor: colors.blobMint,
  },
  blobDurazno: {
    width: 160,
    height: 160,
    right: -80,
    bottom: 80,
    backgroundColor: colors.blobPeach,
  },
});
