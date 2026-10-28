import type {
  EstadoVerificacion,
  Lectura,
  LecturaRemota,
  Medidor,
} from '../types/models';
import { evaluarConsumo } from '../utils/consumo';
import { calcularEstadoVerificacion } from '../utils/verificacion';
import { ApiError, esConflicto, esErrorDeRed } from './errors';

export interface SyncDependencias {
  listarPendientes(codigoTecnico: string): Promise<Lectura[]>;
  obtenerMedidor(codigo: string): Promise<Medidor | null>;
  consultarMedidorRemoto(codigo: string): Promise<Medidor | null>;
  guardarMedidor(medidor: Medidor): Promise<void>;
  reclamarLectura(localId: string): Promise<boolean>;
  buscarLecturaRemota(localId: string): Promise<LecturaRemota | null>;
  buscarLecturaRemotaPorPeriodo(
    codigoMedidor: string,
    periodo: string,
  ): Promise<LecturaRemota | null>;
  enviarLectura(lectura: Lectura): Promise<LecturaRemota>;
  actualizarEvaluacion(
    localId: string,
    datos: {
      ultimaLecturaReferencia: number | null;
      consumoCalculado: number | null;
      consumoPromedioReferencia: number | null;
      estadoVerificacion: EstadoVerificacion;
    },
  ): Promise<void>;
  marcarEnviada(localId: string, idRemoto: string | null, fechaEnvio: string): Promise<void>;
  marcarPendiente(localId: string, mensaje: string): Promise<void>;
  marcarRequiereRevision(
    localId: string,
    mensaje: string,
    estadoVerificacion?: EstadoVerificacion,
  ): Promise<void>;
  ahora(): string;
}

export interface ResultadoSincronizacion {
  intentadas: number;
  enviadas: number;
  revision: number;
  errores: number;
  interrumpidaPorRed: boolean;
}

interface LecturaPreparada {
  lectura: Lectura;
  motivoRevision: string | null;
}

