import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { clayInset, colors, fonts, minTouch, radius, spacing } from '../../constants/ui';
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
      <View style={estilos.contenedor}>
        <Texto variante="etiqueta" color={colors.textMuted}>
          {etiqueta}
        </Texto>
        <View style={[estilos.caja, tieneError && estilos.cajaError]}>
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
            style={estilos.input}
          />
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

  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" color={colors.textMuted}>
        {etiqueta}
      </Texto>

      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}. ${valor ? formatearFecha(valor) : placeholder}`}
        testID={testID}
        style={({ pressed }) => [
          estilos.caja,
          tieneError && estilos.cajaError,
          pressed && estilos.cajaPresionada,
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
          style={estilos.valor}
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
            style={estilos.botonLimpiar}
          >
            <Ionicons name="close-circle" size={19} color={colors.textSoft} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={17} color={colors.textSoft} />
        )}
      </Pressable>

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
          <View style={estilos.fondoModal}>
            <View style={estilos.panelModal}>
              <View style={estilos.cabeceraModal}>
                <View>
                  <Texto variante="encabezado">Selecciona una fecha</Texto>
                  <Texto variante="caption" color={colors.textMuted}>
                    {etiqueta}
                  </Texto>
                </View>
                <View style={estilos.iconoModal}>
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

              <View style={estilos.accionesModal}>
                <Boton
                  titulo="Cancelar"
                  onPress={cerrar}
                  variante="fantasma"
                  anchoCompleto={false}
                  estilo={estilos.botonModal}
                />
                <Boton
                  titulo="Usar fecha"
                  onPress={confirmarIos}
                  icono="checkmark"
                  anchoCompleto={false}
                  estilo={estilos.botonModal}
                />
              </View>
            </View>
          </View>
        </Modal>
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
    ...clayInset,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cajaPresionada: {
    backgroundColor: colors.accentSoft,
  },
  cajaError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF5F7',
  },
  valor: {
    flex: 1,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  botonLimpiar: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
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
  fondoModal: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panelModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cabeceraModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  iconoModal: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionesModal: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonModal: {
    flex: 1,
  },
});
