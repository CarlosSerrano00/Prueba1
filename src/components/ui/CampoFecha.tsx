import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts } from '../../constants/ui';
import { fechaLocalISO, normalizarFechaDia, parsearFecha } from '../../utils/fechas';
import { formatearFecha } from '../../utils/format';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface CampoFechaProps {
  etiqueta: string;
  valor: string | null;
  onChange: (valor: string | null) => void;
  min?: string;
  max?: string;
  requerida?: boolean;
  placeholder?: string;
  error?: string | null;
  ayuda?: string | null;
  permitirLimpiar?: boolean;
  testID?: string;
}

export function CampoFecha({
  etiqueta,
  valor,
  onChange,
  min,
  max,
  requerida = false,
  placeholder = 'Selecciona una fecha',
  error,
  ayuda,
  permitirLimpiar,
  testID,
}: CampoFechaProps) {
  const [mostrar, setMostrar] = useState(false);
  const [temporal, setTemporal] = useState<Date | null>(null);
  const tieneError = Boolean(error);
  const puedeLimpiar = permitirLimpiar ?? !requerida;
  const fechaValor = parsearFecha(valor);
  const fechaMin = parsearFecha(min);
  const fechaMax = parsearFecha(max);

  function abrir() {
    setTemporal(fechaValor ?? new Date());
    setMostrar(true);
  }

  function cerrar() {
    setMostrar(false);
    setTemporal(null);
  }

  function cambiar(evento: DateTimePickerEvent, fecha?: Date) {
    if (Platform.OS === 'android') {
      setMostrar(false);
      if (evento.type === 'set' && fecha) onChange(fechaLocalISO(fecha));
      return;
    }

    if (evento.type === 'set' && fecha) setTemporal(fecha);
  }

  function confirmarIos() {
    if (temporal) onChange(fechaLocalISO(temporal));
    cerrar();
  }

  if (Platform.OS === 'web') {
    return (
      <View className="gap-2">
        <Texto variante="etiqueta" color={colors.textMuted}>
          {etiqueta}
        </Texto>
        <View className="min-h-[52px] flex-row items-center gap-2 rounded-xl border border-white bg-slate-100 px-3" style={tieneError ? { borderColor: colors.danger, backgroundColor: '#FFF5F7' } : undefined}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <TextInput
            value={valor ?? ''}
            onChangeText={(texto) => {
              const limpio = texto.trim();
              if (limpio.length === 0) {
                onChange(null);
                return;
              }
              if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) {
                onChange(normalizarFechaDia(limpio) ?? limpio);
              } else {
                onChange(limpio);
              }
            }}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.textSoft}
            accessibilityLabel={etiqueta}
            testID={testID}
            maxLength={10}
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-[46px] flex-1 py-2 text-base text-slate-900"
            style={{ fontFamily: fonts.regular }}
          />
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

  return (
    <View className="gap-2">
      <Texto variante="etiqueta" color={colors.textMuted}>
        {etiqueta}
      </Texto>

      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}. ${valor ? formatearFecha(valor) : placeholder}`}
        testID={testID}
        className="min-h-[52px] flex-row items-center gap-2 rounded-xl border border-white bg-slate-100 px-3"
        style={({ pressed }) => [
          tieneError ? { borderColor: colors.danger, backgroundColor: '#FFF5F7' } : undefined,
          pressed ? { backgroundColor: colors.accentSoft } : undefined,
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={tieneError ? colors.danger : colors.accentDark}
        />
        <Texto
          variante="cuerpo"
          color={valor ? colors.text : colors.textSoft}
          className="flex-1"
          numberOfLines={1}
        >
          {valor ? formatearFecha(valor) : placeholder}
        </Texto>
        {valor && puedeLimpiar ? (
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={`Limpiar ${etiqueta}`}
            hitSlop={8}
            className="mr-[-4px] h-9 w-8 items-center justify-center"
          >
            <Ionicons name="close-circle" size={19} color={colors.textSoft} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={17} color={colors.textSoft} />
        )}
      </Pressable>

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

      {mostrar && Platform.OS === 'android' ? (
        <DateTimePicker
          value={fechaValor ?? new Date()}
          mode="date"
          display="calendar"
          minimumDate={fechaMin ?? undefined}
          maximumDate={fechaMax ?? undefined}
          onChange={cambiar}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={mostrar}
          transparent
          animationType="fade"
          onRequestClose={cerrar}
          statusBarTranslucent
        >
          <View className="flex-1 justify-center p-4" style={{ backgroundColor: colors.overlay }}>
            <View className="gap-3 rounded-[28px] border border-white bg-slate-50 p-4">
              <View className="flex-row items-center justify-between gap-3">
                <View>
                  <Texto variante="encabezado">Selecciona una fecha</Texto>
                  <Texto variante="caption" color={colors.textMuted}>
                    {etiqueta}
                  </Texto>
                </View>
                <View className="h-[46px] w-[46px] items-center justify-center rounded-xl bg-teal-100">
                  <Ionicons name="calendar" size={22} color={colors.accentDark} />
                </View>
              </View>

              <DateTimePicker
                value={temporal ?? fechaValor ?? new Date()}
                mode="date"
                display="spinner"
                minimumDate={fechaMin ?? undefined}
                maximumDate={fechaMax ?? undefined}
                onChange={cambiar}
                themeVariant="light"
              />

              <View className="flex-row gap-2">
                <Boton
                  titulo="Cancelar"
                  onPress={cerrar}
                  variante="fantasma"
                  anchoCompleto={false}
                  className="flex-1"
                />
                <Boton
                  titulo="Usar fecha"
                  onPress={confirmarIos}
                  icono="checkmark"
                  anchoCompleto={false}
                  className="flex-1"
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
