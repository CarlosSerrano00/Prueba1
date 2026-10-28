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
- antes de enviar, el motor pregunta primero por `localId` y luego por `codigoMedidor` + `periodo`; si encuentra una lectura de otro dispositivo, la deja en `requiere_revision` y no hace el `POST`;
- MockAPI no impone una restricción única por medidor/periodo, así que la comprobación remota previa es la defensa principal; el mock local además responde 409;
- si no hay conexión, solo se puede comprobar localmente; la comprobación remota se hace al sincronizar, cuando vuelve la red;
- la edición de una lectura pendiente conserva su periodo original;
- una lectura actual menor que la última lectura conocida se rechaza con un mensaje que explica la regla. No se implementa un caso de reemplazo de medidor; si ocurre en campo, el técnico debe registrarlo como incidencia y coordinarlo con la oficina.

## Consecuencias

- Se gana una regla simple, visible y defendible.
- Se acepta la limitación de zona horaria en el cambio de mes; se documenta.
- Se acepta que sin conexión no se puede comprobar un duplicado creado por otro dispositivo. La comprobación remota antes del envío y el `UNIQUE` local reducen el riesgo; MockAPI no ofrece una garantía atómica, por lo que dos dispositivos podrían pasar la comprobación a la vez.
- La regla de lectura menor puede impedir registrar un medidor reemplazado. Se prefiere rechazar y explicar antes que aceptar un consumo negativo sin justificación.

## Verificación

1. Revisar `src/utils/periodo.ts`, `src/utils/validators.ts`, `src/services/lecturasService.ts` y el esquema de `src/storage/db.ts`.
2. Ejecutar `npm test`: deben pasar las pruebas de periodo local y de comparación de lectura.
3. Crear una lectura para `MED-100001` en el mes actual e intentar crear otra igual; debe rechazarse aun reiniciando la app.
4. Editar la lectura pendiente y comprobar que conserva el periodo y no crea una fila nueva.
5. Con el servidor local, intentar un `POST` con el mismo medidor y periodo; debe devolver 409.
6. Contra MockAPI, consultar `GET /lecturas?codigoMedidor=MED-100008&periodo=2026-10` y confirmar que el motor la detecta antes del `POST`.
7. Revisar que una lectura enviada no se puede editar ni eliminar desde la interfaz ni desde el repositorio.

