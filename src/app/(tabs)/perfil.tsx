import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Badge,
  Boton,
  CampoTexto,
  Card,
  InfoRow,
  SectionTitle,
  StatCard,
  Texto,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { mensajeDeError } from '@/services/errors';
import { probarConexion } from '@/services/medidoresService';
import { formatearFechaHora, iniciales } from '@/utils/format';
import { normalizarUrlApi, urlEsLocal } from '@/utils/url';

export default function PerfilScreen() {
  const {
    sesion,
    enLinea,
    apiUrl,
    urlPorEntorno,
    pendientes,
    revision,
    enviadas,
    totalLecturas,
    sincronizando,
    ultimaSync,
    ultimoErrorSync,
    sincronizarAhora,
    guardarApiUrl,
    restablecerApi,
    cerrarSesion,
  } = useApp();

  const [url, setUrl] = useState(apiUrl);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const [mensajeUrl, setMensajeUrl] = useState<string | null>(null);

  if (!sesion) return null;

  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function guardar() {
    setErrorUrl(null);
    setMensajeUrl(null);
    setGuardando(true);
    try {
      const normalizada = await guardarApiUrl(url);
      setUrl(normalizada);
      setMensajeUrl('La URL se guardó en este teléfono. Se usará en la próxima consulta.');
    } catch (fallo) {
      setErrorUrl(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  async function probar() {
    setErrorUrl(null);
    setMensajeUrl(null);
    setProbando(true);
    try {
      const base = normalizarUrlApi(url);
      const total = await probarConexion(base);
      setMensajeUrl(
        total > 0
          ? `Conexión correcta. El sistema de oficina respondió (${total} medidor${
              total === 1 ? '' : 'es'
            } en la muestra).`
          : 'El servidor respondió, pero no devolvió medidores. Revisa los datos de la simulación.',
      );
    } catch (fallo) {
      setErrorUrl(mensajeDeError(fallo));
    } finally {
      setProbando(false);
    }
  }

  async function restablecer() {
    setErrorUrl(null);
    setMensajeUrl(null);
    try {
      const restablecida = await restablecerApi();
      setUrl(restablecida);
      setMensajeUrl('Se restableció la URL predeterminada del emulador Android.');
    } catch (fallo) {
      setErrorUrl(mensajeDeError(fallo));
    }
  }

  function confirmarCierre() {
    Alert.alert(
      '¿Cerrar la jornada?',
      'Las lecturas y los borradores guardados en este teléfono se conservan. Para volver a entrar necesitarás tu código y tu clave.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => void cerrarSesion(),
        },
      ],
    );
  }

  return (
    <AppScreen>
      <AppHeader marca titulo="Mi perfil" subtitulo="Datos del técnico y conexión con la oficina." />

      <Card estilo={estilos.perfil}>
        <View style={estilos.avatar}>
          <Texto variante="encabezado" color={colors.accentDark}>
            {iniciales(sesion.nombre)}
          </Texto>
        </View>
        <View style={estilos.perfilTextos}>
          <Texto variante="subtitulo">{sesion.nombre}</Texto>
          <View style={estilos.perfilMeta}>
            <Badge texto={sesion.codigoTecnico} tono="marca" icono="id-card-outline" />
            <Badge texto={`Zona ${sesion.zona}`} tono="neutral" icono="location-outline" />
          </View>
          <Texto variante="micro" color={colors.textMuted}>
            Jornada iniciada el {formatearFechaHora(sesion.iniciadaEn)}
          </Texto>
        </View>
      </Card>

      <View style={estilos.filaStats}>
        <StatCard
          valor={pendientes}
          etiqueta="Por enviar"
          icono="cloud-upload-outline"
          color={colors.warning}
          fondo={colors.warningSoft}
        />
        <StatCard
          valor={revision}
          etiqueta="Por revisar"
          icono="alert-circle-outline"
          color={colors.danger}
          fondo={colors.dangerSoft}
        />
        <StatCard
          valor={enviadas}
          etiqueta="Enviadas"
          icono="checkmark-circle-outline"
          color={colors.success}
          fondo={colors.successSoft}
        />
      </View>

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Sincronización"
          descripcion="La app reintenta sola cada 30 segundos y al volver a primer plano."
        />
        <Card estilo={estilos.syncCard}>
          <View style={estilos.syncFila}>
            <View
              style={[
                estilos.punto,
                { backgroundColor: enLinea ? colors.success : colors.warning },
              ]}
            />
            <Texto variante="cuerpoFuerte" style={estilos.syncTexto}>
              {enLinea ? 'Conectado a la red' : 'Sin conexión'}
            </Texto>
            <Badge
              texto={sincronizando ? 'Sincronizando' : 'En espera'}
              tono={sincronizando ? 'info' : 'neutral'}
              icono={sincronizando ? 'sync' : 'pause-outline'}
            />
          </View>
          <InfoRow
            etiqueta="Última sincronización"
            valor={ultimaSync ? formatearFechaHora(ultimaSync) : 'Aún no se ejecutó'}
            icono="time-outline"
          />
          <InfoRow
            etiqueta="Lecturas en el teléfono"
            valor={String(totalLecturas)}
            icono="phone-portrait-outline"
          />
          <Boton
            titulo="Sincronizar ahora"
            onPress={() => void sincronizarAhora()}
            variante="secundario"
            icono="refresh"
            cargando={sincronizando}
            deshabilitado={!enLinea || pendientes + revision === 0}
          />
          {!enLinea ? (
            <Texto variante="micro" color={colors.warning}>
              Recupera la conexión para enviar las lecturas pendientes. Los datos ya están a salvo
              en el teléfono.
            </Texto>
          ) : null}
        </Card>
      </View>

      {ultimoErrorSync ? (
        <Alerta tono="advertencia" titulo="Aviso de sincronización">
          {ultimoErrorSync}
        </Alerta>
      ) : null}

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Sistema de oficina"
          descripcion="Dirección del servidor que entrega medidores y recibe las lecturas."
        />
        <Card estilo={estilos.apiCard}>
          {urlPorEntorno ? (
            <Alerta tono="info" titulo="URL fijada al compilar">
              La app usa <Texto variante="mono">{apiUrl}</Texto> porque existe la variable
              EXPO_PUBLIC_API_URL. Para cambiarla desde aquí, recompila sin esa variable.
            </Alerta>
          ) : null}

          <CampoTexto
            etiqueta="URL de la API"
            valor={url}
            onChangeText={(valor) => {
              setUrl(valor);
              setErrorUrl(null);
              setMensajeUrl(null);
            }}
            placeholder="http://192.168.1.10:4000"
            icono="server-outline"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!urlPorEntorno}
            error={errorUrl}
            ayuda="En el emulador Android usa http://10.0.2.2:4000. En un teléfono real, la IP de tu computadora."
            testID="perfil-url-api"
          />

          <View style={estilos.filaBotones}>
            <Boton
              titulo="Probar conexión"
              onPress={() => void probar()}
              variante="secundario"
              icono="pulse-outline"
              cargando={probando}
              anchoCompleto={false}
              estilo={estilos.botonMitad}
            />
            <Boton
              titulo="Guardar URL"
              onPress={() => void guardar()}
              icono="save-outline"
              cargando={guardando}
              deshabilitado={urlPorEntorno}
              anchoCompleto={false}
              estilo={estilos.botonMitad}
            />
          </View>

          {!urlPorEntorno ? (
            <Boton
              titulo="Restablecer valor predeterminado"
              onPress={() => void restablecer()}
              variante="fantasma"
              icono="refresh-outline"
            />
          ) : null}

          {mensajeUrl ? (
            <Alerta tono="exito" titulo="Conexión verificada">
              {mensajeUrl}
            </Alerta>
          ) : null}

          {urlEsLocal(url) ? (
            <Texto variante="micro" color={colors.textMuted}>
              Estás usando una dirección local. El servidor de simulación debe estar encendido y en
              la misma red que el teléfono.
            </Texto>
          ) : null}
        </Card>
      </View>

      <View style={estilos.seccion}>
        <SectionTitle titulo="Sobre AquaRuta" />
        <Card estilo={estilos.aboutCard}>
          <InfoRow etiqueta="Versión" valor={version} icono="information-circle-outline" />
          <InfoRow
            etiqueta="Almacenamiento"
            valor="SQLite en el teléfono"
            icono="server-outline"
          />
          <InfoRow etiqueta="Fotos" valor="Carpeta privada de la app" icono="images-outline" />
          <InfoRow etiqueta="Zona de trabajo" valor={sesion.zona} icono="map-outline" />
          <Texto variante="micro" color={colors.textMuted}>
            AquaRuta es una aplicación de demostración para el registro de lecturas de medidores de
            agua. No está conectada a los sistemas reales de EPMAPS.
          </Texto>
        </Card>
      </View>

      <Boton
        titulo="Cerrar sesión"
        onPress={confirmarCierre}
        variante="peligro"
        icono="log-out-outline"
      />
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilTextos: {
    flex: 1,
    gap: spacing.xs,
  },
  perfilMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filaStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  seccion: {
    gap: spacing.md,
  },
  syncCard: {
    gap: spacing.sm,
  },
  syncFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncTexto: {
    flex: 1,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  apiCard: {
    gap: spacing.md,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonMitad: {
    flex: 1,
  },
  aboutCard: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  nota: {
    borderRadius: radius.sm,
  },
});
