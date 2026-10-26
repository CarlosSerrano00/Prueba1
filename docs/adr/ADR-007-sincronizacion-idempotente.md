# ADR-007: Sincronizar de forma idempotente con `expo-network`, `localId` estable y verificación previa

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R4, R6, R9 y R10.

## Contexto

Las lecturas se guardan primero en el teléfono. Cuando hay conexión deben enviarse solas, sin intervención del técnico. Si la señal se corta en medio de un `POST`, no sé si el servidor alcanzó a crear el registro. Un reintento ciego podría duplicarlo.

La conectividad del dispositivo no garantiza que el sistema de oficina esté disponible. Además, la app debe seguir funcionando mientras hay lecturas pendientes y mostrar el estado en todas las pantallas.

MockAPI no ofrece una restricción única atómica por `localId` ni transacciones. La estrategia debe ser lo más robusta posible dentro de esa limitación.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `expo-network` + sincronización propia con `localId` y comprobación previa | Módulo Expo compatible con SDK 57; detecta cambios de red; el `localId` se genera antes del primer envío y permite preguntar "¿ya existe?"; la cola vive en SQLite. | No sincroniza con la app cerrada; hay que escribir el motor de reintentos y el candado de concurrencia. |
| `@react-native-community/netinfo` + sincronización propia | Muy usado, detecta conectividad y tipo de red. | Dependencia adicional para una capacidad que `expo-network` ya cubre; no resuelve la idempotencia ni la cola. |
| TanStack Query con mutaciones y reintentos | Reintentos y estados de mutación listos. | Su reintento no sabe si el `POST` llegó al servidor; seguiría necesitando la comprobación por `localId`. No persiste la cola entre reinicios sin trabajo adicional. |
| Tarea en segundo plano (`expo-background-task` o similar) | Podría enviar con la app cerrada. | Añade permisos y restricciones del sistema; la rúbrica no exige envío con la app cerrada, sino al recuperar la conexión. Aumenta la complejidad y los puntos de fallo. |

## Decisión

Se usa `expo-network` (`addNetworkStateListener`) y `AppState` para detectar:

- recuperación de red;
- vuelta de la app a primer plano;
- reintento periódico cada 30 segundos mientras haya pendientes y red.

El motor de sincronización:

1. Tiene un candado en memoria para que no se ejecuten dos sincronizaciones a la vez.
2. Al iniciar, recupera filas que quedaron en `enviando` por un cierre inesperado y las devuelve a `pendiente`.
3. Marca la fila como `enviando` antes de leerla para que una edición simultánea sea rechazada.
4. Antes de crear, consulta `GET /lecturas?localId=<localId>`. Si ya existe, adopta el `id` remoto y la marca como enviada sin crear otra.
5. Si no existe, hace `POST`. Solo marca `enviado` después de una respuesta 2xx con el objeto creado.
6. Si el `POST` falla por red o timeout, deja la fila en `pendiente`, incrementa `intentos_envio` y guarda un mensaje. El siguiente intento vuelve a comprobar por `localId`.
7. Si el servidor responde 409 por `localId`, trata el registro como ya creado y lo verifica; si responde 409 por medidor/periodo, lo marca `requiere_revision` y no lo reintenta en bucle.
8. Antes de enviar, actualiza la verificación con los datos remotos del medidor. Si detecta una anomalía y no hay confirmación/foto, no envía: lo marca `requiere_revision` para que el técnico lo corrija.

El `localId` se genera localmente antes del primer guardado con timestamp + dos bloques aleatorios en base 36. No se usa un contador incremental, porque dos instalaciones podrían generar el mismo valor. No se añade `expo-crypto` para este caso: el identificador no es un secreto y la probabilidad de colisión es despreciable para el volumen de la prueba.

## Consecuencias

- Se gana una cola persistente y una estrategia verificable contra duplicados.
- Se acepta que la sincronización no ocurre con la app completamente cerrada; ocurre al abrirla, al volver a primer plano, al recuperar red y cada 30 segundos mientras esté activa.
- Riesgo: entre el `GET` y el `POST` existe una ventana de carrera si dos dispositivos intentan crear la misma lectura. MockAPI no permite una transacción atómica; se documenta la limitación. El servidor local de desarrollo sí rechaza `localId` duplicado con 409.
- Riesgo: `enLinea` se basa en `isConnected`, no en `isInternetReachable`, para permitir un servidor local en una red sin Internet. La disponibilidad real se confirma con las respuestas HTTP; si el servidor no responde, se muestra el error y se reintenta.
- Riesgo: una edición mientras la fila está `enviando` se rechaza con un mensaje claro; el técnico espera unos segundos y vuelve a intentar. Esto evita enviar una versión antigua.

## Verificación

1. Revisar `src/services/syncEngine.ts`, `src/services/syncService.ts` y `src/context/AppProvider.tsx`.
2. Ejecutar `npm test`: las pruebas del motor simulan un `POST` que crea el registro y luego falla; en la segunda pasada el motor debe encontrar el registro por `localId` y no volver a crear.
3. En el dispositivo: guardar una lectura en modo avión, comprobar el contador, recuperar la conexión y verificar que se envía sola y aparece una sola vez en el servidor.
4. Activar modo avión durante un envío y recuperarlo; comprobar que no hay duplicados.
5. Verificar que el indicador de conexión y pendientes aparece en Inicio, Buscar, Medidor, Lecturas y Perfil.
6. Revisar que una fila marcada `enviado` no vuelve a entrar en la cola.

## Uso de IA

La IA propuso `expo-network` y una sincronización propia con `localId`, descartando NetInfo, TanStack Query y tareas en segundo plano. Se aceptó porque la idempotencia depende de una comprobación previa, no solo de reintentar la petición. Se reconoce la limitación de MockAPI: no hay una operación atómica "crear si no existe". El estudiante debe poder explicar por qué no basta con `setTimeout` y `POST`, y qué significa que el estado `enviado` se escriba solo después de la confirmación del servidor.
