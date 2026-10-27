import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calcularConsumo,
  calcularUmbral,
  esConsumoAnomalo,
  evaluarConsumo,
} from '../src/utils/consumo';
import { generarLocalId } from '../src/utils/id';
import { esPeriodoValido, nombrePeriodo } from '../src/utils/periodo';
import { normalizarUrlApi } from '../src/utils/url';

describe('R6 - cálculo de consumo', () => {
  it('calcula la diferencia numérica, no una concatenación', () => {
    assert.equal(calcularConsumo(160, 100), 60);
    assert.equal(calcularConsumo(160.5, 100.25), 60.25);
    assert.equal(calcularConsumo(100, 100), 0);
  });

  it('devuelve null si falta la lectura actual o la anterior', () => {
    assert.equal(calcularConsumo(null, 100), null);
    assert.equal(calcularConsumo(160, null), null);
    assert.equal(calcularConsumo(null, null), null);
  });

  it('calcula el umbral como el triple del promedio', () => {
    assert.equal(calcularUmbral(20), 60);
    assert.equal(calcularUmbral(null), null);
    assert.equal(calcularUmbral(0), 0);
  });

  it('con 100, 160 y 20 el consumo es 60 y NO hay anomalía', () => {
    const resultado = evaluarConsumo(160, 100, 20);
    assert.equal(resultado.consumo, 60);
    assert.equal(resultado.umbral, 60);
    assert.equal(resultado.anomalia, false);
    assert.equal(resultado.evaluable, true);
    assert.equal(esConsumoAnomalo(60, 20), false);
  });

  it('con 161, 100 y 20 el consumo supera el umbral y SÍ hay anomalía', () => {
    const resultado = evaluarConsumo(161, 100, 20);
    assert.equal(resultado.consumo, 61);
    assert.equal(resultado.umbral, 60);
    assert.equal(resultado.anomalia, true);
    assert.equal(esConsumoAnomalo(61, 20), true);
  });

  it('marca la verificación pendiente si falta la lectura anterior o el promedio', () => {
    const sinAnterior = evaluarConsumo(160, null, 20);
    assert.equal(sinAnterior.evaluable, false);
    assert.equal(sinAnterior.motivo, 'sin_anterior');
    assert.equal(sinAnterior.anomalia, false);

    const sinPromedio = evaluarConsumo(160, 100, null);
    assert.equal(sinPromedio.consumo, 60);
    assert.equal(sinPromedio.evaluable, false);
    assert.equal(sinPromedio.motivo, 'sin_promedio');
    assert.equal(sinPromedio.anomalia, false);

    const sinLectura = evaluarConsumo(null, 100, 20);
    assert.equal(sinLectura.motivo, 'sin_lectura');
    assert.equal(sinLectura.consumo, null);
  });

  it('con promedio 0, cualquier consumo positivo es anómalo', () => {
    assert.equal(esConsumoAnomalo(0, 0), false);
    assert.equal(esConsumoAnomalo(1, 0), true);
  });
});

describe('periodo', () => {
  it('valida el formato YYYY-MM', () => {
    assert.equal(esPeriodoValido('2026-10'), true);
    assert.equal(esPeriodoValido('2026-13'), false);
    assert.equal(esPeriodoValido('2026-1'), false);
    assert.equal(esPeriodoValido('10-2026'), false);
  });

  it('presenta el periodo en español', () => {
    assert.equal(nombrePeriodo('2026-10'), 'octubre 2026');
    assert.equal(nombrePeriodo('2027-01'), 'enero 2027');
  });
});

describe('identificador local', () => {
  it('genera identificadores estables en formato y únicos en una ráfaga', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generarLocalId()));
    assert.equal(ids.size, 500);
    for (const id of ids) {
      assert.match(id, /^lec_[a-z0-9]+_[a-z0-9]{16}$/);
    }
  });
});

describe('URL del sistema de oficina', () => {
  it('normaliza espacios y barras finales', () => {
    assert.equal(normalizarUrlApi('  http://192.168.1.10:4000/  '), 'http://192.168.1.10:4000');
    assert.equal(normalizarUrlApi('https://demo.mockapi.io/api/v1///'), 'https://demo.mockapi.io/api/v1');
  });

  it('rechaza protocolos distintos y valores con espacios internos', () => {
    assert.throws(() => normalizarUrlApi('ftp://servidor'));
    assert.throws(() => normalizarUrlApi('servidor.local:4000'));
    assert.throws(() => normalizarUrlApi('http://mi servidor:4000'));
    assert.throws(() => normalizarUrlApi(''));
  });
});
