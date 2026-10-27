import type { Borrador } from '../types/models';
import { getDb } from './db';
import { mapBorrador, type BorradorRow } from './mappers';

const COLUMNAS = `local_id, codigo_medidor, codigo_tecnico, paso, datos_json,
  foto_uri, lectura_local_id, creado_en, actualizado_en`;

export async function guardarBorrador(borrador: Borrador): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO borradores (${COLUMNAS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(local_id) DO UPDATE SET
       codigo_medidor = excluded.codigo_medidor,
       codigo_tecnico = excluded.codigo_tecnico,
       paso = excluded.paso,
       datos_json = excluded.datos_json,
       foto_uri = excluded.foto_uri,
       lectura_local_id = excluded.lectura_local_id,
       actualizado_en = excluded.actualizado_en`,
    borrador.localId,
    borrador.codigoMedidor,
    borrador.codigoTecnico,
    borrador.paso,
    JSON.stringify(borrador.datos),
    borrador.fotoUri,
    borrador.lecturaLocalId,
    borrador.creadoEn,
    borrador.actualizadoEn,
  );
}

export async function obtenerBorrador(localId: string): Promise<Borrador | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<BorradorRow>(
    `SELECT ${COLUMNAS} FROM borradores WHERE local_id = ?`,
    localId,
  );
  return fila ? mapBorrador(fila) : null;
}

/**
 * Política de un solo borrador activo por técnico. Si existieran varios
 * por versiones anteriores, se devuelve el más reciente.
 */
export async function obtenerBorradorActivo(codigoTecnico: string): Promise<Borrador | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<BorradorRow>(
    `SELECT ${COLUMNAS} FROM borradores
     WHERE codigo_tecnico = ?
     ORDER BY actualizado_en DESC LIMIT 1`,
    codigoTecnico,
  );
  return fila ? mapBorrador(fila) : null;
}

export async function listarBorradores(codigoTecnico: string): Promise<Borrador[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<BorradorRow>(
    `SELECT ${COLUMNAS} FROM borradores
     WHERE codigo_tecnico = ?
     ORDER BY actualizado_en DESC`,
    codigoTecnico,
  );
  return filas.map(mapBorrador);
}

export async function eliminarBorrador(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM borradores WHERE local_id = ?', localId);
}

export async function contarBorradores(codigoTecnico: string): Promise<number> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM borradores WHERE codigo_tecnico = ?',
    codigoTecnico,
  );
  return fila?.total ?? 0;
}

export async function contarBorradoresConFoto(uri: string): Promise<number> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM borradores WHERE foto_uri = ?',
    uri,
  );
  return fila?.total ?? 0;
}
