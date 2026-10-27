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

import { colors, spacing } from '../../constants/ui';
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
  },
  flex: {
    flex: 1,
  },
  contenido: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  contenidoSinScroll: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
