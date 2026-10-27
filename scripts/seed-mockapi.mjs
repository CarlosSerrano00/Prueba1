#!/usr/bin/env node
/**
 * Carga el seed de demostración en MockAPI de forma idempotente.
 *
 * - Si un medidor ya existe por `codigo`, no lo duplica.
 * - Si una lectura ya existe por `localId`, no la duplica.
 * - Los ids remotos de los medidores se resuelven después de crearlos y se
 *   usan para completar `medidorId` en las lecturas.
 *
 * Uso:
 *   npm run seed:mockapi
 *   $env:MOCKAPI_URL="https://..."; npm run seed:mockapi
 *   npm run seed:mockapi -- --dry-run
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const SEMILLA = join(RAIZ, 'mock-api', 'seed.json');
const URL_BASE = (process.env.MOCKAPI_URL ?? 'https://6ae0a4a2be3bc8fead97a3b2.mockapi.io').replace(
  /\/+$/,
  '',
);
const DRY_RUN = process.argv.includes('--dry-run');

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    ...opciones,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opciones.headers ?? {}),
    },
  });

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }

  if (!respuesta.ok) {
    const detalle = typeof datos === 'string' ? datos : JSON.stringify(datos);
    throw new Error(`${opciones.method ?? 'GET'} ${ruta} → HTTP ${respuesta.status}: ${detalle}`);
  }

  return datos;
}

async function listar(recurso) {
  const datos = await pedir(`/${recurso}`);
  if (!Array.isArray(datos)) {
    throw new Error(`El recurso /${recurso} no devolvió una lista. Revisa su configuración.`);
  }
  return datos;
}

function sinId(registro) {
  const { id: _id, ...resto } = registro;
  return resto;
}

function resumen(medidor) {
  return `${medidor.codigo} (id remoto: ${medidor.id})`;
}

async function principal() {
  console.log(`MockAPI: ${URL_BASE}`);
  console.log(`Semilla:  ${SEMILLA}`);
  if (DRY_RUN) console.log('Modo simulación: no se escribirá nada.\n');

  const semilla = JSON.parse(await readFile(SEMILLA, 'utf8'));
  const medidoresSemilla = Array.isArray(semilla.medidores) ? semilla.medidores : [];
  const lecturasSemilla = Array.isArray(semilla.lecturas) ? semilla.lecturas : [];

  const medidoresRemotos = await listar('medidores');
  const lecturasRemotas = await listar('lecturas');
  console.log(`Existentes: ${medidoresRemotos.length} medidores, ${lecturasRemotas.length} lecturas.\n`);

  const medidoresPorCodigo = new Map(medidoresRemotos.map((m) => [String(m.codigo), m]));
  const lecturasPorLocalId = new Map(lecturasRemotas.map((l) => [String(l.localId), l]));
  const idsPorCodigo = new Map();

  let creadosMedidores = 0;
  for (const medidor of medidoresSemilla) {
    const existente = medidoresPorCodigo.get(String(medidor.codigo));
    if (existente) {
      idsPorCodigo.set(String(medidor.codigo), String(existente.id));
      console.log(`= Medidor existente: ${resumen(existente)}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`+ Crearía medidor: ${medidor.codigo}`);
      continue;
    }

    const creado = await pedir('/medidores', {
      method: 'POST',
      body: JSON.stringify(sinId(medidor)),
    });
    if (!creado || creado.id == null) {
      throw new Error(`MockAPI no devolvió id al crear el medidor ${medidor.codigo}.`);
    }
    idsPorCodigo.set(String(medidor.codigo), String(creado.id));
    medidoresPorCodigo.set(String(creado.codigo), creado);
    creadosMedidores += 1;
    console.log(`+ Medidor creado: ${resumen(creado)}`);
  }

  let creadasLecturas = 0;
  for (const lectura of lecturasSemilla) {
    const existente = lecturasPorLocalId.get(String(lectura.localId));
    if (existente) {
      console.log(`= Lectura existente: ${lectura.localId}`);
      continue;
    }

    const medidorId =
      idsPorCodigo.get(String(lectura.codigoMedidor)) ?? String(lectura.medidorId ?? '');
    if (!medidorId) {
      throw new Error(
        `No se pudo resolver medidorId para ${lectura.codigoMedidor} (${lectura.localId}).`,
      );
    }

    if (DRY_RUN) {
      console.log(`+ Crearía lectura: ${lectura.localId} → medidor ${medidorId}`);
      continue;
    }

    const creada = await pedir('/lecturas', {
      method: 'POST',
      body: JSON.stringify({
        ...sinId(lectura),
        medidorId,
      }),
    });
    lecturasPorLocalId.set(String(creada.localId), creada);
    creadasLecturas += 1;
    console.log(`+ Lectura creada: ${creada.localId} (id remoto: ${creada.id})`);
  }

  console.log(
    `\nListo. Medidores nuevos: ${creadosMedidores}; lecturas nuevas: ${creadasLecturas}.`,
  );
  if (DRY_RUN) console.log('No se realizaron cambios porque se usó --dry-run.');
}

principal().catch((error) => {
  console.error(`\nError al cargar MockAPI:\n${error.message}`);
  process.exitCode = 1;
});