async function buscarLecturaOpcional(
  buscar: () => Promise<LecturaRemota | null>,
): Promise<LecturaRemota | null> {
  try {
    return await buscar();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function prepararLectura(
  lectura: Lectura,
  deps: SyncDependencias,
): Promise<LecturaPreparada> {
  let medidor = await deps.obtenerMedidor(lectura.codigoMedidor);

  const datosIncompletos =
    !medidor || medidor.ultimaLectura == null || medidor.consumoPromedioMensual == null;

  if (datosIncompletos) {
    const remoto = await deps.consultarMedidorRemoto(lectura.codigoMedidor);
    if (remoto) {
      medidor = remoto;
      await deps.guardarMedidor(remoto);
    }
  }

  const ultima = medidor?.ultimaLectura ?? lectura.ultimaLecturaReferencia;
  const promedio = medidor?.consumoPromedioMensual ?? lectura.consumoPromedioReferencia;
  const evaluacion = evaluarConsumo(lectura.lecturaActual, ultima, promedio);

  const estadoVerificacion = calcularEstadoVerificacion({
    tipoEstado: lectura.tipoEstado,
    lecturaActual: lectura.lecturaActual,
    evaluacion,
    confirmacionRevision: lectura.confirmacionRevision,
    fotoUri: lectura.fotoUri,
  });

  await deps.actualizarEvaluacion(lectura.localId, {
    ultimaLecturaReferencia: ultima,
    consumoCalculado: evaluacion.consumo,
    consumoPromedioReferencia: promedio,
    estadoVerificacion,
  });

  const preparada: Lectura = {
    ...lectura,
    medidorId: medidor?.idRemoto ?? lectura.medidorId,
    ultimaLecturaReferencia: ultima,
    consumoCalculado: evaluacion.consumo,
    consumoPromedioReferencia: promedio,
    estadoVerificacion,
  };

  if (!medidor) {
    return {
      lectura: preparada,
      motivoRevision: 'No se encontró el medidor en el sistema de oficina.',
    };
  }

  if (
    lectura.lecturaActual != null &&
    ultima != null &&
    lectura.lecturaActual < ultima
  ) {
    return {
      lectura: preparada,
      motivoRevision: `La lectura (${lectura.lecturaActual}) es menor que la última registrada en la oficina (${ultima}). Corrige el valor o registra una incidencia.`,
    };
  }

  if (lectura.tipoEstado === 'danado' && !lectura.fotoUri) {
    return {
      lectura: preparada,
      motivoRevision: 'El medidor está dañado y falta la foto obligatoria.',
    };
  }

  if (evaluacion.anomalia && !lectura.confirmacionRevision) {
    return {
      lectura: preparada,
      motivoRevision:
        'El consumo supera el triple del promedio y falta la confirmación de revisión del medidor.',
    };
  }

  if (evaluacion.anomalia && !lectura.fotoUri) {
    return {
      lectura: preparada,
      motivoRevision:
        'El consumo supera el triple del promedio y falta la foto obligatoria del medidor.',
    };
  }

  return { lectura: preparada, motivoRevision: null };
}

function esErrorReintentable(error: unknown): boolean {
  if (esErrorDeRed(error)) return true;
  return error instanceof ApiError && typeof error.status === 'number' && error.status >= 500;
}

async function buscarRemotaSinRomper(
  deps: SyncDependencias,
  localId: string,
): Promise<LecturaRemota | null> {
  try {
    return await deps.buscarLecturaRemota(localId);
  } catch {
    return null;
  }
}

/**
 * Motor puro de sincronización. Recibe las dependencias para poder probarse
 * con `node:test` sin SQLite ni fetch. La regla central: nunca marcar como
 * enviada sin una respuesta 2xx o sin encontrar el localId en la oficina.
 */
export async function sincronizarPendientes(
  codigoTecnico: string,
  deps: SyncDependencias,
): Promise<ResultadoSincronizacion> {
  const pendientes = await deps.listarPendientes(codigoTecnico);
  const resultado: ResultadoSincronizacion = {
    intentadas: 0,
    enviadas: 0,
    revision: 0,
    errores: 0,
    interrumpidaPorRed: false,
  };

  for (const lectura of pendientes) {
    const reclamada = await deps.reclamarLectura(lectura.localId);
    if (!reclamada) continue;
    resultado.intentadas += 1;

    let preparada: LecturaPreparada;
    try {
      preparada = await prepararLectura(lectura, deps);
    } catch (error) {
      if (esErrorReintentable(error)) {
        await deps.marcarPendiente(lectura.localId, (error as Error).message);
        resultado.errores += 1;
        if (esErrorDeRed(error)) {
          resultado.interrumpidaPorRed = true;
          break;
        }
        continue;
      }
      await deps.marcarRequiereRevision(lectura.localId, (error as Error).message);
      resultado.revision += 1;
      continue;
    }

    if (preparada.motivoRevision) {
      await deps.marcarRequiereRevision(
        lectura.localId,
        preparada.motivoRevision,
        preparada.lectura.estadoVerificacion,
      );
      resultado.revision += 1;
      continue;
    }

    try {
      const existente = await buscarLecturaOpcional(() =>
        deps.buscarLecturaRemota(lectura.localId),
      );
      if (existente) {
        await deps.marcarEnviada(lectura.localId, existente.id, deps.ahora());
        resultado.enviadas += 1;
        continue;
      }

      // MockAPI no impone unicidad por medidor/periodo. Antes de enviar se
      // consulta el periodo para no crear un duplicado que el servidor
      // aceptaría sin protestar. Si el registro encontrado es este mismo
      // envío, se marca como enviado; si es de otro dispositivo, se revisa.
      const delPeriodo = await buscarLecturaOpcional(() =>
        deps.buscarLecturaRemotaPorPeriodo(lectura.codigoMedidor, lectura.periodo),
      );
      if (delPeriodo) {
        if (delPeriodo.localId === lectura.localId) {
          await deps.marcarEnviada(lectura.localId, delPeriodo.id, deps.ahora());
          resultado.enviadas += 1;
        } else {
          await deps.marcarRequiereRevision(
            lectura.localId,
            `Ya existe una lectura de ${lectura.codigoMedidor} para ${lectura.periodo} en el sistema de oficina. No se envió para evitar un duplicado.`,
            preparada.lectura.estadoVerificacion,
          );
          resultado.revision += 1;
        }
        continue;
      }

      const remota = await deps.enviarLectura(preparada.lectura);
      await deps.marcarEnviada(lectura.localId, remota.id, deps.ahora());
      resultado.enviadas += 1;
    } catch (error) {
      if (esConflicto(error)) {
        const existente = await buscarRemotaSinRomper(deps, lectura.localId);
        if (existente) {
          await deps.marcarEnviada(lectura.localId, existente.id, deps.ahora());
          resultado.enviadas += 1;
        } else {
          await deps.marcarRequiereRevision(
            lectura.localId,
            (error as Error).message,
            preparada.lectura.estadoVerificacion,
          );
          resultado.revision += 1;
        }
        continue;
      }

      if (esErrorReintentable(error)) {
        await deps.marcarPendiente(lectura.localId, (error as Error).message);
        resultado.errores += 1;
        if (esErrorDeRed(error)) {
          resultado.interrumpidaPorRed = true;
          break;
        }
        continue;
      }

      await deps.marcarRequiereRevision(
        lectura.localId,
        (error as Error).message,
        preparada.lectura.estadoVerificacion,
      );
      resultado.revision += 1;
    }
  }

  return resultado;
}
