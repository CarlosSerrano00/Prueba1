import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DatosFormulario, Medidor } from '../src/types/models';
import {
  esCodigoMedidorValido,
  fotoEsObligatoria,
  parsearLectura,
  validarCodigoMedidor,
  validarDatosRegistro,
  validarRegistroCompleto,
} from '../src/utils/validators';
import { evaluarConsumo } from '../src/utils/consumo';
import { obtenerPeriodo } from '../src/utils/periodo';

const medidorBase: Medidor = {
  idRemoto: '1',
  codigo: 'MED-100001',
  direccion: 'Calle de prueba 123',
  sector: 'Nono',
  numeroCuenta: 'CTA-0001',
  estado: 'activo',
  ultimaLectura: 100,
  fechaUltimaLectura: '2026-09-20',
  consumoPromedioMensual: 20,
  consultadoEn: '2026-10-26T10:00:00.000Z',
};

function datos(parcial: Partial<DatosFormulario>): DatosFormulario {
  return {
    tipoEstado: 'normal',
    lecturaActual: '',
    motivoInaccesible: '',
    descripcionDano: '',
    confirmacionRevision: false,
    ...parcial,
  };
}

describe('R2 - validación del código del medidor', () => {
  it('acepta exactamente MED- y seis dígitos', () => {
    assert.equal(esCodigoMedidorValido('MED-123456'), true);
    assert.equal(validarCodigoMedidor('MED-123456').valido, true);
  });

  it('rechaza códigos incompletos o con formato distinto', () => {
    const invalidos = [
      '',
      'MED-12345',
      'MED-1234567',
      'med-123456',
      'MED-ABCDEF',
      'MED-123 456',
      ' MED-123456',
      'MED-123456 ',
      'MED-123456\n',
      'MED-12345A',
    ];
    for (const codigo of invalidos) {
      assert.equal(esCodigoMedidorValido(codigo), false, `debería rechazar ${JSON.stringify(codigo)}`);
      assert.equal(validarCodigoMedidor(codigo).valido, false);
      assert.ok(validarCodigoMedidor(codigo).mensaje);
    }
  });
});

describe('R5 - lectura numérica', () => {
  it('acepta enteros y decimales con coma o punto', () => {
    assert.deepEqual(parsearLectura('160'), { ok: true, valor: 160 });
    assert.deepEqual(parsearLectura('160,5'), { ok: true, valor: 160.5 });
    assert.deepEqual(parsearLectura('160.25'), { ok: true, valor: 160.25 });
  });

  it('rechaza vacío, negativos, letras y demasiados decimales', () => {
    for (const texto of ['', '   ', '-1', 'abc', '1,2345', '1.2.3', '10 m3']) {
      const resultado = parsearLectura(texto);
      assert.equal(resultado.ok, false, `debería rechazar ${JSON.stringify(texto)}`);
    }
  });
});

