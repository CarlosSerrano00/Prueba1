import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Alerta,
  AppHeader,
  AppScreen,
  Boton,
  CampoTexto,
  Card,
  EmptyState,
  MeterCard,
  SectionTitle,
  Texto,
} from '@/components/ui';
import { colors, spacing } from '@/constants/ui';
import { useApp } from '@/context/AppProvider';
import { mensajeDeError } from '@/services/errors';
import { consultarMedidor, listarRecientes } from '@/services/medidoresService';
import type { Medidor } from '@/types/models';
import { validarCodigoMedidor } from '@/utils/validators';

export default function BuscarScreen() {
  const router = useRouter();
  const { enLinea } = useApp();
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [recientes, setRecientes] = useState<Medidor[]>([]);

  const cargarRecientes = useCallback(async () => {
    setRecientes(await listarRecientes(6));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarRecientes();
    }, [cargarRecientes]),
  );

  function cambiarCodigo(valor: string) {
    setCodigo(valor);
    if (errorCodigo) setErrorCodigo(null);
    if (errorConsulta) setErrorConsulta(null);
  }

  async function consultar() {
    setErrorConsulta(null);
    const validacion = validarCodigoMedidor(codigo);
    if (!validacion.valido) {
      setErrorCodigo(validacion.mensaje);
      return;
    }
    setErrorCodigo(null);
    setBuscando(true);
    try {
      await consultarMedidor(codigo, enLinea);
      router.push({ pathname: '/medidor/[codigo]', params: { codigo } });
    } catch (fallo) {
      setErrorConsulta(mensajeDeError(fallo));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader
        marca
        titulo="Buscar medidor"
        subtitulo="Escribe el código de la etiqueta para consultar la oficina."
      />

      <Card estilo={estilos.buscador}>
        <CampoTexto
          etiqueta="Código del medidor"
          valor={codigo}
          onChangeText={cambiarCodigo}
          placeholder="MED-123456"
          icono="barcode-outline"
          autoCapitalize="none"
          autoCorrect={false}
          error={errorCodigo}
          ayuda="Formato exacto: MED- seguido de seis dígitos."
          testID="buscar-codigo"
        />

        <Boton
          titulo={buscando ? 'Consultando…' : 'Consultar medidor'}
          onPress={() => void consultar()}
          icono="search-outline"
          cargando={buscando}
          deshabilitado={codigo.trim().length === 0}
        />

        <View style={estilos.notaValidacion}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
          <Texto variante="micro" color={colors.textMuted} style={estilos.notaTexto}>
            Si el código está incompleto, la app no consulta ni muestra datos de ningún medidor.
          </Texto>
        </View>
      </Card>

      {errorConsulta ? (
        <Alerta tono="peligro" titulo="No se pudo consultar el medidor">
          {errorConsulta}
        </Alerta>
      ) : null}

      {!enLinea ? (
        <Alerta tono="advertencia" titulo="Estás sin conexión">
          Puedes abrir un medidor consultado antes. Para consultar uno nuevo, recupera la conexión
          con el sistema de oficina.
        </Alerta>
      ) : null}

      <Alerta tono="info" titulo="La etiqueta manda">
        Revisa que el código escrito coincida con la etiqueta física. Un dígito cambiado puede
        registrar la lectura en el medidor equivocado.
      </Alerta>

      <View style={estilos.seccion}>
        <SectionTitle
          titulo="Medidores recientes"
          descripcion="Consultas guardadas en este teléfono."
        />

        {recientes.length === 0 ? (
          <EmptyState
            icono="speedometer-outline"
            titulo="Todavía no hay medidores guardados"
            mensaje="El primer medidor que consultes con señal quedará disponible para abrirlo sin conexión."
            compacto
          />
        ) : (
          <View style={estilos.lista}>
            {recientes.map((medidor) => (
              <MeterCard
                key={medidor.codigo}
                medidor={medidor}
                onPress={() => router.push({ pathname: '/medidor/[codigo]', params: { codigo: medidor.codigo } })}
              />
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const estilos = StyleSheet.create({
  buscador: {
    gap: spacing.md,
  },
  notaValidacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  notaTexto: {
    flex: 1,
  },
  seccion: {
    gap: spacing.md,
  },
  lista: {
    gap: spacing.sm,
  },
});
