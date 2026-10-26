# ADR-006: Capturar con `expo-image-picker` y copiar las fotos al directorio de documentos

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R5, R6 y R7. La foto es obligatoria si el medidor está dañado o si el consumo es anómalo.

## Contexto

El técnico necesita tomar una foto del medidor como respaldo. La imagen debe seguir disponible después de cerrar y reiniciar la aplicación, incluso varios días, hasta que la lectura se envíe. Si el permiso de cámara se deniega, la app debe explicar para qué lo necesita y permitir continuar cuando la foto sea opcional.

Una foto tomada con la cámara suele devolver una URI en la carpeta de caché. Esa URI puede ser eliminada por el sistema o por la app, así que no sirve como almacenamiento permanente. También quiero evitar guardar la imagen completa como base64 dentro de SQLite: crecería la base y complicaría las consultas.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `expo-image-picker` + `expo-file-system` (nuevo API `File`/`Directory`/`Paths`) | Abre la cámara del sistema, solicita permiso con una API compatible con SDK 57 y devuelve una URI que puedo copiar a `Paths.document`. Menos código nativo que una cámara embebida. | No permite una vista previa personalizada dentro de la app; depende de la app de cámara del dispositivo. El resultado puede perderse si Android mata la actividad (se puede consultar `getPendingResultAsync`). |
| `expo-camera` + `expo-file-system` | Vista de cámara dentro de la app, control total del encuadre y del botón de captura. | Más código, más permisos y una pantalla adicional. Para una foto de respaldo, la cámara del sistema es suficiente y más familiar para el técnico. |
| Guardar la imagen como base64 en SQLite | Un solo almacén; la foto viaja con la fila. | La base crece mucho, se copia en cada lectura y se vuelve lenta. No es necesario para el tamaño de esta app. |
| Usar solo la URI temporal del picker | Cero copias; menos código. | La URI puede desaparecer al cerrar la app o al limpiar la caché. Incumple R7. |

## Decisión

Se usa `expo-image-picker` para abrir la cámara y `expo-file-system` para copiar el archivo a un directorio persistente:

- directorio: `Paths.document/fotos-lecturas/`;
- nombre: `<localId>-<timestamp>.jpg`;
- calidad de captura: `0.6`, suficiente para respaldar la lectura y reducir espacio;
- `mediaTypes: ['images']`;
- `requestCameraPermissionsAsync()` antes de abrir la cámara;
- si el permiso se deniega y `canAskAgain` es verdadero, se explica y se puede volver a solicitar;
- si ya no se puede preguntar, se ofrece `Linking.openSettings()`;
- si la foto es opcional, se permite continuar sin ella;
- si es obligatoria, el botón de avance y el de guardar se bloquean y se explica qué falta.

La ruta persistente se guarda en `foto_uri` (borrador y lectura). No se guarda la imagen en SQLite. La foto se conserva después del envío para mantener la evidencia del registro; no se borra al primer error de red.

La app no sube fotos a un servicio externo. `fotoUrl` queda en el modelo para una ampliación futura, pero no se usa.

## Consecuencias

- Se gana persistencia real de la imagen y una experiencia de cámara conocida para el técnico.
- Se acepta depender de dos módulos nativos y de los permisos del sistema; el APK debe incluirlos.
- Riesgo: el técnico puede denegar el permiso permanentemente y, si la foto es obligatoria, no podrá completar ese registro hasta habilitarlo en ajustes. La app lo explica y ofrece el acceso a ajustes.
- Riesgo: las fotos ocupan espacio. Se usa compresión 0.6 y se documenta que no hay limpieza automática; el respaldo se conserva por trazabilidad.
- Riesgo: en Android, la actividad puede ser destruida durante la captura. La app no implementa `getPendingResultAsync` en esta versión; si ocurre, el borrador sigue guardado y se puede reintentar la foto. Se registra como limitación.
- La foto se copia antes de asociarla al borrador; si la copia falla, no se muestra como si estuviera guardada.

## Verificación

1. Revisar `src/services/fotoService.ts` y `src/components/FotoMedidor.tsx`.
2. Verificar que la ruta copiada empieza por el directorio de documentos y no por la caché.
3. Tomar una foto, cerrar la app desde las recientes, volver a abrirla y comprobar que la imagen se ve en el borrador y en la lectura pendiente.
4. Denegar el permiso de cámara: la app debe explicar el motivo; con foto opcional debe dejar continuar, y con foto obligatoria debe bloquear y ofrecer ajustes.
5. Guardar una lectura sin conexión y reiniciar el teléfono; la foto debe seguir visible.
6. Revisar que `foto_uri` está en la fila de SQLite y que no hay base64 en la base.

## Uso de IA

La IA recomendó `expo-image-picker` + `expo-file-system` y descartó `expo-camera` porque la app solo necesita una captura de respaldo, no una experiencia de cámara embebida. También descartó guardar base64 en SQLite. Se aceptó la recomendación y se añadió la copia explícita a documentos, porque la URI del picker es temporal. El estudiante debe poder explicar la diferencia entre `Paths.cache` y `Paths.document`, y por qué la foto no se guarda como texto en la base.
