import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '../../constants/ui';
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
  contador?: boolean;
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
  contador = true,
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
    <View className="gap-2" style={estilo}>
      <View className="flex-row items-center justify-between gap-2">
        <Texto variante="etiqueta" color={colors.textMuted}>
          {etiqueta}
        </Texto>
        {maxLength && contador ? (
          <Texto variante="micro" color={colors.textSoft}>
            {valor.length}/{maxLength}
          </Texto>
        ) : null}
      </View>

      <View
        className={`min-h-[52px] flex-row items-center rounded-2xl border px-3 ${
          enfocado ? 'border-teal-500 bg-teal-50' : 'clay-inset bg-[#E8EDF9]'
        } ${tieneError ? 'border-rose-500 bg-rose-50' : ''} ${
          !editable ? 'bg-[#E3E9F8]' : ''
        } ${multilinea ? 'items-start py-3' : ''}`}
      >
        {icono ? (
          <Ionicons
            name={icono}
            size={20}
            color={tieneError ? colors.danger : enfocado ? colors.accent : colors.textMuted}
            style={{ marginRight: 8, marginTop: 1 }}
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
          textAlignVertical={multilinea ? 'top' : 'center'}
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
          className={`min-h-12 flex-1 py-2 text-base text-aqua-text ${
            multilinea ? 'min-h-24' : ''
          }`}
        />

        {sufijo ? (
          <Texto variante="cuerpoFuerte" color={colors.textMuted} className="ml-2">
            {sufijo}
          </Texto>
        ) : null}

        {seguro ? (
          <Pressable
            onPress={() => setVerClave((actual) => !actual)}
            accessibilityRole="button"
            accessibilityLabel={verClave ? 'Ocultar clave' : 'Mostrar clave'}
            hitSlop={8}
            className="mr-[-8px] h-10 w-10 items-center justify-center"
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
        <View className="flex-row items-start gap-1">
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <Texto variante="caption" color={colors.danger} className="flex-1">
            {error}
          </Texto>
        </View>
      ) : ayuda ? (
        <Texto variante="caption" color={colors.textMuted} className="px-0.5">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}
