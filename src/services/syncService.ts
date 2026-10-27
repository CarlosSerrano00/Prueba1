import type { LecturaRemota, Medidor } from '../types/models';
import {
  actualizarEvaluacionLectura,
  listarPendientesEnvio,
  marcarLecturaEnviada,
  marcarLecturaPendiente,
  marcarLecturaRequiereRevision,
  reclamarLecturaParaEnvio,
} from '../storage/lecturasRepository';
import { guardarMedidor, obtenerMedidor } from '../storage/medidoresRepository';
import { cuerpoLecturaRemota } from '../utils/contratoRemoto';
import { construirConsulta, solicitar } from './apiClient';
import { parsearLecturaRemota } from './apiParsers';
import { consultarMedidorRemoto } from './medidoresService';
import {
  sincronizarPendientes,
  type ResultadoSincronizacion,
  type SyncDependencias,
} from './syncEngine';

function medidorDesdeRemoto(codigo: string, medidor: Awaited<ReturnType<typeof consultarMedidorRemoto>>): Medidor | null {
  if (!medidor || medidor.codigo !== codigo) return null;
  return {
    idRemoto: medidor.id,
    codigo: medidor.codigo,
    direccion: medidor.direccion,
    sector: medidor.sector,
    numeroCuenta: medidor.numeroCuenta,
    estado: medidor.estado,
    ultimaLectura: medidor.ultimaLectura,
    fechaUltimaLectura: medidor.fechaUltimaLectura,
    consumoPromedioMensual: medidor.consumoPromedioMensual,
    consultadoEn: new Date().toISOString(),
  };
}

async function buscarLecturaRemotaConFiltros(
  filtros: Record<string, string>,
  coincide: (item: Record<string, unknown>) => boolean,
): Promise<LecturaRemota | null> {
  const datos = await solicitar<unknown>(`/lecturas${construirConsulta(filtros)}`);
  if (datos == null) return null;
  const lista = Array.isArray(datos) ? datos : [datos];
  const encontrada = lista.find(
    (item) => item != null && typeof item === 'object' && coincide(item as Record<string, unknown>),
  );
  return encontrada ? parsearLecturaRemota(encontrada) : null;
}

const dependencias: SyncDependencias = {
  listarPendientes: (codigoTecnico) => listarPendientesEnvio(codigoTecnico),

  obtenerMedidor: (codigo) => obtenerMedidor(codigo),

  consultarMedidorRemoto: async (codigo) => medidorDesdeRemoto(codigo, await consultarMedidorRemoto(codigo)),

  guardarMedidor,

  reclamarLectura: reclamarLecturaParaEnvio,

  buscarLecturaRemota: (localId) =>
    buscarLecturaRemotaConFiltros({ localId }, (item) => item.localId === localId),

  buscarLecturaRemotaPorPeriodo: (codigoMedidor, periodo) =>
    buscarLecturaRemotaConFiltros({ codigoMedidor, periodo }, (item) => {
      return item.codigoMedidor === codigoMedidor && item.periodo === periodo;
    }),

  enviarLectura: async (lectura) => {
    const respuesta = await solicitar<unknown>('/lecturas', {
      metodo: 'POST',
      cuerpo: cuerpoLecturaRemota(lectura),
    });
    return parsearLecturaRemota(respuesta);
  },

  actualizarEvaluacion: actualizarEvaluacionLectura,

  marcarEnviada: (localId, idRemoto, fechaEnvio) =>
    marcarLecturaEnviada(localId, idRemoto, fechaEnvio),

  marcarPendiente: marcarLecturaPendiente,

  marcarRequiereRevision: marcarLecturaRequiereRevision,

  ahora: () => new Date().toISOString(),
};

export async function sincronizar(codigoTecnico: string): Promise<ResultadoSincronizacion> {
  return sincronizarPendientes(codigoTecnico, dependencias);
}

export type { LecturaRemota };
