import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Lectura } from '../src/types/models';
import { parsearLecturaRemota } from '../src/services/apiParsers';
import {
  CAMPOS_LECTURA_REMOTA,
  CAMPOS_MEDIDOR_REMOTO,
  cuerpoLecturaRemota,
  cuerpoMedidorRemoto,
} from '../src/utils/contratoRemoto';

const lectura: Lectura = {
  localId: 'lec_20261027_abc123',
  idRemoto: null,
  codigoMedidor: 'MED-100001',
  medidorId: '1',
  codigoTecnico: 'TEC-001',
  fechaRegistro: '2026-10-27T14:30:00.000Z',
  periodo: '2026-10',
  tipoEstado: 'normal',
  lecturaActual: 160,
  ultimaLecturaReferencia: 100,
  consumoCalculado: 60,
  consumoPromedioReferencia: 20,
  motivoInaccesible: null,
  descripcionDano: null,
  fotoUri: 'file:///foto.jpg',
  fotoUrl: null,
  ubicacion: { latitud: -0.1807, longitud: -78.4678, origen: 'gps' },
  confirmacionRevision: false,
  estadoVerificacion: 'verificada',
  estadoEnvio: 'pendiente',
  intentosEnvio: 0,
  fechaEnvio: null,
  mensajeError: null,
  creadoEn: '2026-10-27T14:30:00.000Z',
  actualizadoEn: '2026-10-27T14:30:00.000Z',
};

describe('contrato exacto con MockAPI', () => {
  it('envía a /lecturas solo los campos del seed, sin datos locales de apoyo', () => {
    const cuerpo = cuerpoLecturaRemota(lectura);
    assert.deepEqual(Object.keys(cuerpo), [...CAMPOS_LECTURA_REMOTA]);
    assert.equal(cuerpo.fotoUri, undefined);
    assert.equal(cuerpo.motivoInaccesible, undefined);
    assert.equal(cuerpo.consumoCalculado, undefined);
    assert.equal(cuerpo.estadoVerificacion, 'verificada');
    assert.equal(cuerpo.latitud, -0.1807);
    assert.equal(cuerpo.longitud, -78.4678);
    assert.equal(cuerpo.origenUbicacion, 'gps');
  });

  it('recupera y valida la ubicación de una lectura remota', () => {
    const remota = parsearLecturaRemota({
      ...cuerpoLecturaRemota(lectura),
      id: '10',
    });
    assert.deepEqual(remota.ubicacion, lectura.ubicacion);
    assert.throws(
      () =>
        parsearLecturaRemota({
          ...cuerpoLecturaRemota(lectura),
          id: '11',
          latitud: 91,
        }),
      /ubicación inválida/i,
    );
  });

  it('envía a /medidores/:id solo los ocho campos de la ficha', () => {
    const cuerpo = cuerpoMedidorRemoto({
      codigo: 'MED-100001',
      direccion: 'Av. Occidental 1234',
      sector: 'Nono',
      numeroCuenta: 'CTA-100001',
      estado: 'activo',
      ultimaLectura: 100,
      fechaUltimaLectura: '2026-09-20',
      consumoPromedioMensual: 20,
    });
    assert.deepEqual(Object.keys(cuerpo), [...CAMPOS_MEDIDOR_REMOTO]);
    assert.equal(cuerpo.id, undefined);
    assert.equal(cuerpo.fechaUltimaLectura, '2026-09-20');
  });
});
