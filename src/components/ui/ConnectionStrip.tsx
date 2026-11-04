import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useApp } from '../../context/AppProvider';
import { colors } from '../../constants/ui';
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
    <View className={`clay-raised mx-4 mt-2 gap-0.5 rounded-3xl px-3 py-2 shadow-sm ${enLinea ? 'bg-aqua-surface' : 'bg-amber-100'}`}>
      <View className="min-h-[30px] flex-row items-center gap-1">
        <View className="flex-row items-center gap-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: enLinea ? colors.success : colors.warning }}
          />
          <Texto variante="caption" peso="bold" color={enLinea ? colors.success : colors.warning}>
            {enLinea ? 'Con conexión' : 'Sin conexión'}
          </Texto>
        </View>

        <View className="mx-1 h-3.5 w-px bg-slate-300" />

        <Ionicons
          name={pendientes > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
          size={17}
          color={pendientes > 0 ? colors.warning : colors.success}
        />
        <Texto variante="caption" color={colors.textMuted} className="shrink">
          {pendientes === 0 ? 'Sin pendientes' : `${pendientes} por enviar`}
        </Texto>

        {revision > 0 ? <Badge texto={`${revision} por revisar`} tono="peligro" /> : null}

        <View className="flex-1" />

        <Pressable
          onPress={() => void sincronizarAhora()}
          disabled={!puedeSincronizar}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar lecturas ahora"
          accessibilityState={{ disabled: !puedeSincronizar, busy: sincronizando }}
          hitSlop={8}
          className="h-[34px] w-[34px] items-center justify-center rounded-xl border border-white bg-indigo-100"
          style={({ pressed }) => [
            !puedeSincronizar ? { backgroundColor: 'transparent' } : undefined,
            pressed && puedeSincronizar ? { backgroundColor: colors.accentSoft } : undefined,
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
        <Texto variante="micro" color={colors.warning} className="pl-3">
          Los registros se guardan en el teléfono y se enviarán al recuperar la conexión.
        </Texto>
      ) : sincronizando ? (
        <Texto variante="micro" color={colors.info} className="pl-3">
          Sincronizando con el sistema de oficina…
        </Texto>
      ) : null}
    </View>
  );
}
