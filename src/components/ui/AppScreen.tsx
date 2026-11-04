import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '../../constants/ui';
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
      className="flex-1"
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
      <View
        className="mx-auto w-full max-w-[760px] gap-4 px-4 pb-[118px] pt-3"
        style={contentContainerStyle}
      >
        {children}
      </View>
    </ScrollView>
  ) : (
    <View className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-[110px] pt-3" style={contentContainerStyle}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className="flex-1 overflow-hidden bg-aqua-background" style={style}>
      <View pointerEvents="none" className="absolute inset-0">
        <View className="absolute -right-[100px] -top-[90px] h-[250px] w-[250px] rounded-full bg-[#D9D7FF] opacity-65" />
        <View className="absolute left-[-95px] top-[340px] h-[190px] w-[190px] rounded-full bg-[#C9F5EA] opacity-65" />
        <View className="absolute -bottom-[80px] -right-[80px] h-[160px] w-[160px] rounded-full bg-[#FFE0D4] opacity-65" />
      </View>
      {mostrarConexion ? <ConnectionStrip /> : null}
      {evitarTeclado ? (
        <KeyboardAvoidingView
          className="flex-1"
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
