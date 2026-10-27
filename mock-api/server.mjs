#!/usr/bin/env node
/**
 * Servidor de simulación del sistema de oficina de AquaRuta.
 *
 * No tiene dependencias: usa node:http y un archivo JSON. Imita el contrato
 * REST de MockAPI que consumen los servicios de la app y agrega las reglas
 * que permiten demostrar idempotencia y rechazo de duplicados:
 *
 *   GET    /health
 *   GET    /medidores?codigo=...&limit=...
 *   GET    /medidores/:id
 *   GET    /lecturas?localId=...&codigoMedidor=...&periodo=...&limit=...
 *   GET    /lecturas/:id
 *   POST   /lecturas                 -> 201 | 409
 *   PATCH  /lecturas/:id             -> solo para pruebas manuales
 *
 * Uso:
 *   npm run mock          inicia en http://0.0.0.0:4000
 *   npm run mock:reset    reinicia db.json desde seed.json y luego inicia
 *
 * Variables: PORT (4000), HOST (0.0.0.0), MOCK_DELAY_MS (0), MOCK_FAIL_POSTS
 * (número de POST que deben fallar con 500 antes de aceptar; útil para probar
 * reintentos). Los datos viven en mock-api/db.json, ignorado por Git.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTORIO = dirname(fileURLToPath(import.meta.url));
const ARCHIVO_SEED = join(DIRECTORIO, 'seed.json');
const ARCHIVO_DB = join(DIRECTORIO, 'db.json');
const PUERTO = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const RETRASO_MS = Number(process.env.MOCK_DELAY_MS ?? 0);
const FALLOS_POST = Number(process.env.MOCK_FAIL_POSTS ?? 0);

let fallosRestantes = FALLOS_POST;
let datos = cargarDatos();

function cargarDatos() {
  if (!existsSync(ARCHIVO_DB)) {
    const semilla = JSON.parse(readFileSync(ARCHIVO_SEED, 'utf8'));
    writeFileSync(ARCHIVO_DB, JSON.stringify(semilla, null, 2));
    return semilla;
  }
  return JSON.parse(readFileSync(ARCHIVO_DB, 'utf8'));
}

function guardarDatos() {
  writeFileSync(ARCHIVO_DB, JSON.stringify(datos, null, 2));
}

function reiniciarDatos() {
  const semilla = JSON.parse(readFileSync(ARCHIVO_SEED, 'utf8'));
  writeFileSync(ARCHIVO_DB, JSON.stringify(semilla, null, 2));
  datos = semilla;
}

function responder(res, estado, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(estado, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept',
    'Cache-Control': 'no-store',
  });
  res.end(texto);
}

function error(res, estado, codigo, mensaje) {
  responder(res, estado, { codigo, mensaje });
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', (parte) => {
      cuerpo += parte;
      if (cuerpo.length > 1_000_000) {
        reject(new Error('El cuerpo de la petición es demasiado grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (cuerpo.trim().length === 0) return resolve({});
      try {
        resolve(JSON.parse(cuerpo));
      } catch {
        reject(new Error('El cuerpo de la petición no es JSON válido.'));
      }
    });
    req.on('error', reject);
  });
}

function aplicarFiltros(lista, busqueda, campos) {
  let resultado = [...lista];
  for (const campo of campos) {
    const valor = busqueda.get(campo);
    if (valor != null) {
      resultado = resultado.filter((item) => String(item[campo]) === valor);
    }
  }
  const limite = Number(busqueda.get('limit'));
  if (Number.isInteger(limite) && limite > 0) {
    resultado = resultado.slice(0, limite);
  }
  return resultado;
}

function validarLectura(lectura) {
  const errores = [];
  if (typeof lectura.localId !== 'string' || lectura.localId.trim().length === 0) {
    errores.push('localId es obligatorio.');
  }
  if (typeof lectura.codigoMedidor !== 'string' || !/^MED-\d{6}$/.test(lectura.codigoMedidor)) {
    errores.push('codigoMedidor debe cumplir el formato MED- seguido de seis dígitos.');
  }
  if (typeof lectura.periodo !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(lectura.periodo)) {
    errores.push('periodo debe tener el formato YYYY-MM.');
  }
  if (!['normal', 'inaccesible', 'danado'].includes(lectura.tipoEstado)) {
    errores.push('tipoEstado debe ser normal, inaccesible o danado.');
  }
  if (lectura.tipoEstado === 'normal' && typeof lectura.lecturaActual !== 'number') {
    errores.push('Una lectura normal requiere lecturaActual numérica.');
  }
  if (lectura.tipoEstado === 'inaccesible' && lectura.lecturaActual != null) {
    errores.push('Una lectura inaccesible no debe tener lecturaActual.');
  }
  return errores;
}

async function manejar(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const busqueda = url.searchParams;

  if (req.method === 'OPTIONS') {
    responder(res, 204, {});
    return;
  }

  if (req.method === 'GET' && ruta === '/health') {
    responder(res, 200, {
      ok: true,
      servicio: 'aquaruta-mock',
      medidores: datos.medidores.length,
      lecturas: datos.lecturas.length,
    });
    return;
  }

  if (req.method === 'GET' && ruta === '/medidores') {
    responder(
      res,
      200,
      aplicarFiltros(datos.medidores, busqueda, ['codigo', 'sector', 'estado']),
    );
    return;
  }

  const medidorPorId = ruta.match(/^\/medidores\/([^/]+)$/);
  if (req.method === 'GET' && medidorPorId) {
    const medidor = datos.medidores.find((item) => String(item.id) === medidorPorId[1]);
    if (!medidor) {
      error(res, 404, 'NO_ENCONTRADO', 'No existe un medidor con ese id.');
      return;
    }
    responder(res, 200, medidor);
    return;
  }

  if (req.method === 'GET' && ruta === '/lecturas') {
    responder(
      res,
      200,
      aplicarFiltros(datos.lecturas, busqueda, ['localId', 'codigoMedidor', 'periodo', 'codigoTecnico']),
    );
    return;
  }

  const lecturaPorId = ruta.match(/^\/lecturas\/([^/]+)$/);
  if (req.method === 'GET' && lecturaPorId) {
    const lectura = datos.lecturas.find((item) => String(item.id) === lecturaPorId[1]);
    if (!lectura) {
      error(res, 404, 'NO_ENCONTRADO', 'No existe una lectura con ese id.');
      return;
    }
    responder(res, 200, lectura);
    return;
  }

  if (req.method === 'POST' && ruta === '/lecturas') {
    if (fallosRestantes > 0) {
      fallosRestantes -= 1;
      error(
        res,
        500,
        'FALLO_SIMULADO',
        `Fallo simulado del servidor (quedan ${fallosRestantes} antes de aceptar).`,
      );
      return;
    }

    let cuerpo;
    try {
      cuerpo = await leerCuerpo(req);
    } catch (fallo) {
      error(res, 400, 'CUERPO_INVALIDO', fallo.message);
      return;
    }

    const errores = validarLectura(cuerpo);
    if (errores.length > 0) {
      error(res, 400, 'VALIDACION', errores.join(' '));
      return;
    }

    if (datos.lecturas.some((item) => item.localId === cuerpo.localId)) {
      error(
        res,
        409,
        'DUPLICADO_LOCAL_ID',
        'Ya existe una lectura con el mismo localId. El envío anterior sí se registró.',
      );
      return;
    }

    const duplicadoPeriodo = datos.lecturas.find(
      (item) =>
        item.codigoMedidor === cuerpo.codigoMedidor && item.periodo === cuerpo.periodo,
    );
    if (duplicadoPeriodo) {
      error(
        res,
        409,
        'DUPLICADO_PERIODO',
        `El medidor ${cuerpo.codigoMedidor} ya tiene una lectura registrada para ${cuerpo.periodo}.`,
      );
      return;
    }

    const medidor = datos.medidores.find((item) => item.codigo === cuerpo.codigoMedidor);
    const nueva = {
      ...cuerpo,
      id: String(siguienteIdLectura()),
      medidorId: cuerpo.medidorId ?? (medidor ? String(medidor.id) : null),
      fechaRegistro: cuerpo.fechaRegistro ?? new Date().toISOString(),
      creadoEnServidor: new Date().toISOString(),
    };
    datos.lecturas.push(nueva);
    guardarDatos();
    responder(res, 201, nueva);
    return;
  }

  if (req.method === 'PATCH' && lecturaPorId) {
    let cuerpo;
    try {
      cuerpo = await leerCuerpo(req);
    } catch (fallo) {
      error(res, 400, 'CUERPO_INVALIDO', fallo.message);
      return;
    }
    const indice = datos.lecturas.findIndex(
      (item) => String(item.id) === lecturaPorId[1],
    );
    if (indice < 0) {
      error(res, 404, 'NO_ENCONTRADO', 'No existe una lectura con ese id.');
      return;
    }
    const { id, localId, ...cambios } = cuerpo;
    void id;
    void localId;
    datos.lecturas[indice] = { ...datos.lecturas[indice], ...cambios };
    guardarDatos();
    responder(res, 200, datos.lecturas[indice]);
    return;
  }

  error(res, 404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${req.method} ${ruta}.`);
}

function siguienteIdLectura() {
  const maximo = datos.lecturas.reduce((mayor, item) => {
    const valor = Number(item.id);
    return Number.isFinite(valor) ? Math.max(mayor, valor) : mayor;
  }, 0);
  return maximo + 1;
}

const servidor = createServer((req, res) => {
  const inicio = Date.now();
  const metodo = req.method ?? 'GET';
  const ruta = req.url ?? '/';

  const terminar = () => {
    const duracion = Date.now() - inicio;
    console.log(`${metodo} ${ruta} -> ${res.statusCode} (${duracion} ms)`);
  };
  res.on('finish', terminar);

  const ejecutar = RETRASO_MS > 0
    ? () => setTimeout(() => void manejar(req, res).catch((fallo) => {
        console.error(fallo);
        if (!res.headersSent) error(res, 500, 'ERROR_INTERNO', fallo.message);
      }), RETRASO_MS)
    : () => void manejar(req, res).catch((fallo) => {
        console.error(fallo);
        if (!res.headersSent) error(res, 500, 'ERROR_INTERNO', fallo.message);
      });

  ejecutar();
});

if (process.argv.includes('--reset')) {
  reiniciarDatos();
  fallosRestantes = FALLOS_POST;
  console.log('Datos reiniciados desde seed.json.');
}

servidor.listen(PUERTO, HOST, () => {
  console.log('');
  console.log('AquaRuta · sistema de oficina simulado');
  console.log(`  Escucha en http://${HOST}:${PUERTO}`);
  console.log(`  Emulador Android: http://10.0.2.2:${PUERTO}`);
  console.log(`  Teléfono real:    http://<IP-LAN-de-tu-PC>:${PUERTO}`);
  console.log(`  Salud:            http://localhost:${PUERTO}/health`);
  if (FALLOS_POST > 0) {
    console.log(`  Modo de prueba:   los próximos ${FALLOS_POST} POST fallarán con 500.`);
  }
  console.log('  Detén el servidor con Ctrl+C.');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\nCerrando el servidor de simulación.');
  servidor.close(() => process.exit(0));
});
