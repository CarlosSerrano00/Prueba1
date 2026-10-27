import type { Sesion } from '../types/models';
import { getDb } from './db';

interface SesionRow {
  codigo_tecnico: string;
  nombre: string;
  zona: string;
  iniciada_en: string;
}

/**
 * La sesión se guarda en una sola fila (id = 1). No se guarda la clave:
 * la app solo necesita recordar quién inició sesión hasta que cierre sesión.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<SesionRow>(
    'SELECT codigo_tecnico, nombre, zona, iniciada_en FROM sesion WHERE id = 1',
  );

  if (!fila) return null;

  return {
    codigoTecnico: fila.codigo_tecnico,
    nombre: fila.nombre,
    zona: fila.zona,
    iniciadaEn: fila.iniciada_en,
  };
}

export async function guardarSesion(sesion: Sesion): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sesion (id, codigo_tecnico, nombre, zona, iniciada_en)
     VALUES (1, ?, ?, ?, ?)`,
    sesion.codigoTecnico,
    sesion.nombre,
    sesion.zona,
    sesion.iniciadaEn,
  );
}

export async function borrarSesion(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sesion');
}
