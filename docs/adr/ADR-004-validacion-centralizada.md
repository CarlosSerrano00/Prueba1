# ADR-004: Centralizar la validación en funciones puras y repetir las reglas en la capa de servicios

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R2, R5, R6, R7 y R10.

## Contexto

Hay reglas que no pueden depender de que un botón esté deshabilitado:

- `MED-` seguido de exactamente seis dígitos, sin espacios;
- lectura obligatoria para estado normal;
- motivo obligatorio para inaccesible y lectura prohibida;
- descripción obligatoria para dañado y lectura opcional;
- lectura actual no menor que la última conocida;
- consumo calculado con números, no con texto;
- anomalía solo si el consumo supera estrictamente el triple del promedio;
- foto obligatoria si hay anomalía o daño;
- confirmación explícita si hay anomalía;
- un solo registro por medidor y periodo.

La interfaz debe mostrar mensajes claros, pero el servicio y la persistencia deben rechazar los mismos casos aunque la pantalla tenga un error. Además, las respuestas del sistema de oficina pueden venir incompletas o con tipos inesperados.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Funciones puras propias + validación en servicio y base de datos | Cero dependencias; mensajes en español ajustados a las reglas; se pueden probar sin React Native; una misma función se usa en la pantalla y en el servicio. | Hay que escribir las funciones y mantenerlas; no hay inferencia automática de tipos. |
| Zod | Esquemas declarativos, inferencia de TypeScript, buenos mensajes. | Añade una dependencia para un conjunto pequeño de reglas; los mensajes de negocio siguen necesitando una capa propia; la validación de unicidad y de foto depende de la base y de la cámara, no del esquema. |
| Validar solo en la interfaz | Menos código; el usuario ve el error de inmediato. | No cumple la exigencia de no depender de ocultar botones. Un bug de navegación o una llamada directa al servicio podría guardar datos inválidos. |
| Validar solo en el servicio | Una sola fuente de verdad. | La experiencia sería pobre: el técnico descubriría el error al final, después de varios pasos y de tomar una foto. |

## Decisión

Se combinan tres capas:

1. **Funciones puras** en `src/utils/`:
   - `validarCodigoMedidor`;
   - `validarLecturaNumerica`;
   - `evaluarRegistro` (estado, campos y foto obligatoria);
   - `calcularConsumo` y `evaluarAnomalia`.
2. **Servicio de negocio** en `src/services/lecturasService.ts`: vuelve a aplicar las reglas antes de guardar y lanza `ReglaNegocioError` con un código estable (`CODIGO_INVALIDO`, `LECTURA_MENOR`, `FOTO_OBLIGATORIA`, `DUPLICADO`, `LECTURA_ENVIADA`, etc.).
3. **Persistencia**: `UNIQUE (codigo_medidor, periodo)` en SQLite y un `UPDATE` condicionado por `estado_envio` para impedir modificar una lectura enviada.

Los parsers de respuesta remota (`src/services/apiParsers.ts`) comprueban tipos y campos obligatorios antes de convertir una respuesta en `MedidorRemoto` o `LecturaRemota`. Una respuesta inválida produce `ApiError` de tipo `respuesta` y no se guarda en caché.

No se instala Zod.

## Consecuencias

- Se gana una sola definición de las reglas, reutilizada por la interfaz y por el servicio.
- Los mensajes de error son específicos y en español, sin traducciones genéricas.
- Se acepta duplicar la invocación de la validación (pantalla y servicio) para defensa en profundidad. No se duplica la lógica: se llama a la misma función.
- Riesgo: alguien podría agregar una regla solo en la pantalla. Se revisa en la defensa y las pruebas del servicio cubren los casos críticos.
- Riesgo: el parser manual es más verboso que un esquema. A cambio, no se agrega una dependencia y se controla exactamente qué se acepta.

## Verificación

1. Revisar `src/utils/validators.ts`, `src/utils/consumo.ts`, `src/services/lecturasService.ts` y `src/services/apiParsers.ts`.
2. Ejecutar `npm test`: deben pasar las pruebas de código inválido, los tres estados, consumo, anomalía estricta y foto obligatoria.
3. En la app, intentar guardar cada combinación inválida de R5 y comprobar que el mensaje aparece antes de escribir en SQLite.
4. Revisar que una respuesta de API sin `codigo` o con `ultimaLectura` de tipo incorrecto no se guarda en caché.
5. Confirmar que un `UPDATE` sobre una lectura enviada devuelve cero cambios y que el servicio lanza un error.

## Uso de IA

La IA propuso funciones puras y descartó Zod para no agregar una dependencia por un conjunto pequeño de reglas que, además, incluye condiciones que un esquema de datos no puede resolver (unicidad mensual, foto obligatoria, lectura enviada). Se aceptó la recomendación. También se aceptó separar los parsers de respuesta para no confundir "dato remoto inválido" con "formulario inválido". El estudiante debe poder explicar por qué la validación se repite en el servicio aunque la pantalla ya muestre el error.
