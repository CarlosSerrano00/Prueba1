# ADR-009: Probar funciones puras y el motor de sincronización con `node:test` y `tsx`

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R2, R5, R6, R7, R9 y R10. Las pruebas automatizadas cubren las reglas que la rúbrica evalúa de forma binaria y que son más fáciles de romper al cambiar el código.

## Contexto

La rúbrica exige verificar comportamientos, no solo que una función exista. Las reglas críticas son:

- validación exacta del código;
- cálculo de consumo y anomalía estricta;
- reglas de los tres estados;
- foto obligatoria;
- periodo mensual y duplicados;
- idempotencia y reintentos de sincronización.

Probar la interfaz nativa requiere emulador, dispositivo o una herramienta de UI testing. No hay Android SDK instalado en esta máquina y el tiempo de la prueba es limitado. En cambio, las reglas y el motor de sincronización se pueden aislar del entorno nativo si se diseñan con dependencias inyectables.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `node:test` + `tsx` para lógica pura y motor de sync con dobles | Node 24 ya incluye el runner; `tsx` ejecuta TypeScript sin configurar Babel; las pruebas corren rápido y sin emulador; se pueden simular fallos de red. | No prueba componentes nativos ni SQLite real; `tsx` es una dependencia de desarrollo. |
| Jest + `jest-expo` | Integración con Expo, mocks de módulos nativos y snapshots. | Configuración más pesada; para estas reglas puras no aporta una ventaja proporcional. Añade varias dependencias de desarrollo. |
| Detox / Maestro | Pruebas de extremo a extremo en un emulador real. | Requiere emulador Android y tiempo de configuración; no hay SDK de Android en esta máquina. Se deja como prueba manual documentada. |
| Solo pruebas manuales | Cero configuración. | No hay evidencia repetible; un cambio en la fórmula de consumo podría pasar desapercibido. La rúbrica pide pruebas cuando sean viables. |

## Decisión

Se usa `node:test` con `tsx` como cargador de TypeScript:

```bash
npm test
# node --import tsx --test tests/
```

Las pruebas se dividen en:

- `tests/validators.test.ts`: código de medidor, lectura numérica, reglas de los tres estados, foto obligatoria, periodo.
- `tests/consumo.test.ts`: consumo, datos faltantes, anomalía estricta con el ejemplo 100/160/20 y un valor superior.
- `tests/syncEngine.test.ts`: motor de sincronización con un repositorio falso y una API falsa; incluye el caso "el POST crea el registro y luego falla la red" y verifica que el segundo intento no duplica.

El motor `src/services/syncEngine.ts` recibe un objeto de dependencias (`SyncRepo` y `SyncApi`). `src/services/syncService.ts` lo conecta con los repositorios SQLite y los servicios HTTP reales. Así se prueba la lógica sin `expo-sqlite` ni `fetch`.

Se añaden `tsx` y `@types/node` como dependencias de desarrollo. También se configura ESLint con `eslint-config-expo` para detectar errores estáticos, y `npm run typecheck` ejecuta `tsc --noEmit`.

## Consecuencias

- Se gana evidencia repetible de las reglas críticas y del caso de duplicado por reintento.
- Se aceptan dependencias de desarrollo que no se incluyen en el bundle de la app.
- Riesgo: las pruebas del motor usan dobles; no garantizan que SQLite ni la cámara funcionen en el dispositivo. Por eso se mantiene una matriz de pruebas manuales en `docs/pruebas.md`.
- Riesgo: si el motor cambia su interfaz de dependencias, las pruebas deben actualizarse. Es un costo aceptable frente a no poder probar la idempotencia.
- No se instala Jest, Detox ni Maestro.

## Verificación

1. Ejecutar `npm test` y comprobar que todas las pruebas pasan.
2. Ejecutar `npm run typecheck` y `npm run lint`.
3. Revisar que `tests/syncEngine.test.ts` falla si se elimina la comprobación por `localId` antes del `POST` (prueba de mutación manual).
4. Registrar en `docs/pruebas.md` la fecha, el comando y el resultado real.
5. Las pruebas que dependan de cámara, SQLite o modo avión se marcan como manuales y se ejecutan en el dispositivo; no se declaran aprobadas sin evidencia.

