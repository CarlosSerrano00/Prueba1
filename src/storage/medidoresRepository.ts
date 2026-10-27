import type { Medidor } from '../types/models';
import { getDb } from './db';
import { mapMedidor, type MedidorRow } from './mappers';

const COLUMNAS = `codigo, id_remoto, direccion, sector, numero_cuenta, estado,
  ultima_lectura, fecha_ultima_lectura, consumo_promedio_mensual, consultado_en`;

export async function guardarMedidor(medidor: Medidor): Promise<void> {
  const db = await getDb();
  await guardarMedidorConDb(db, medidor);
}

async function guardarMedidorConDb(
  db: Awaited<ReturnType<typeof getDb>>,
  medidor: Medidor,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO medidores_cache (${COLUMNAS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(codigo) DO UPDATE SET
       id_remoto = excluded.id_remoto,
       direccion = excluded.direccion,
       sector = excluded.sector,
       numero_cuenta = excluded.numero_cuenta,
       estado = excluded.estado,
       ultima_lectura = excluded.ultima_lectura,
       fecha_ultima_lectura = excluded.fecha_ultima_lectura,
       consumo_promedio_mensual = excluded.consumo_promedio_mensual,
       consultado_en = excluded.consultado_en`,
    medidor.codigo,
    medidor.idRemoto,
    medidor.direccion,
    medidor.sector,
    medidor.numeroCuenta,
    medidor.estado,
    medidor.ultimaLectura,
    medidor.fechaUltimaLectura,
    medidor.consumoPromedioMensual,
    medidor.consultadoEn,
  );
}

export async function guardarMedidores(medidores: Medidor[]): Promise<void> {
  if (medidores.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const medidor of medidores) {
      await guardarMedidorConDb(db, medidor);
    }
  });
}

export async function obtenerMedidor(codigo: string): Promise<Medidor | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<MedidorRow>(
    `SELECT ${COLUMNAS} FROM medidores_cache WHERE codigo = ?`,
    codigo,
  );
  return fila ? mapMedidor(fila) : null;
}

export async function listarMedidoresRecientes(limite = 5): Promise<Medidor[]> {
  const db = await getDb();

  // No hay una tabla de "medidores por técnico". Se muestran los últimos
  // consultados en el dispositivo, que es el comportamiento útil en campo.
  const filas = await db.getAllAsync<MedidorRow>(
    `SELECT ${COLUMNAS} FROM medidores_cache ORDER BY consultado_en DESC LIMIT ?`,
    limite,
  );
  return filas.map(mapMedidor);
}

export async function contarMedidores(): Promise<number> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM medidores_cache',
  );
  return fila?.total ?? 0;
}
