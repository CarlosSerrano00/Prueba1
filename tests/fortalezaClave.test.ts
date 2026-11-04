import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluarFortalezaClave } from '../src/lib/fortaleza-clave';

test('indicador de contraseña distingue longitud y variedad', () => {
  assert.equal(evaluarFortalezaClave(''), null);
  assert.deepEqual(evaluarFortalezaClave('abcdefgh'), { nivel: 'debil', puntuacion: 1 });
  assert.deepEqual(evaluarFortalezaClave('Abcdefg1'), { nivel: 'media', puntuacion: 2 });
  assert.deepEqual(evaluarFortalezaClave('AguaRuta2026!'), { nivel: 'fuerte', puntuacion: 3 });
  assert.notEqual(evaluarFortalezaClave('abcdefghijkl')?.nivel, 'fuerte');
  assert.notEqual(evaluarFortalezaClave('aaaaaaaaaaaaA1!')?.nivel, 'fuerte');
});
