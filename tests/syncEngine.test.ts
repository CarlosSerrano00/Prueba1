import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError } from '../src/services/errors';
import {
  sincronizarPendientes,
  type ResultadoSincronizacion,
  type SyncDependencias,
} from '../src/services/syncEngine';
import type {
  EstadoVerificacion,
  Lectura,
  LecturaRemota,
  Medidor,
} from '../src/types/models';

const MEDIDOR: Medidor = {
  idRemoto: '1',
  codigo: 'MED-100001',
  direccion: 'Av. Occidental 1234',
  sector: 'Nono',
  numeroCuenta: 'CTA-100001',
  estado: 'activo',
  ultimaLectura: 100,
  fechaUltimaLectura: '2026-09-20',
  consumoPromedioMensual: 20,
  consultadoEn: '2026-10-01T10:00:00.000Z',
};

function crearLectura(parcial: Partial<Lectura> = {}): Lectura {
  return {
    localId: 'lec_prueba_0000000000000001',
    idRemoto: null,
    codigoMedidor: 'MED-100001',
    medidorId: '1',
    codigoTecnico: 'TEC-001',
    fechaRegistro: '2026-10-26T12:00:00.000Z',
    periodo: '2026-10',
    tipoEstado: 'normal',
    lecturaActual: 120,
    ultimaLecturaReferencia: 100,
    consumoCalculado: 20,
    consumoPromedioReferencia: 20,
    motivoInaccesible: null,
    descripcionDano: null,
    fotoUri: null,
    fotoUrl: null,
    confirmacionRevision: false,
    estadoVerificacion: 'verificada',
    estadoEnvio: 'pendiente',
    intentosEnvio: 0,
    fechaEnvio: null,
    mensajeError: null,
    creadoEn: '2026-10-26T12:00:00.000Z',
    actualizadoEn: '2026-10-26T12:00:00.000Z',
    ...parcial,
  };
}

interface OpcionesEscenario {
  lectura?: Partial<Lectura>;
  medidorLocal?: Medidor | null;
  remotoMedidor?: Medidor | null;
  fallarPostAntes?: boolean;
  fallarPostDespues?: boolean;
  conflictoPost?: boolean;
  error500Antes?: boolean;
  errorRedAlConsultarMedidor?: boolean;
}