describe('R5 - reglas de los tres estados', () => {
  it('normal exige lectura', () => {
    const resultado = validarDatosRegistro(datos({ tipoEstado: 'normal' }), medidorBase);
    assert.equal(resultado.valido, false);
    assert.ok(resultado.errores.lecturaActual);
  });

  it('normal acepta una lectura válida y calcula consumo', () => {
    const resultado = validarDatosRegistro(
      datos({ tipoEstado: 'normal', lecturaActual: '160' }),
      medidorBase,
    );
    assert.equal(resultado.valido, true);
    assert.equal(resultado.lectura, 160);
    assert.equal(resultado.evaluacion.consumo, 60);
  });

  it('normal rechaza una lectura menor que la anterior', () => {
    const resultado = validarDatosRegistro(
      datos({ tipoEstado: 'normal', lecturaActual: '99' }),
      medidorBase,
    );
    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.lecturaActual ?? '', /no puede ser menor/i);
  });

  it('inaccesible exige motivo y no registra lectura', () => {
    const sinMotivo = validarDatosRegistro(datos({ tipoEstado: 'inaccesible' }), medidorBase);
    assert.equal(sinMotivo.valido, false);
    assert.ok(sinMotivo.errores.motivoInaccesible);

    const conMotivo = validarDatosRegistro(
      datos({
        tipoEstado: 'inaccesible',
        motivoInaccesible: 'Casa cerrada, no hay acceso al medidor',
        lecturaActual: '200',
      }),
      medidorBase,
    );
    assert.equal(conMotivo.valido, true);
    assert.equal(conMotivo.lectura, null);
    assert.equal(conMotivo.evaluacion.consumo, null);
  });

  it('dañado exige descripción y permite lectura vacía', () => {
    const sinDescripcion = validarDatosRegistro(datos({ tipoEstado: 'danado' }), medidorBase);
    assert.equal(sinDescripcion.valido, false);
    assert.ok(sinDescripcion.errores.descripcionDano);

    const conDescripcion = validarDatosRegistro(
      datos({
        tipoEstado: 'danado',
        descripcionDano: 'Tapa rota y vidrio empañado',
        lecturaActual: '',
      }),
      medidorBase,
    );
    assert.equal(conDescripcion.valido, true);
    assert.equal(conDescripcion.lectura, null);
  });

  it('dañado con lectura válida también se acepta', () => {
    const resultado = validarDatosRegistro(
      datos({
        tipoEstado: 'danado',
        descripcionDano: 'Tapa rota y vidrio empañado',
        lecturaActual: '150',
      }),
      medidorBase,
    );
    assert.equal(resultado.valido, true);
    assert.equal(resultado.lectura, 150);
    assert.equal(resultado.evaluacion.consumo, 50);
  });
});

describe('R6 - foto obligatoria y anomalía', () => {
  it('no exige foto en una lectura normal sin anomalía', () => {
    const evaluacion = evaluarConsumo(120, 100, 20);
    assert.equal(evaluacion.anomalia, false);
    assert.equal(fotoEsObligatoria('normal', evaluacion), false);
  });

  it('exige foto si el medidor está dañado', () => {
    const evaluacion = evaluarConsumo(120, 100, 20);
    assert.equal(fotoEsObligatoria('danado', evaluacion), true);
  });

  it('exige foto y confirmación cuando el consumo es anómalo', () => {
    const evaluacion = evaluarConsumo(161, 100, 20);
    assert.equal(evaluacion.anomalia, true);

    const sinCondiciones = validarRegistroCompleto(
      datos({ tipoEstado: 'normal', lecturaActual: '161', confirmacionRevision: false }),
      medidorBase,
      null,
    );
    assert.equal(sinCondiciones.valido, false);
    assert.ok(sinCondiciones.errores.foto);
    assert.ok(sinCondiciones.errores.confirmacion);

    const conCondiciones = validarRegistroCompleto(
      datos({ tipoEstado: 'normal', lecturaActual: '161', confirmacionRevision: true }),
      medidorBase,
      'file:///foto.jpg',
    );
    assert.equal(conCondiciones.valido, true);
  });

  it('una lectura dañada sin foto no es válida', () => {
    const resultado = validarRegistroCompleto(
      datos({
        tipoEstado: 'danado',
        descripcionDano: 'Caja destruida',
        lecturaActual: '150',
      }),
      medidorBase,
      null,
    );
    assert.equal(resultado.valido, false);
    assert.ok(resultado.errores.foto);
  });
});

describe('periodo mensual', () => {
  it('usa el mes calendario local y rellena con dos dígitos', () => {
    assert.equal(obtenerPeriodo(new Date(2026, 9, 26, 23, 59)), '2026-10');
    assert.equal(obtenerPeriodo(new Date(2026, 0, 1, 0, 1)), '2026-01');
    assert.equal(obtenerPeriodo(new Date(2026, 11, 31, 23, 59)), '2026-12');
  });
});
