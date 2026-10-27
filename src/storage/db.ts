import * as SQLite from 'expo-sqlite';

const NOMBRE_BASE = 'aquaruta.db';
const VERSION_ESQUEMA = 1;

let basePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!basePromise) {
    basePromise = abrirBase();
  }
  return basePromise;
}

async function abrirBase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(NOMBRE_BASE);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrar(db);
  return db;
}

async function migrar(db: SQLite.SQLiteDatabase): Promise<void> {
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versionActual = fila?.user_version ?? 0;

  if (versionActual >= VERSION_ESQUEMA) return;

  if (versionActual < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sesion (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          codigo_tecnico TEXT NOT NULL,
          nombre TEXT NOT NULL,
          zona TEXT NOT NULL,
          iniciada_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS medidores_cache (
          codigo TEXT PRIMARY KEY NOT NULL,
          id_remoto TEXT,
          direccion TEXT NOT NULL,
          sector TEXT NOT NULL,
          numero_cuenta TEXT NOT NULL,
          estado TEXT NOT NULL,
          ultima_lectura REAL,
          fecha_ultima_lectura TEXT,
          consumo_promedio_mensual REAL,
          consultado_en TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lecturas (
          local_id TEXT PRIMARY KEY NOT NULL,
          id_remoto TEXT,
          codigo_medidor TEXT NOT NULL,
          medidor_id TEXT,
          codigo_tecnico TEXT NOT NULL,
          fecha_registro TEXT NOT NULL,
          periodo TEXT NOT NULL,
          tipo_estado TEXT NOT NULL CHECK (tipo_estado IN ('normal', 'inaccesible', 'danado')),
          lectura_actual REAL,
          ultima_lectura_referencia REAL,
          consumo_calculado REAL,
          consumo_promedio_referencia REAL,
          motivo_inaccesible TEXT,
          descripcion_dano TEXT,
          foto_uri TEXT,
          foto_url TEXT,
          confirmacion_revision INTEGER NOT NULL DEFAULT 0 CHECK (confirmacion_revision IN (0, 1)),
          estado_verificacion TEXT NOT NULL CHECK (
            estado_verificacion IN ('pendiente', 'verificada', 'anomalia_confirmada', 'anomalia_pendiente', 'no_aplica')
          ),
          estado_envio TEXT NOT NULL CHECK (
            estado_envio IN ('pendiente', 'enviando', 'enviado', 'requiere_revision')
          ),
          intentos_envio INTEGER NOT NULL DEFAULT 0,
          fecha_envio TEXT,
          mensaje_error TEXT,
          creado_en TEXT NOT NULL,
          actualizado_en TEXT NOT NULL,
          UNIQUE (codigo_medidor, periodo)
        );

        CREATE INDEX IF NOT EXISTS idx_lecturas_estado_envio ON lecturas (estado_envio);
        CREATE INDEX IF NOT EXISTS idx_lecturas_medidor_periodo ON lecturas (codigo_medidor, periodo);

        CREATE TABLE IF NOT EXISTS borradores (
          local_id TEXT PRIMARY KEY NOT NULL,
          codigo_medidor TEXT NOT NULL,
          codigo_tecnico TEXT NOT NULL,
          paso INTEGER NOT NULL DEFAULT 1 CHECK (paso BETWEEN 1 AND 3),
          datos_json TEXT NOT NULL,
          foto_uri TEXT,
          lectura_local_id TEXT,
          creado_en TEXT NOT NULL,
          actualizado_en TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_borradores_tecnico ON borradores (codigo_tecnico);

        CREATE TABLE IF NOT EXISTS configuracion (
          clave TEXT PRIMARY KEY NOT NULL,
          valor TEXT NOT NULL
        );
      `);
      await db.execAsync(`PRAGMA user_version = ${VERSION_ESQUEMA};`);
    });
  }
}

/** Solo para pruebas manuales de desarrollo. No se usa desde la interfaz. */
export async function borrarBaseLocal(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM borradores;
    DELETE FROM lecturas;
    DELETE FROM medidores_cache;
    DELETE FROM sesion;
    DELETE FROM configuracion;
  `);
}
