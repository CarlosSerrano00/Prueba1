# ADR-001: Usar SQLite mediante `expo-sqlite` como almacenamiento local principal

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R3, R4, R7, R8, R9 y R10. La decisión es transversal: la caché de medidores, los borradores, las lecturas pendientes, la cola de sincronización y la restricción de duplicados viven en el mismo almacén local.

## Contexto

La aplicación debe funcionar en campo sin señal. El técnico consulta medidores, empieza registros que pueden quedar a medias, guarda lecturas con estados y fotografías, y las envía después. La información debe sobrevivir al cierre de la aplicación y al reinicio del teléfono.

Además de guardar datos, necesito:

- consultar una lectura por medidor y por periodo;
- impedir dos registros del mismo medidor en el mismo mes;
- listar y contar lecturas pendientes de envío;
- recuperar un borrador con su paso actual;
- conservar la ruta del archivo de una fotografía;
- actualizar estados de envío de forma transaccional.

El volumen es pequeño (decenas o cientos de lecturas), pero las reglas de unicidad y las consultas por estado son parte de la calificación. No se trata solo de guardar pares clave-valor.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `@react-native-async-storage/async-storage` | API mínima; sirve para la sesión y para un borrador pequeño; no requiere aprender SQL. | No tiene consultas por campo, índices ni restricciones de unicidad. Para evitar duplicados habría que leer y reescribir arreglos completos en JavaScript, con riesgo de condiciones de carrera. Contar pendientes obligaría a cargar todas las lecturas en memoria. |
| Archivos JSON con `expo-file-system` | Control total del formato; fácil de inspeccionar; sin SQL. | Cada cambio reescribe el archivo completo; no hay transacciones ni unicidad; un cierre durante la escritura puede dejar el archivo corrupto. Las consultas por medidor y periodo se resuelven recorriendo arreglos. |
| SQLite con `expo-sqlite` | Tablas, índices y `UNIQUE`; transacciones; consultas por estado y periodo; API asíncrona; incluido en Expo Go y compatible con SDK 57. | Más código y migraciones; obliga a escribir SQL; un esquema mal diseñado es más difícil de cambiar que un JSON. |

## Decisión

Se usa `expo-sqlite` como almacén principal, con una base `aquaruta.db`, `PRAGMA journal_mode = WAL` y `PRAGMA foreign_keys = ON`.

Tablas:

- `sesion`: una sola fila con el código, nombre, zona e inicio de sesión del técnico. No guarda la clave.
- `medidores_cache`: datos del medidor consultado y fecha de la última consulta.
- `lecturas`: registro local completo, con `local_id` como clave estable, estados de verificación y de envío, y `UNIQUE (codigo_medidor, periodo)`.
- `borradores`: un borrador por captura, con paso actual, datos del formulario y ruta de la foto.
- `configuracion`: clave-valor para la URL del sistema de oficina y metadatos.

Las operaciones que modifican varias filas (por ejemplo, marcar una lectura como enviada y actualizar su verificación) usan transacciones. Las pantallas nunca escriben SQL directamente: lo hacen los repositorios de `src/storage/`.

## Consecuencias

- Se gana integridad: la base rechaza un segundo registro del mismo medidor y periodo aunque la interfaz falle.
- Se pueden contar pendientes y listar por estado sin cargar toda la base en memoria.
- Se acepta más código: esquema, mapeadores entre filas y modelos, y migraciones versionadas con `PRAGMA user_version`.
- Riesgo: una migración mal escrita puede dejar datos inaccesibles. Se mitiga con migraciones incrementales y una prueba manual de instalación limpia y actualización.
- Riesgo: SQLite es un módulo nativo. Aunque está incluido en Expo Go, el APK debe compilarse con la dependencia instalada; no se puede usar una versión vieja de Expo Go para probar esta app.
- No se usa la API síncrona de SQLite en producción para no bloquear el hilo de interfaz.

## Verificación

1. Revisar `src/storage/db.ts`, `src/storage/lecturasRepository.ts` y `src/storage/borradoresRepository.ts`.
2. Confirmar en el código que existe `UNIQUE (codigo_medidor, periodo)` y que los errores de esa restricción se convierten en un mensaje de negocio.
3. En el dispositivo, crear una lectura, cerrar la aplicación desde las recientes, abrirla y comprobar que la lectura y el borrador siguen ahí.
4. Ejecutar `npm test`: las pruebas de reglas de duplicado y de periodo deben pasar. La restricción SQLite se verifica además con el escenario manual de R10, porque `expo-sqlite` no corre en el entorno de pruebas de Node.
5. Abrir el inspector de SQLite de Expo (`Shift + M` en la terminal) y comprobar las tablas y la fila de sesión.


