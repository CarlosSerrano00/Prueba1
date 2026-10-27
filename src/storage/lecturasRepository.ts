import type {
  EstadoEnvio,
  EstadoVerificacion,
  FiltroLecturas,
  Lectura,
  ResumenLecturas,
} from '../types/models';
import { getDb } from './db';
import { mapLectura, type LecturaRow } from './mappers';

const COLUMNAS = `local_id, id_remoto, codigo_medidor, medidor_id, codigo_tecnico,
  fecha_registro, periodo, tipo_estado, lectura_actual, ultima_lectura_referencia,
  consumo_calculado, consumo_promedio_referencia, motivo_inaccesible,
  descripcion_dano, foto_uri, foto_url, confirmacion_revision,
  estado_verificacion, estado_envio, intentos_envio, fecha_envio,
  mensaje_error, creado_en, actualizado_en`;

type Db = Awaited<ReturnType<typeof getDb>>;

function valoresLectura(lectura: Lectura): (string | number | null)[] {
  return [
    lectura.localId,
    lectura.idRemoto,
    lectura.codigoMedidor,
    lectura.medidorId,
    lectura.codigoTecnico,
    lectura.fechaRegistro,
    lectura.periodo,
    lectura.tipoEstado,
    lectura.lecturaActual,
    lectura.ultimaLecturaReferencia,
    lectura.consumoCalculado,
    lectura.consumoPromedioReferencia,
    lectura.motivoInaccesible,
    lectura.descripcionDano,
    lectura.fotoUri,
    lectura.fotoUrl,
    lectura.confirmacionRevision ? 1 : 0,
    lectura.estadoVerificacion,
    lectura.estadoEnvio,
    lectura.intentosEnvio,
    lectura.fechaEnvio,
    lectura.mensajeError,
    lectura.creadoEn,
    lectura.actualizadoEn,
  ];
}

async function insertarLectura(db: Db, lectura: Lectura): Promise<void> {
  await db.runAsync(
    `INSERT INTO lecturas (${COLUMNAS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(local_id) DO UPDATE SET
       id_remoto = excluded.id_remoto,
       medidor_id = excluded.medidor_id,
       fecha_registro = excluded.fecha_registro,
       tipo_estado = excluded.tipo_estado,
       lectura_actual = excluded.lectura_actual,
       ultima_lectura_referencia = excluded.ultima_lectura_referencia,
       consumo_calculado = excluded.consumo_calculado,
       consumo_promedio_referencia = excluded.consumo_promedio_referencia,
       motivo_inaccesible = excluded.motivo_inaccesible,
       descripcion_dano = excluded.descripcion_dano,
       foto_uri = excluded.foto_uri,
       foto_url = excluded.foto_url,
       confirmacion_revision = excluded.confirmacion_revision,
       estado_verificacion = excluded.estado_verificacion,
       estado_envio = excluded.estado_envio,
       intentos_envio = excluded.intentos_envio,
       fecha_envio = excluded.fecha_envio,
       mensaje_error = excluded.mensaje_error,
       actualizado_en = excluded.actualizado_en`,
    ...valoresLectura(lectura),
  );
}

export async function guardarLectura(lectura: Lectura): Promise<void> {
  const db = await getDb();
  await insertarLectura(db, lectura);
}

/**
 * Inserta la lectura y elimina el borrador en una sola transacción.
 * Así no queda un borrador "fantasma" si la app se cierra en medio del guardado.
 */
export async function guardarLecturaYDescartarBorrador(
  lectura: Lectura,
  borradorId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await insertarLectura(db, lectura);
    if (borradorId) {
      await db.runAsync('DELETE FROM borradores WHERE local_id = ?', borradorId);
    }
  });
}

export async function obtenerLectura(localId: string): Promise<Lectura | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas WHERE local_id = ?`,
    localId,
  );
  return fila ? mapLectura(fila) : null;
}

export async function obtenerLecturaPorMedidorPeriodo(
  codigoMedidor: string,
  periodo: string,
): Promise<Lectura | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas
     WHERE codigo_medidor = ? AND periodo = ?`,
    codigoMedidor,
    periodo,
  );
  return fila ? mapLectura(fila) : null;
}

export async function listarLecturas(
  codigoTecnico: string,
  filtro: FiltroLecturas = 'todas',
): Promise<Lectura[]> {
  const db = await getDb();
  let condicion = '';
  if (filtro === 'pendientes') {
    condicion = `AND estado_envio IN ('pendiente', 'enviando', 'requiere_revision')`;
  } else if (filtro === 'enviadas') {
    condicion = `AND estado_envio = 'enviado'`;
  }

  const filas = await db.getAllAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas
     WHERE codigo_tecnico = ? ${condicion}
     ORDER BY fecha_registro DESC, creado_en DESC`,
    codigoTecnico,
  );
  return filas.map(mapLectura);
}

export async function listarUltimasLecturas(
  codigoTecnico: string,
  limite = 3,
): Promise<Lectura[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas
     WHERE codigo_tecnico = ?
     ORDER BY fecha_registro DESC, creado_en DESC LIMIT ?`,
    codigoTecnico,
    limite,
  );
  return filas.map(mapLectura);
}

