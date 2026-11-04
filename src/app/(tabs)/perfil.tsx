import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

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
import { colors } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { useSesion } from '@/context/sesion';
import { mensajeDeError } from '@/services/errors';
import { probarConexion } from '@/services/medidoresService';
import { formatearFechaHora, iniciales } from '@/utils/format';
import { normalizarUrlApi, urlEsLocal } from '@/utils/url';

export default function PerfilScreen() {
  const { usuario, nombre } = useSesion();
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
  const router = useRouter();

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
      setMensajeUrl('Se restableció la URL predeterminada de MockAPI.');
    } catch (fallo) {
      setErrorUrl(mensajeDeError(fallo));
    }
  }

  function confirmarCierre() {
    Alert.alert(
      '¿Cerrar la jornada?',
      'Las lecturas, fotos y borradores guardados en este teléfono se conservan. Para volver a entrar necesitarás tu cuenta Firebase y el código de técnico.',
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

      <Card className="flex-row items-center gap-3 bg-indigo-50">
        <View className="h-[66px] w-[66px] items-center justify-center rounded-full border border-white bg-teal-100 shadow-sm">
          <Texto variante="encabezado" color={colors.accentDark}>
            {iniciales(nombre)}
          </Texto>
        </View>
        <View className="flex-1 gap-1">
          <Texto variante="subtitulo">{nombre}</Texto>
          <View className="flex-row flex-wrap gap-1">
            <Badge texto={sesion.codigoTecnico} tono="marca" icono="id-card-outline" />
            <Badge texto={`Zona ${sesion.zona}`} tono="neutral" icono="location-outline" />
          </View>
          <Texto variante="micro" color={colors.textMuted}>
            Jornada iniciada el {formatearFechaHora(sesion.iniciadaEn)}
          </Texto>
        </View>
      </Card>

      <View className="gap-3">
        <SectionTitle titulo="Cuenta Firebase" descripcion="Identidad autenticada para esta sesión." />
        <Card className="gap-1 py-2">
          <InfoRow etiqueta="Nombre de perfil" valor={nombre} icono="person-outline" />
          <InfoRow etiqueta="Correo" valor={usuario?.email ?? 'No disponible'} icono="mail-outline" />
          <InfoRow
            etiqueta="Verificación"
            valor={usuario?.emailVerified ? 'Correo verificado' : 'Pendiente'}
            color={usuario?.emailVerified ? colors.success : colors.warning}
            icono="shield-checkmark-outline"
          />
          <InfoRow
            etiqueta="Cuenta creada"
            valor={usuario?.metadata.creationTime ? formatearFechaHora(usuario.metadata.creationTime) : 'No disponible'}
            icono="calendar-outline"
          />
          <InfoRow
            etiqueta="Último ingreso"
            valor={usuario?.metadata.lastSignInTime ? formatearFechaHora(usuario.metadata.lastSignInTime) : 'No disponible'}
            icono="time-outline"
          />
          <Boton
            titulo="Editar perfil"
            onPress={() => router.push('/editar-perfil')}
            variante="secundario"
            icono="person-circle-outline"
          />
          <Boton
            titulo="Cambiar contraseña"
            onPress={() => router.push('/cambiar-clave')}
            variante="secundario"
            icono="key-outline"
          />
        </Card>
      </View>

      <View className="flex-row gap-2">
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

      <View className="gap-3">
        <SectionTitle
          titulo="Sincronización"
          descripcion="La app reintenta sola cada 30 segundos y al volver a primer plano."
        />
        <Card className="gap-2">
          <View className="flex-row items-center gap-2">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: enLinea ? colors.success : colors.warning }}
            />
            <Texto variante="cuerpoFuerte" className="flex-1">
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

      <View className="gap-3">
        <SectionTitle
          titulo="Sistema de oficina"
          descripcion="Dirección del servidor que entrega medidores y recibe las lecturas."
        />
        <Card className="gap-3">
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
            placeholder="https://6ae0a4a2be3bc8fead97a3b2.mockapi.io"
            icono="server-outline"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!urlPorEntorno}
            error={errorUrl}
            ayuda="Usa la URL raíz del proyecto MockAPI (sin /recursos). La app consulta /medidores y /lecturas."
            testID="perfil-url-api"
          />

          <View className="flex-row gap-2">
            <Boton
              titulo="Probar conexión"
              onPress={() => void probar()}
              variante="secundario"
              icono="pulse-outline"
              cargando={probando}
              anchoCompleto={false}
              className="flex-1"
            />
            <Boton
              titulo="Guardar URL"
              onPress={() => void guardar()}
              icono="save-outline"
              cargando={guardando}
              deshabilitado={urlPorEntorno}
              anchoCompleto={false}
              className="flex-1"
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

      <View className="gap-3">
        <SectionTitle titulo="Sobre AquaRuta" />
        <Card className="gap-1 py-2">
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
