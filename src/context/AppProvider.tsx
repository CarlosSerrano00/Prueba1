import * as Network from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import type { Borrador, ResumenLecturas, Sesion } from '../types/models';
import {
  guardarApiUrl as guardarApiUrlServicio,
  obtenerApiUrl,
  restablecerApiUrl,
  urlEstaDefinidaPorEntorno,
} from '../services/apiConfig';
import {
  contarBorradoresDeTecnico,
  obtenerBorradorDeTecnico,
} from '../services/borradoresService';
import { mensajeDeError } from '../services/errors';
import { resumenDeLecturas } from '../services/lecturasService';
import {
  cerrarSesion as cerrarSesionServicio,
  iniciarSesion as iniciarSesionServicio,
  restaurarSesion,
} from '../services/sesionService';
import { sincronizar } from '../services/syncService';
import { resetearEnviosInterrumpidos } from '../storage/lecturasRepository';
import { URL_API_POR_DEFECTO } from '../utils/url';

const RESUMEN_VACIO: ResumenLecturas = {
  pendientes: 0,
  revision: 0,
  enviadas: 0,
  total: 0,
};

interface AppContextValue {
  cargando: boolean;
  errorInicial: string | null;
  sesion: Sesion | null;
  estadoRed: Network.NetworkState | null;
  enLinea: boolean;
  pendientes: number;
  revision: number;
  enviadas: number;
  totalLecturas: number;
  borrador: Borrador | null;
  borradores: number;
  sincronizando: boolean;
  ultimoErrorSync: string | null;
  ultimaSync: string | null;
  apiUrl: string;
  urlPorEntorno: boolean;
  iniciarSesion: (codigo: string, clave: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  refrescarEstado: () => Promise<void>;
  recargarBorrador: () => Promise<void>;
  sincronizarAhora: () => Promise<void>;
  guardarApiUrl: (url: string) => Promise<string>;
  restablecerApi: () => Promise<string>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [errorInicial, setErrorInicial] = useState<string | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [estadoRed, setEstadoRed] = useState<Network.NetworkState | null>(null);
  const [enLinea, setEnLinea] = useState(true);
  const [resumen, setResumen] = useState<ResumenLecturas>(RESUMEN_VACIO);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [borradores, setBorradores] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoErrorSync, setUltimoErrorSync] = useState<string | null>(null);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState(URL_API_POR_DEFECTO);
  const [urlPorEntorno, setUrlPorEntorno] = useState(false);
  const sincronizandoRef = useRef(false);
  const sincronizarRef = useRef<() => Promise<void>>(async () => {});

