import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, minTouch, radius, spacing } from '../../constants/ui';
import { Texto } from './Texto';

type Icono = keyof typeof Ionicons.glyphMap;

interface CampoTextoProps {
  etiqueta: string;
  valor: string;
  onChangeText: (valor: string) => void;
  placeholder?: string;
  error?: string | null;
  ayuda?: string | null;
  icono?: Icono;
  sufijo?: string;
  seguro?: boolean;
  multilinea?: boolean;
  numeroLineas?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  editable?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  autoComplete?: 'off' | 'username' | 'password';
  estilo?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CampoTexto({
  etiqueta,
  valor,
  onChangeText,
  placeholder,
  error,
  ayuda,
  icono,
  sufijo,
  seguro = false,
  multilinea = false,
  numeroLineas = 4,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
  maxLength,
  editable = true,
  onBlur,
  onFocus,
  autoComplete,
  estilo,
  testID,
}: CampoTextoProps) {
  const [enfocado, setEnfocado] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const tieneError = Boolean(error);

  return (
    <View style={[estilos.contenedor, estilo]}>
      <Texto variante="etiqueta" color={colors.textMuted}>
        {etiqueta}
      </Texto>

      <View
        style={[
          estilos.caja,
          enfocado && estilos.cajaEnfocada,
          tieneError && estilos.cajaError,
          !editable && estilos.cajaInactiva,
          multilinea && estilos.cajaMultilinea,
        ]}
      >
        {icono ? (
          <Ionicons
            name={icono}
            size={20}
            color={tieneError ? colors.danger : enfocado ? colors.accent : colors.textMuted}
            style={estilos.icono}
          />
        ) : null}

        <TextInput
          value={valor}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSoft}
          secureTextEntry={seguro && !verClave}
          multiline={multilinea}
          numberOfLines={multilinea ? numeroLineas : 1}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          editable={editable}
          autoComplete={autoComplete}
          onFocus={() => {
            setEnfocado(true);
            onFocus?.();
          }}
          onBlur={() => {
            setEnfocado(false);
            onBlur?.();
          }}
          accessibilityLabel={etiqueta}
          testID={testID}
          style={[estilos.input, multilinea && estilos.inputMultilinea]}
        />

        {sufijo ? (
          <Texto variante="cuerpoFuerte" color={colors.textMuted} style={estilos.sufijo}>
            {sufijo}
          </Texto>
        ) : null}

        {seguro ? (
          <Pressable
            onPress={() => setVerClave((actual) => !actual)}
            accessibilityRole="button"
            accessibilityLabel={verClave ? 'Ocultar clave' : 'Mostrar clave'}
            hitSlop={8}
            style={estilos.botonOjo}
          >
            <Ionicons
              name={verClave ? 'eye-off-outline' : 'eye-outline'}
              size={21}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={estilos.mensaje}>
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <Texto variante="caption" color={colors.danger} style={estilos.textoMensaje}>
            {error}
          </Texto>
        </View>
      ) : ayuda ? (
        <Texto variante="caption" color={colors.textMuted} style={estilos.ayuda}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  caja: {
    minHeight: minTouch + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  cajaEnfocada: {
    borderColor: colors.accent,
    backgroundColor: colors.white,
  },
  cajaError: {
    borderColor: colors.danger,
    backgroundColor: '#FFFCFC',
  },
  cajaInactiva: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  cajaMultilinea: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  icono: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  inputMultilinea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  sufijo: {
    marginLeft: spacing.sm,
  },
  botonOjo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  mensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  textoMensaje: {
    flex: 1,
  },
  ayuda: {
    paddingHorizontal: 2,
  },
});