function crearEscenario(opciones: OpcionesEscenario = {}) {
  const lectura = crearLectura(opciones.lectura);
  const medidorLocal = opciones.medidorLocal === undefined ? MEDIDOR : opciones.medidorLocal;
  const remotas: LecturaRemota[] = [];
  let posts = 0;
  let busquedasRemotas = 0;
  let ultimaEvaluacion: {
    estadoVerificacion: EstadoVerificacion;
    consumoCalculado: number | null;
  } | null = null;
  let medidorGuardado: Medidor | null = null;

  const deps: SyncDependencias = {
    listarPendientes: async (codigoTecnico) =>
      lectura.codigoTecnico === codigoTecnico && lectura.estadoEnvio === 'pendiente'
        ? [lectura]
        : [],

    obtenerMedidor: async (codigo) =>
      medidorLocal && medidorLocal.codigo === codigo ? medidorLocal : null,

    consultarMedidorRemoto: async () => {
      if (opciones.errorRedAlConsultarMedidor) {
        throw new ApiError('red', 'No se pudo conectar con el sistema de oficina.');
      }
      return opciones.remotoMedidor ?? null;
    },

    guardarMedidor: async (medidor) => {
      medidorGuardado = medidor;
    },

    reclamarLectura: async (localId) => {
      if (localId !== lectura.localId || lectura.estadoEnvio !== 'pendiente') return false;
      lectura.estadoEnvio = 'enviando';
      lectura.intentosEnvio += 1;
      return true;
    },

    buscarLecturaRemota: async (localId) => {
      busquedasRemotas += 1;
      return remotas.find((item) => item.localId === localId) ?? null;
    },

    enviarLectura: async (lecturaEnviar) => {
      posts += 1;
      if (opciones.error500Antes) {
        throw new ApiError('http', 'Fallo simulado del servidor.', 500);
      }
      if (opciones.fallarPostAntes) {
        throw new ApiError('red', 'Se perdió la conexión antes de enviar.');
      }
      if (opciones.conflictoPost) {
        throw new ApiError(
          'http',
          'Ya existe una lectura con el mismo localId.',
          409,
          { codigo: 'DUPLICADO_LOCAL_ID' },
        );
      }
      const remota: LecturaRemota = {
        id: String(remotas.length + 1),
        localId: lecturaEnviar.localId,
        medidorId: lecturaEnviar.medidorId,
        codigoMedidor: lecturaEnviar.codigoMedidor,
        codigoTecnico: lecturaEnviar.codigoTecnico,
        fechaRegistro: lecturaEnviar.fechaRegistro,
        periodo: lecturaEnviar.periodo,
        tipoEstado: lecturaEnviar.tipoEstado,
        lecturaActual: lecturaEnviar.lecturaActual,
        estadoVerificacion: lecturaEnviar.estadoVerificacion,
      };
      remotas.push(remota);
      if (opciones.fallarPostDespues) {
        throw new ApiError('red', 'La respuesta se perdió después de guardar.');
      }
      return remota;
    },

    actualizarEvaluacion: async (_localId, datos) => {
      ultimaEvaluacion = {
        estadoVerificacion: datos.estadoVerificacion,
        consumoCalculado: datos.consumoCalculado,
      };
    },

    marcarEnviada: async (localId, idRemoto, fechaEnvio) => {
      assert.equal(localId, lectura.localId);
      lectura.estadoEnvio = 'enviado';
      lectura.idRemoto = idRemoto;
      lectura.fechaEnvio = fechaEnvio;
      lectura.mensajeError = null;
    },

    marcarPendiente: async (_localId, mensaje) => {
      lectura.estadoEnvio = 'pendiente';
      lectura.mensajeError = mensaje;
    },

    marcarRequiereRevision: async (_localId, mensaje, estadoVerificacion) => {
      lectura.estadoEnvio = 'requiere_revision';
      lectura.mensajeError = mensaje;
      if (estadoVerificacion) lectura.estadoVerificacion = estadoVerificacion;
    },

    ahora: () => '2026-10-26T12:30:00.000Z',
  };

  return {
    deps,
    lectura,
    remotas,
    get posts() {
      return posts;
    },
    get busquedasRemotas() {
      return busquedasRemotas;
    },
    get ultimaEvaluacion() {
      return ultimaEvaluacion;
    },
    get medidorGuardado() {
      return medidorGuardado;
    },
  };
}

async function ejecutar(escenario: ReturnType<typeof crearEscenario>): Promise<ResultadoSincronizacion> {
  return sincronizarPendientes('TEC-001', escenario.deps);
}