export async function listarPendientesEnvio(codigoTecnico: string): Promise<Lectura[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas
     WHERE codigo_tecnico = ? AND estado_envio = 'pendiente'
     ORDER BY creado_en ASC`,
    codigoTecnico,
  );
  return filas.map(mapLectura);
}

export async function obtenerResumenLecturas(codigoTecnico: string): Promise<ResumenLecturas> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{
    pendientes: number;
    revision: number;
    enviadas: number;
    total: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN estado_envio IN ('pendiente', 'enviando') THEN 1 ELSE 0 END), 0) AS pendientes,
       COALESCE(SUM(CASE WHEN estado_envio = 'requiere_revision' THEN 1 ELSE 0 END), 0) AS revision,
       COALESCE(SUM(CASE WHEN estado_envio = 'enviado' THEN 1 ELSE 0 END), 0) AS enviadas,
       COUNT(*) AS total
     FROM lecturas
     WHERE codigo_tecnico = ?`,
    codigoTecnico,
  );

  return {
    pendientes: fila?.pendientes ?? 0,
    revision: fila?.revision ?? 0,
    enviadas: fila?.enviadas ?? 0,
    total: fila?.total ?? 0,
  };
}

export async function reclamarLecturaParaEnvio(localId: string): Promise<boolean> {
  const db = await getDb();
  const resultado = await db.runAsync(
    `UPDATE lecturas
     SET estado_envio = 'enviando',
         intentos_envio = intentos_envio + 1,
         mensaje_error = NULL,
         actualizado_en = ?
     WHERE local_id = ? AND estado_envio = 'pendiente'`,
    new Date().toISOString(),
    localId,
  );
  return resultado.changes > 0;
}

export async function marcarLecturaEnviada(
  localId: string,
  idRemoto: string | null,
  fechaEnvio: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE lecturas
     SET estado_envio = 'enviado',
         id_remoto = COALESCE(?, id_remoto),
         fecha_envio = ?,
         mensaje_error = NULL,
         actualizado_en = ?
     WHERE local_id = ?`,
    idRemoto,
    fechaEnvio,
    fechaEnvio,
    localId,
  );
}

export async function marcarLecturaPendiente(localId: string, mensaje: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE lecturas
     SET estado_envio = 'pendiente',
         fecha_envio = NULL,
         mensaje_error = ?,
         actualizado_en = ?
     WHERE local_id = ?`,
    mensaje,
    new Date().toISOString(),
    localId,
  );
}

export async function marcarLecturaRequiereRevision(
  localId: string,
  mensaje: string,
  estadoVerificacion?: EstadoVerificacion,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE lecturas
     SET estado_envio = 'requiere_revision',
         estado_verificacion = COALESCE(?, estado_verificacion),
         fecha_envio = NULL,
         mensaje_error = ?,
         actualizado_en = ?
     WHERE local_id = ?`,
    estadoVerificacion ?? null,
    mensaje,
    new Date().toISOString(),
    localId,
  );
}

export async function actualizarEvaluacionLectura(
  localId: string,
  datos: {
    ultimaLecturaReferencia: number | null;
    consumoCalculado: number | null;
    consumoPromedioReferencia: number | null;
    estadoVerificacion: EstadoVerificacion;
  },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE lecturas
     SET ultima_lectura_referencia = ?,
         consumo_calculado = ?,
         consumo_promedio_referencia = ?,
         estado_verificacion = ?,
         actualizado_en = ?
     WHERE local_id = ?`,
    datos.ultimaLecturaReferencia,
    datos.consumoCalculado,
    datos.consumoPromedioReferencia,
    datos.estadoVerificacion,
    new Date().toISOString(),
    localId,
  );
}

/**
 * Al corregir una lectura pendiente se conserva su identidad local
 * (local_id, medidor, técnico, periodo y fecha de creación), pero se
 * reemplazan los datos capturados y vuelve a la cola de envío.
 */
export async function actualizarLecturaEditada(lectura: Lectura): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE lecturas SET
       tipo_estado = ?,
       lectura_actual = ?,
       ultima_lectura_referencia = ?,
       consumo_calculado = ?,
       consumo_promedio_referencia = ?,
       motivo_inaccesible = ?,
       descripcion_dano = ?,
       foto_uri = ?,
       foto_url = ?,
       confirmacion_revision = ?,
       estado_verificacion = ?,
       estado_envio = 'pendiente',
       intentos_envio = 0,
       fecha_envio = NULL,
       mensaje_error = NULL,
       actualizado_en = ?
     WHERE local_id = ?`,
    lectura.tipoEstado,
    lectura.lecturaActual,
    lectura.ultimaLecturaReferencia,
    lectura.consumoCalculado,
    lectura.consumoPromedioReferencia,
    lectura.motivoInaccesible,
    lectura.descripcionDano,
    lectura.fotoUri,
    lectura.fotoUrl,
    lectura.confirmacionRevision ? 1 : 0,
    lectura.estadoVerificacion,
    lectura.actualizadoEn,
    lectura.localId,
  );
}

/**
 * Si la app murió en medio de un POST, la fila puede haber quedado en
 * `enviando`. Al abrir se devuelve a la cola; la comprobación por localId
 * evita crear un duplicado.
 */
export async function resetearEnviosInterrumpidos(): Promise<number> {
  const db = await getDb();
  const resultado = await db.runAsync(
    `UPDATE lecturas
     SET estado_envio = 'pendiente',
         mensaje_error = 'El envío se interrumpió. Se reintentará automáticamente.',
         actualizado_en = ?
     WHERE estado_envio = 'enviando'`,
    new Date().toISOString(),
  );
  return resultado.changes;
}

export async function contarLecturasConFoto(uri: string): Promise<number> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM lecturas WHERE foto_uri = ?',
    uri,
  );
  return fila?.total ?? 0;
}

/** Solo se usa en utilidades de mantenimiento y pruebas manuales. */
export async function listarTodasLasLecturas(): Promise<Lectura[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<LecturaRow>(
    `SELECT ${COLUMNAS} FROM lecturas ORDER BY creado_en DESC`,
  );
  return filas.map(mapLectura);
}

export type { EstadoEnvio };
