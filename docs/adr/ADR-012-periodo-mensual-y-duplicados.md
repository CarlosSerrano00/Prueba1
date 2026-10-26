# ADR-012: Definir el periodo por mes calendario local y bloquear duplicados por medidor y periodo

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R6, R9 y R10. También afecta a R4, porque una lectura sin conexión debe conservar el periodo con el que se registró.

## Contexto

R10 prohíbe registrar dos veces el mismo medidor en el mismo mes. El enunciado no define si el mes debe calcularse en UTC, en la zona horaria del teléfono o según un ciclo de facturación. Tampoco define qué hacer si la lectura actual es menor que la anterior.

La app se usa en Quito, pero el teléfono puede tener otra zona horaria o cambiar de zona. El periodo debe quedar congelado con la lectura, no recalcularse al mostrarla.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Mes calendario local (`YYYY-MM` con `getFullYear`/`getMonth`) | Coincide con la fecha que ve el técnico; fácil de mostrar ("octubre 2026"); se congela al guardar. | Si el técnico cambia de zona horaria justo a fin de mes, dos registros podrían caer en meses distintos. |
| Mes calendario UTC | Consistente entre dispositivos y servidores. | En Quito (UTC−5), un registro de las 20:00 del último día del mes cae en el mes siguiente. Confunde al técnico. |
| Ciclo de facturación definido por la empresa (por ejemplo, día 20 al 19) | Sería lo más fiel a una empresa de agua. | El enunciado no proporciona el ciclo; inventarlo sería agregar una regla no solicitada. |
| Solo comparar la fecha exacta de registro | No requiere definir meses. | No cumple "mismo mes"; dos registros en días distintos del mismo mes pasarían. |

## Decisión

El periodo se calcula con la fecha local del dispositivo al iniciar la captura:

```ts
periodo = `${año}-${mes.padStart(2, '0')}`;
```

Se guarda en la lectura y no se recalcula. La restricción principal es `UNIQUE (codigo_medidor, periodo)` en SQLite. Además:

- antes de abrir el formulario se consulta si ya existe una lectura local para ese medidor y periodo (excluyendo la lectura que se está editando);
- si hay conexión, se consulta el sistema de oficina por `codigoMedidor` y `periodo`; si existe un registro con otro `localId`, se rechaza la captura;
- si no hay conexión, solo se puede comprobar localmente; el servicio vuelve a comprobar antes de enviar y el servidor devuelve 409 si detecta el duplicado;
- la edición de una lectura pendiente conserva su periodo original;
- una lectura actual menor que la última lectura conocida se rechaza con un mensaje que explica la regla. No se implementa un caso de reemplazo de medidor; si ocurre en campo, el técnico debe registrarlo como incidencia y coordinarlo con la oficina.

## Consecuencias

- Se gana una regla simple, visible y defendible.
- Se acepta la limitación de zona horaria en el cambio de mes; se documenta.
- Se acepta que sin conexión no se puede comprobar un duplicado creado por otro dispositivo. La validación remota y la restricción del servidor local reducen el riesgo, pero MockAPI no ofrece una garantía atómica.
- La regla de lectura menor puede impedir registrar un medidor reemplazado. Se prefiere rechazar y explicar antes que aceptar un consumo negativo sin justificación.

## Verificación

1. Revisar `src/utils/periodo.ts`, `src/utils/validators.ts`, `src/services/lecturasService.ts` y el esquema de `src/storage/db.ts`.
2. Ejecutar `npm test`: deben pasar las pruebas de periodo local y de comparación de lectura.
3. Crear una lectura para `MED-100001` en el mes actual e intentar crear otra igual; debe rechazarse aun reiniciando la app.
4. Editar la lectura pendiente y comprobar que conserva el periodo y no crea una fila nueva.
5. Con el servidor local, intentar un `POST` con el mismo medidor y periodo; debe devolver 409.
6. Revisar que una lectura enviada no se puede editar ni eliminar desde la interfaz ni desde el repositorio.

## Uso de IA

La IA propuso el mes calendario local y descartó UTC y un ciclo de facturación inventado. Se aceptó porque el enunciado no define un ciclo y porque el técnico ve la fecha local. Se decidió además rechazar lecturas menores que la anterior en lugar de inventar una regla de reemplazo. El estudiante debe poder explicar la restricción `UNIQUE` y por qué el periodo se guarda, no se recalcula.