  const refrescarEstado = useCallback(async () => {
    const codigo = sesion?.codigoTecnico;
    if (!codigo) {
      setResumen(RESUMEN_VACIO);
      setBorrador(null);
      setBorradores(0);
      return;
    }

    try {
      const [nuevoResumen, nuevoBorrador, totalBorradores] = await Promise.all([
        resumenDeLecturas(codigo),
        obtenerBorradorDeTecnico(codigo),
        contarBorradoresDeTecnico(codigo),
      ]);
      setResumen(nuevoResumen);
      setBorrador(nuevoBorrador);
      setBorradores(totalBorradores);
    } catch {
      // La interfaz conserva el último resumen conocido. El error real se
      // reporta en la operación que intentó modificar datos.
    }
  }, [sesion?.codigoTecnico]);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      try {
        await resetearEnviosInterrumpidos();
        const [sesionGuardada, url, porEntorno] = await Promise.all([
          restaurarSesion(),
          obtenerApiUrl(),
          urlEstaDefinidaPorEntorno(),
        ]);
        if (!activo) return;
        setSesion(sesionGuardada);
        setApiUrl(url);
        setUrlPorEntorno(porEntorno);
      } catch (error) {
        if (activo) setErrorInicial(mensajeDeError(error));
      } finally {
        if (activo) setCargando(false);
      }
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, []);

  const revisarRed = useCallback(async () => {
    try {
      const estado = await Network.getNetworkStateAsync();
      setEstadoRed(estado);
      setEnLinea(estado.isConnected !== false);
    } catch {
      setEnLinea(false);
    }
  }, []);

  useEffect(() => {
    const consultaInicial = setTimeout(() => {
      void revisarRed();
    }, 0);

    const suscripcion = Network.addNetworkStateListener((estado) => {
      setEstadoRed(estado);
      setEnLinea(estado.isConnected !== false);
    });

    const intervalo = setInterval(() => {
      void revisarRed();
    }, 30_000);

    const appState = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        void revisarRed();
        void sincronizarRef.current();
      }
    });

    return () => {
      clearTimeout(consultaInicial);
      suscripcion.remove();
      clearInterval(intervalo);
      appState.remove();
    };
  }, [revisarRed]);

  useEffect(() => {
    const tarea = setTimeout(() => {
      void refrescarEstado();
    }, 0);
    return () => clearTimeout(tarea);
  }, [refrescarEstado]);

  const iniciarSesion = useCallback(async (codigo: string, clave: string) => {
    const nueva = await iniciarSesionServicio(codigo, clave);
    setSesion(nueva);
    setUltimoErrorSync(null);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionServicio();
    setSesion(null);
    setResumen(RESUMEN_VACIO);
    setBorrador(null);
    setBorradores(0);
    setUltimoErrorSync(null);
    setUltimaSync(null);
  }, []);

  const sincronizarAhora = useCallback(async () => {
    if (!sesion || !enLinea || sincronizandoRef.current) return;

    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const resultado = await sincronizar(sesion.codigoTecnico);
      setUltimaSync(new Date().toISOString());
      if (resultado.interrumpidaPorRed) {
        setUltimoErrorSync('Se perdió la conexión durante el envío. Se reintentará automáticamente.');
      } else if (resultado.errores > 0) {
        setUltimoErrorSync('Algunas lecturas no se pudieron enviar. Se reintentará automáticamente.');
      } else {
        setUltimoErrorSync(null);
      }
      if (resultado.revision > 0) {
        setUltimoErrorSync(
          'Hay lecturas que necesitan tu revisión antes de enviarse. Ábrelas desde la lista de lecturas.',
        );
      }
    } catch (error) {
      setUltimoErrorSync(mensajeDeError(error));
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
      await refrescarEstado();
    }
  }, [enLinea, refrescarEstado, sesion]);

  useEffect(() => {
    sincronizarRef.current = sincronizarAhora;
  }, [sincronizarAhora]);

  useEffect(() => {
    if (!sesion || !enLinea || resumen.pendientes === 0) return;
    const tarea = setTimeout(() => {
      void sincronizarAhora();
    }, 0);
    return () => clearTimeout(tarea);
  }, [enLinea, resumen.pendientes, sesion, sincronizarAhora]);

  useEffect(() => {
    if (!sesion || !enLinea || resumen.pendientes === 0) return;
    const intervalo = setInterval(() => {
      void sincronizarAhora();
    }, 30_000);
    return () => clearInterval(intervalo);
  }, [enLinea, resumen.pendientes, sesion, sincronizarAhora]);

  const recargarBorrador = useCallback(async () => {
    const codigo = sesion?.codigoTecnico;
    if (!codigo) {
      setBorrador(null);
      setBorradores(0);
      return;
    }
    const [nuevoBorrador, total] = await Promise.all([
      obtenerBorradorDeTecnico(codigo),
      contarBorradoresDeTecnico(codigo),
    ]);
    setBorrador(nuevoBorrador);
    setBorradores(total);
  }, [sesion?.codigoTecnico]);

  const guardarApiUrl = useCallback(async (url: string) => {
    const normalizada = await guardarApiUrlServicio(url);
    setApiUrl(normalizada);
    setUltimoErrorSync(null);
    return normalizada;
  }, []);

  const restablecerApi = useCallback(async () => {
    const url = await restablecerApiUrl();
    setApiUrl(url);
    setUltimoErrorSync(null);
    return url;
  }, []);

  const valor = useMemo<AppContextValue>(
    () => ({
      cargando,
      errorInicial,
      sesion,
      estadoRed,
      enLinea,
      pendientes: resumen.pendientes,
      revision: resumen.revision,
      enviadas: resumen.enviadas,
      totalLecturas: resumen.total,
      borrador,
      borradores,
      sincronizando,
      ultimoErrorSync,
      ultimaSync,
      apiUrl,
      urlPorEntorno,
      iniciarSesion,
      cerrarSesion,
      refrescarEstado,
      recargarBorrador,
      sincronizarAhora,
      guardarApiUrl,
      restablecerApi,
    }),
    [
      apiUrl,
      borrador,
      borradores,
      cargando,
      cerrarSesion,
      enLinea,
      errorInicial,
      estadoRed,
      guardarApiUrl,
      iniciarSesion,
      recargarBorrador,
      refrescarEstado,
      restablecerApi,
      resumen,
      sesion,
      sincronizando,
      sincronizarAhora,
      ultimaSync,
      ultimoErrorSync,
      urlPorEntorno,
    ],
  );

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const contexto = useContext(AppContext);
  if (!contexto) {
    throw new Error('useApp debe usarse dentro de AppProvider.');
  }
  return contexto;
}
