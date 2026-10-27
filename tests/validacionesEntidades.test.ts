import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fechaHoraDesdeDia,
  hoyISO,
  normalizarFechaDia,
  parsearFecha,
  sumarDias,
  validarFechaDia,
  validarFechaHoraISO,
} from '../src/utils/fechas';
import {
  LONGITUDES_MEDIDOR,
  parsearNumeroRango,
  RANGO_LECTURA,
  validarMedidorFormulario,
  type MedidorFormulario,
} from '../src/utils/validacionesEntidades';
import { parsearLectura, validarFechaRegistro } from '../src/utils/validators';

function medidorValido(parcial: Partial<MedidorFormulario> = {}): MedidorFormulario {
  return {
    codigo: 'MED-100001',
    direccion: 'Av. Occidental 1234, barrio La Libertad',
    sector: 'Nono',
    numeroCuenta: 'CTA-100001',
    estado: 'activo',
    ultimaLectura: '100',
    fechaUltimaLectura: '2026-09-20',
    consumoPromedioMensual: '20',
    ...parcial,
  };
}

describe('fechas de negocio', () => {
  it('normaliza un día calendario y una fecha ISO de MockAPI sin mover el día', () => {
    assert.equal(normalizarFechaDia('2026-09-20'), '2026-09-20');
    assert.equal(normalizarFechaDia('2026-09-20T00:00:00.000Z'), '2026-09-20');
    assert.equal(normalizarFechaDia('2026-02-30'), null);
  });

  it('acepta una fecha de hoy y rechaza el futuro', () => {
    assert.equal(validarFechaDia(hoyISO()).ok, true);
    assert.equal(validarFechaDia(sumarDias(hoyISO(), 1)).ok, false);
    assert.equal(validarFechaDia('2026-09-20', { min: '2026-09-21' }).ok, false);
  });

  it('exige fecha cuando la regla es obligatoria', () => {
    assert.equal(validarFechaDia('', { requerida: true }).ok, false);
    assert.equal(validarFechaDia('', { requerida: false }).ok, true);
  });

  it('valida una fecha/hora ISO y conserva el instante', () => {
    const iso = '2026-09-18T15:20:00.000Z';
    const resultado = validarFechaHoraISO(iso, { requerida: true });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.valor, iso);
  });

  it('construye un instante estable desde un día local', () => {
    const iso = fechaHoraDesdeDia('2026-10-05');
    assert.ok(iso);
    assert.equal(normalizarFechaDia(iso), '2026-10-05');
    const fecha = parsearFecha(iso);
    assert.ok(fecha);
    assert.equal(fecha.getFullYear(), 2026);
    assert.equal(fecha.getMonth(), 9);
    assert.equal(fecha.getDate(), 5);
  });
});

describe('validaciones numéricas', () => {
  it('acepta coma o punto y hasta tres decimales', () => {
    const conComa = parsearNumeroRango('540,5', {
      etiqueta: 'La lectura',
      ...RANGO_LECTURA,
    });
    const conPunto = parsearNumeroRango('540.555', {
      etiqueta: 'La lectura',
      ...RANGO_LECTURA,
    });
    assert.equal(conComa.ok, true);
    assert.equal(conComa.valor, 540.5);
    assert.equal(conPunto.ok, true);
    assert.equal(conPunto.valor, 540.555);
  });

  it('rechaza demasiados decimales, negativos y valores fuera del rango', () => {
    const opciones = { etiqueta: 'La lectura', ...RANGO_LECTURA };
    assert.equal(parsearNumeroRango('1,2345', opciones).ok, false);
    assert.equal(parsearNumeroRango('-1', opciones).ok, false);
    assert.equal(parsearNumeroRango('1000000', opciones).ok, false);
  });

  it('aplica el límite numérico de la lectura en la captura', () => {
    assert.equal(parsearLectura('999999,999').ok, true);
    assert.equal(parsearLectura('1000000').ok, false);
  });
});

describe('ficha del medidor', () => {
  it('acepta una ficha con los campos del seed', () => {
    const resultado = validarMedidorFormulario(medidorValido());
    assert.equal(resultado.valido, true);
    assert.equal(resultado.valores.direccion, 'Av. Occidental 1234, barrio La Libertad');
    assert.equal(resultado.valores.fechaUltimaLectura, '2026-09-20');
  });

  it('valida longitudes, cuenta, estado y fecha futura', () => {
    const corta = validarMedidorFormulario(
      medidorValido({
        codigo: 'MED-1',
        direccion: 'abc',
        numeroCuenta: 'CTA-1',
        estado: 'activo',
      }),
    );
    assert.ok(corta.errores.codigo);
    assert.ok(corta.errores.direccion);
    assert.ok(corta.errores.numeroCuenta);

    const futura = validarMedidorFormulario(
      medidorValido({ fechaUltimaLectura: sumarDias(hoyISO(), 1) }),
    );
    assert.ok(futura.errores.fechaUltimaLectura);
  });

  it('exige coherencia entre última lectura y fecha', () => {
    const sinFecha = validarMedidorFormulario(medidorValido({ fechaUltimaLectura: null }));
    assert.ok(sinFecha.errores.fechaUltimaLectura);

    const sinLectura = validarMedidorFormulario(
      medidorValido({ ultimaLectura: '', fechaUltimaLectura: '2026-09-20' }),
    );
    assert.ok(sinLectura.errores.ultimaLectura);
  });

  it('respeta el máximo de caracteres de la dirección', () => {
    const resultado = validarMedidorFormulario(
      medidorValido({ direccion: 'x'.repeat(LONGITUDES_MEDIDOR.direccion.max + 1) }),
    );
    assert.ok(resultado.errores.direccion);
  });
});

describe('fecha de registro de la lectura', () => {
  it('acepta hoy y rechaza el futuro o fechas anteriores a un año', () => {
    assert.equal(validarFechaRegistro(hoyISO()), null);
    assert.ok(validarFechaRegistro(sumarDias(hoyISO(), 1)));
    assert.ok(validarFechaRegistro(sumarDias(hoyISO(), -366)));
  });
});
