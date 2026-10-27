import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Alerta, AppHeader, AppScreen, Boton, Card, InfoRow, Texto } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { descartarBorrador } from '@/services/borradoresService';
import { mensajeDeError } from '@/services/errors';
import { formatearFechaHora } from '@/utils/format';

export default function BorradorScreen() {
  const router = useRouter();
  const { borrador, recargarBorrador } = useApp();
  const [descartando, setDescartando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function salirSinDecidir() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  function continuar() {
    if (!borrador) return;
    router.replace({
      pathname: '/registro/[codigo]',
      params: { codigo: borrador.codigoMedidor, borrador: borrador.localId },
    });
  }

  function confirmarDescarte() {
    if (!borrador) return;
    Alert.alert(
      '¿Descartar la captura?',
      `Se perderán los datos guardados del medidor ${borrador.codigoMedidor} y su foto si la tenía. Esta acción no se puede deshacer.`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => void descartar(),
        },
      ],
    );
  }

  async function descartar() {
    if (!borrador) return;
    setDescartando(true);
    setError(null);
    try {
      await descartarBorrador(borrador.localId);
      await recargarBorrador();
      router.replace('/');
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setDescartando(false);
    }
  }

  if (!borrador) {
    return (
      <AppScreen>
        <AppHeader titulo="Captura pendiente" onBack={salirSinDecidir} />
        <View style={estilos.centro}>
          <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
          <Texto variante="subtitulo" centrado>
            No hay capturas sin terminar
          </Texto>
          <Texto variante="caption" color={colors.textMuted} centrado>
            Puedes empezar un registro nuevo desde Buscar.
          </Texto>
          <Boton
            titulo="Volver al inicio"
            onPress={() => router.replace('/')}
            variante="secundario"
            icono="home-outline"
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        titulo="Captura sin terminar"
        subtitulo="La app guardó tu avance para que no pierdas el trabajo de campo."
      />

      <Card estilo={estilos.hero}>
        <View style={estilos.icono}>
          <Ionicons name="document-text-outline" size={30} color={colors.draft} />
        </View>
        <Texto variante="subtitulo">Continúa donde la dejaste</Texto>
        <Texto variante="caption" color={colors.textMuted}>
          El borrador vive en este teléfono. Puedes continuar la captura o descartarla; no se
          enviará nada hasta que la guardes como lectura.
        </Texto>
      </Card>

      <Card estilo={estilos.datosCard}>
        <InfoRow
          etiqueta="Medidor"
          valor={borrador.codigoMedidor}
          icono="barcode-outline"
        />
        <View style={estilos.divisor} />
        <InfoRow
          etiqueta="Paso guardado"
          valor={`${borrador.paso} de 3`}
          icono="list-outline"
        />
        <View style={estilos.divisor} />
        <InfoRow
          etiqueta="Última actualización"
          valor={formatearFechaHora(borrador.actualizadoEn)}
          icono="time-outline"
        />
        <View style={estilos.divisor} />
        <InfoRow
          etiqueta="Foto adjunta"
          valor={borrador.fotoUri ? 'Sí' : 'Todavía no'}
          icono="camera-outline"
        />
      </Card>

      {borrador.paso === 1 ? (
        <Alerta tono="info" titulo="Faltan los datos de la lectura">
          Retoma el paso 1 para registrar el estado del medidor y la lectura.
        </Alerta>
      ) : borrador.paso === 2 ? (
        <Alerta tono="info" titulo="Falta la foto del medidor">
          Retoma el paso 2 para adjuntar la evidencia si el registro la exige.
        </Alerta>
      ) : (
        <Alerta tono="advertencia" titulo="Falta guardar la lectura">
          Los datos están completos en el resumen. Retoma el paso 3 para guardar el registro.
        </Alerta>
      )}

      {error ? (
        <Alerta tono="peligro" titulo="No se pudo descartar el borrador">
          {error}
        </Alerta>
      ) : null}

      <Boton
        titulo="Continuar la captura"
        onPress={continuar}
        icono="arrow-forward"
        iconoDerecha="create-outline"
      />
      <Boton
        titulo="Descartar el borrador"
        onPress={confirmarDescarte}
        variante="peligro"
        icono="trash-outline"
        cargando={descartando}
      />
      <Boton titulo="Decidir más tarde" onPress={salirSinDecidir} variante="fantasma" />
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.huge,
  },
  hero: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceBrand,
  },
  icono: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.draftSoft,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datosCard: {
    paddingVertical: spacing.sm,
  },
  divisor: {
    height: 1,
    backgroundColor: colors.surfaceAlt,
  },
});