describe('R9 - sincronización idempotente', () => {
  it('envía una lectura válida y la marca como enviada solo tras la respuesta', async () => {
    const escenario = crearEscenario();
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.enviadas, 1);
    assert.equal(resultado.errores, 0);
    assert.equal(resultado.revision, 0);
    assert.equal(escenario.posts, 1);
    assert.equal(escenario.remotas.length, 1);
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
    assert.equal(escenario.lectura.idRemoto, '1');
    assert.equal(escenario.lectura.fechaEnvio, '2026-10-26T12:30:00.000Z');
  });

  it('no duplica si el POST se guardó pero la respuesta se perdió', async () => {
    const escenario = crearEscenario({ fallarPostDespues: true });

    const primero = await ejecutar(escenario);
    assert.equal(primero.errores, 1);
    assert.equal(primero.interrumpidaPorRed, true);
    assert.equal(escenario.posts, 1);
    assert.equal(escenario.remotas.length, 1);
    assert.equal(escenario.lectura.estadoEnvio, 'pendiente');

    const segundo = await ejecutar(escenario);
    assert.equal(segundo.enviadas, 1);
    assert.equal(segundo.errores, 0);
    assert.equal(escenario.posts, 1, 'el reintento no debe crear un segundo POST');
    assert.equal(escenario.remotas.length, 1, 'la oficina debe conservar una sola lectura');
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
  });

  it('reintenta cuando falla la red antes de llegar al servidor', async () => {
    const escenario = crearEscenario({ fallarPostAntes: true });

    const primero = await ejecutar(escenario);
    assert.equal(primero.errores, 1);
    assert.equal(primero.interrumpidaPorRed, true);
    assert.equal(escenario.lectura.estadoEnvio, 'pendiente');
    assert.equal(escenario.remotas.length, 0);

    escenario.deps.enviarLectura = async (lectura) => {
      const remota: LecturaRemota = {
        id: '10',
        localId: lectura.localId,
        medidorId: lectura.medidorId,
        codigoMedidor: lectura.codigoMedidor,
        codigoTecnico: lectura.codigoTecnico,
        fechaRegistro: lectura.fechaRegistro,
        periodo: lectura.periodo,
        tipoEstado: lectura.tipoEstado,
        lecturaActual: lectura.lecturaActual,
        estadoVerificacion: lectura.estadoVerificacion,
      };
      escenario.remotas.push(remota);
      return remota;
    };

    const segundo = await ejecutar(escenario);
    assert.equal(segundo.enviadas, 1);
    assert.equal(escenario.remotas.length, 1);
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
  });

  it('recupera un 409 de localId duplicado sin marcar error definitivo', async () => {
    const escenario = crearEscenario({ conflictoPost: true });
    // El primer intento recibe 409; la comprobación posterior encuentra la
    // lectura que ya existía en la oficina y la marca como enviada.
    const remotaExistente: LecturaRemota = {
      id: '99',
      localId: escenario.lectura.localId,
      medidorId: '1',
      codigoMedidor: 'MED-100001',
      codigoTecnico: 'TEC-001',
      fechaRegistro: '2026-10-26T12:00:00.000Z',
      periodo: '2026-10',
      tipoEstado: 'normal',
      lecturaActual: 120,
      estadoVerificacion: 'verificada',
    };
    const buscarOriginal = escenario.deps.buscarLecturaRemota;
    let primeraBusqueda = true;
    escenario.deps.buscarLecturaRemota = async (localId) => {
      if (primeraBusqueda) {
        primeraBusqueda = false;
        return null;
      }
      return buscarOriginal(localId);
    };
    escenario.deps.enviarLectura = async () => {
      escenario.remotas.push(remotaExistente);
      throw new ApiError('http', 'Ya existe una lectura con el mismo localId.', 409);
    };

    const resultado = await ejecutar(escenario);
    assert.equal(resultado.enviadas, 1);
    assert.equal(resultado.revision, 0);
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
    assert.equal(escenario.lectura.idRemoto, '99');
  });

  it('mantiene pendiente y reporta error ante un 500 del servidor', async () => {
    const escenario = crearEscenario({ error500Antes: true });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.errores, 1);
    assert.equal(resultado.interrumpidaPorRed, false);
    assert.equal(escenario.lectura.estadoEnvio, 'pendiente');
    assert.match(escenario.lectura.mensajeError ?? '', /Fallo simulado/);
  });

  it('no vuelve a enviar una lectura que ya está marcada como enviada', async () => {
    const escenario = crearEscenario({ lectura: { estadoEnvio: 'enviado' } });
    const resultado = await ejecutar(escenario);
    assert.equal(resultado.intentadas, 0);
    assert.equal(escenario.posts, 0);
  });
});

