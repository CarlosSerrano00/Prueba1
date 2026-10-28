# ADR-002: Usar `fetch` nativo y una caché persistente propia en SQLite, sin Axios ni TanStack Query

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R2, R3, R4, R9 y R10.

## Contexto

La app debe hablar con un sistema de oficina simulado que expone dos recursos REST: `medidores` y `lecturas`. Necesito:

- buscar un medidor por código;
- consultar lecturas anteriores para verificar consumos y duplicados;
- crear lecturas;
- conservar los datos del medidor en caché aunque la aplicación se cierre;
- mostrar datos guardados cuando no hay red;
- distinguir un error de red de un error HTTP o de una respuesta inválida;
- evitar dependencias que no aporten una ventaja concreta.

La caché exigida por R3 es persistente. Una librería de caché en memoria no resuelve por sí sola ese requisito. Además, la cola de sincronización necesita estados y consultas SQL, no solo respuestas HTTP cacheadas.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `fetch` nativo + cliente HTTP propio + caché en SQLite | Ya viene en React Native; permite `AbortController` para timeout; control explícito de errores; cero dependencias nuevas; la caché se guarda donde R3 lo exige. | Hay que escribir el cliente, el manejo de estados de carga y los parsers de respuesta; no hay reintentos automáticos de librería. |
| Axios | Interceptores, transformación JSON y cancelación con una API conocida. | Añade una dependencia para una ventaja pequeña: `fetch` ya cubre estas peticiones. Sus interceptores pueden ocultar el manejo explícito de errores que la rúbrica quiere ver. |
| TanStack Query | Caché, reintentos, invalidación y estados de carga listos. | Su caché vive en memoria y está pensada para estado remoto, no para una cola offline persistente. Igual necesitaría SQLite para lecturas, borradores y duplicados. Añade una capa y una dependencia que no elimina el trabajo principal. |
| SWR | API pequeña para caché y revalidación. | Mismo problema: caché en memoria, sin persistencia ni restricciones locales. No reemplaza la base de datos. |

## Decisión

Se usa `fetch` nativo dentro de `src/services/apiClient.ts`, con:

- URL base configurable;
- `AbortController` con tiempo límite de 12 segundos;
- encabezados JSON;
- una clase `ApiError` con tipo `red`, `timeout`, `http`, `respuesta` o `configuracion`;
- lectura y validación manual de la respuesta antes de devolverla a la aplicación.

La caché de medidores es una tabla SQLite (`medidores_cache`). La estrategia es *cache-first por jornada*: si el medidor ya fue consultado hoy, se muestra de inmediato desde SQLite con la fecha de consulta y un aviso informativo; si la copia es de un día anterior, se intenta actualizar desde la oficina. El gesto de deslizar hacia abajo fuerza una nueva consulta remota (`forzarRed`). Sin conexión se devuelve la copia local; si la consulta remota falla y existe caché, se conserva la caché y se muestra una advertencia, no un error que borre la pantalla.

No se instala Axios ni TanStack Query.

## Consecuencias

- Se gana control total sobre qué se guarda, cuándo se invalida y qué se muestra cuando falla la red.
- Se acepta escribir y mantener el cliente HTTP, los parsers y los estados de carga. Es código corto y explicable.
- Se pierde la comodidad de `useQuery` para loading/error/refetch; se implementa con `useState` y `useEffect` en las pantallas.
- Riesgo: una respuesta remota con campos faltantes podría guardarse como válida si los parsers se relajan. Se mitiga validando cada campo obligatorio antes de escribir en caché.
- No se promete una caché "fresca" automática: la fecha de consulta se muestra y el usuario puede actualizar manualmente.

## Verificación

1. Revisar `src/services/apiClient.ts`, `src/services/medidoresService.ts` y `src/services/lecturasService.ts`.
2. Comprobar que `package.json` no contiene `axios`, `@tanstack/react-query` ni `swr`.
3. En el dispositivo: consultar un medidor con red, activar modo avión, volver a consultarlo y verificar que aparecen los datos de la ficha con el aviso de datos almacenados y la fecha de la última consulta.
4. Provocar un 404 (código inexistente) y un error de red, y comprobar que los mensajes son distintos.
5. Revisar que la tabla `medidores_cache` se actualiza después de una consulta exitosa.


