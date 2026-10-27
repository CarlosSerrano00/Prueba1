import type { Borrador, DatosFormulario } from '../types/models';
import { DATOS_FORMULARIO_VACIOS } from '../types/models';
import {
  contarBorradores,
  eliminarBorrador as eliminarBorradorDb,
  guardarBorrador as guardarBorradorDb,
  listarBorradores,
  obtenerBorrador,
  obtenerBorradorActivo,
} from '../storage/borradoresRepository';
import { fechaLocalISO } from '../utils/fechas';
import { generarLocalId } from '../utils/id';
import { eliminarFotoSiHuerfana } from './fotoService';

export interface ParametrosCrearBorrador {
  codigoMedidor: string;
  codigoTecnico: string;
  datos?: DatosFormulario;
  fotoUri?: string | null;
  paso?: 1 | 2 | 3;
  lecturaLocalId?: string | null;
}

export function crearBorradorEnMemoria(parametros: ParametrosCrearBorrador): Borrador {
  const ahora = new Date().toISOString();
  return {
    localId: generarLocalId('bor'),
    codigoMedidor: parametros.codigoMedidor,
    codigoTecnico: parametros.codigoTecnico,
    paso: parametros.paso ?? 1,
    datos: parametros.datos ?? {
      ...DATOS_FORMULARIO_VACIOS,
      fechaRegistro: fechaLocalISO(),
    },
    fotoUri: parametros.fotoUri ?? null,
    lecturaLocalId: parametros.lecturaLocalId ?? null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

export async function guardarBorrador(borrador: Borrador): Promise<Borrador> {
  const actualizado: Borrador = { ...borrador, actualizadoEn: new Date().toISOString() };
  await guardarBorradorDb(actualizado);
  return actualizado;
}

export async function obtenerBorradorPorId(localId: string): Promise<Borrador | null> {
  return obtenerBorrador(localId);
}

export async function obtenerBorradorDeTecnico(codigoTecnico: string): Promise<Borrador | null> {
  return obtenerBorradorActivo(codigoTecnico);
}

export async function listarBorradoresDeTecnico(codigoTecnico: string): Promise<Borrador[]> {
  return listarBorradores(codigoTecnico);
}

export async function contarBorradoresDeTecnico(codigoTecnico: string): Promise<number> {
  return contarBorradores(codigoTecnico);
}

export async function descartarBorrador(localId: string): Promise<void> {
  const borrador = await obtenerBorrador(localId);
  await eliminarBorradorDb(localId);
  if (borrador?.fotoUri) {
    await eliminarFotoSiHuerfana(borrador.fotoUri);
  }
}
