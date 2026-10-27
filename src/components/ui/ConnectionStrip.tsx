import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApp } from '../../context/AppProvider';
import { cardShadow, clayBorder, colors, radius, spacing } from '../../constants/ui';
import { Badge } from './Badge';
import { Texto } from './Texto';

export function ConnectionStrip() {
  const {
    enLinea,
    pendientes,
    revision,
    sincronizando,
    sincronizarAhora,
  } = useApp();

  const puedeSincronizar = enLinea && pendientes > 0 && !sincronizando;

  return (
    <View style={[estilos.contenedor, !enLinea && estilos.contenedorOffline]}>
      <View style={estilos.fila}>
        <View style={estilos.estado}>
          <View
            style={[
              estilos.punto,
              { backgroundColor: enLinea ? colors.success : colors.warning },
            ]}
          />
          <Texto variante="caption" peso="bold" color={enLinea ? colors.success : colors.warning}>
            {enLinea ? 'Con conexión' : 'Sin conexión'}
          </Texto>
        </View>

        <View style={estilos.separador} />

        <Ionicons
          name={pendientes > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
          size={17}
          color={pendientes > 0 ? colors.warning : colors.success}
        />
        <Texto variante="caption" color={colors.textMuted} style={estilos.pendientes}>
          {pendientes === 0 ? 'Sin pendientes' : `${pendientes} por enviar`}
        </Texto>

        {revision > 0 ? <Badge texto={`${revision} por revisar`} tono="peligro" /> : null}

        <View style={estilos.espacio} />

        <Pressable
          onPress={() => void sincronizarAhora()}
          disabled={!puedeSincronizar}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar lecturas ahora"
          accessibilityState={{ disabled: !puedeSincronizar, busy: sincronizando }}
          hitSlop={8}
          style={({ pressed }) => [
            estilos.botonSync,
            !puedeSincronizar && estilos.botonSyncInactivo,
            pressed && puedeSincronizar && estilos.botonSyncPresionado,
          ]}
        >
          <Ionicons
            name={sincronizando ? 'sync' : 'refresh'}
            size={18}
            color={puedeSincronizar ? colors.accentDark : colors.textSoft}
          />
        </Pressable>
      </View>

      {!enLinea ? (
        <Texto variante="micro" color={colors.warning} style={estilos.ayuda}>
          Los registros se guardan en el teléfono y se enviarán al recuperar la conexión.
        </Texto>
      ) : sincronizando ? (
        <Texto variante="micro" color={colors.info} style={estilos.ayuda}>
          Sincronizando con el sistema de oficina…
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    ...clayBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    ...cardShadow,
  },
  contenedorOffline: {
    backgroundColor: colors.warningSoft,
    borderBottomColor: '#F5D68A',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 30,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  separador: {
    width: 1,
    height: 14,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.xs,
  },
  pendientes: {
    flexShrink: 1,
  },
  espacio: {
    flex: 1,
  },
  botonSync: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBrand,
    borderWidth: 1,
    borderColor: colors.white,
  },
  botonSyncInactivo: {
    backgroundColor: 'transparent',
  },
  botonSyncPresionado: {
    backgroundColor: colors.accentSoft,
  },
  ayuda: {
    paddingLeft: 13,
  },
});