describe('R6 - reglas de anomalía durante la sincronización', () => {
  it('no envía una anomalía sin confirmación ni foto y la deja para revisión', async () => {
    const escenario = crearEscenario({
      lectura: { lecturaActual: 161, confirmacionRevision: false, fotoUri: null },
    });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.revision, 1);
    assert.equal(resultado.enviadas, 0);
    assert.equal(escenario.posts, 0);
    assert.equal(escenario.lectura.estadoEnvio, 'requiere_revision');
    assert.equal(escenario.lectura.estadoVerificacion, 'anomalia_pendiente');
    assert.match(escenario.lectura.mensajeError ?? '', /confirmación/i);
  });

  it('envía una anomalía confirmada con foto y conserva el estado de verificación', async () => {
    const escenario = crearEscenario({
      lectura: {
        lecturaActual: 161,
        confirmacionRevision: true,
        fotoUri: 'file:///fotos-lecturas/medidor.jpg',
      },
    });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.enviadas, 1);
    assert.equal(escenario.posts, 1);
    assert.equal(escenario.ultimaEvaluacion?.estadoVerificacion, 'anomalia_confirmada');
    assert.equal(escenario.remotas[0]?.estadoVerificacion, 'anomalia_confirmada');
  });

  it('deja para revisión una lectura menor que la última de la oficina', async () => {
    const escenario = crearEscenario({ lectura: { lecturaActual: 90 } });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.revision, 1);
    assert.equal(escenario.posts, 0);
    assert.equal(escenario.lectura.estadoEnvio, 'requiere_revision');
    assert.match(escenario.lectura.mensajeError ?? '', /menor/i);
  });

  it('completa datos del medidor desde la oficina antes de evaluar', async () => {
    const medidorIncompleto: Medidor = {
      ...MEDIDOR,
      ultimaLectura: null,
      consumoPromedioMensual: null,
    };
    const medidorRemoto: Medidor = {
      ...MEDIDOR,
      ultimaLectura: 100,
      consumoPromedioMensual: 20,
    };
    const escenario = crearEscenario({
      medidorLocal: medidorIncompleto,
      remotoMedidor: medidorRemoto,
      lectura: { lecturaActual: 161, confirmacionRevision: true, fotoUri: 'file:///foto.jpg' },
    });
    const resultado = await ejecutar(escenario);

    assert.equal(escenario.medidorGuardado?.ultimaLectura, 100);
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
    assert.equal(resultado.enviadas, 1);
    assert.equal(escenario.ultimaEvaluacion?.estadoVerificacion, 'anomalia_confirmada');
  });
});

describe('R3/R5 - lectura inaccesible y medidor ausente', () => {
  it('envía una lectura inaccesible sin lectura actual', async () => {
    const escenario = crearEscenario({
      lectura: {
        tipoEstado: 'inaccesible',
        lecturaActual: null,
        motivoInaccesible: 'Casa cerrada, no hay acceso al medidor',
        estadoVerificacion: 'no_aplica',
      },
    });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.enviadas, 1);
    assert.equal(escenario.posts, 1);
    assert.equal(escenario.lectura.estadoEnvio, 'enviado');
    assert.equal(escenario.ultimaEvaluacion?.estadoVerificacion, 'no_aplica');
  });

  it('no envía si el medidor no existe en la oficina', async () => {
    const escenario = crearEscenario({
      medidorLocal: null,
      remotoMedidor: null,
    });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.revision, 1);
    assert.equal(escenario.posts, 0);
    assert.equal(escenario.lectura.estadoEnvio, 'requiere_revision');
    assert.match(escenario.lectura.mensajeError ?? '', /no se encontró el medidor/i);
  });

  it('deja el envío pendiente si falla la consulta del medidor por red', async () => {
    const escenario = crearEscenario({
      medidorLocal: { ...MEDIDOR, ultimaLectura: null, consumoPromedioMensual: null },
      errorRedAlConsultarMedidor: true,
    });
    const resultado = await ejecutar(escenario);

    assert.equal(resultado.errores, 1);
    assert.equal(resultado.interrumpidaPorRed, true);
    assert.equal(escenario.posts, 0);
    assert.equal(escenario.lectura.estadoEnvio, 'pendiente');
  });
});
