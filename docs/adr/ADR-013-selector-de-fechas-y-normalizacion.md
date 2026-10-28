# ADR-013: Usar un selector nativo para los campos Date y normalizar el día calendario

## Estado

Aceptado.

## Fecha

2026-10-27.

## Requisitos relacionados

R3, R5, R6, R9 y R10. La fecha de la lectura define el periodo mensual y, por tanto, la detección de duplicados. La fecha de la última lectura forma parte de la ficha del medidor.

## Contexto

MockAPI define `medidores.fechaUltimaLectura` y `lecturas.fechaRegistro` como campos de tipo Date. En el seed, la primera llega como día (`2026-09-20`) y la segunda como instante ISO (`2026-09-18T15:20:00.000Z`).

Escribir fechas a mano en un `TextInput` produce errores frecuentes en campo: formatos distintos, días imposibles, fechas futuras y desplazamientos de un día por UTC. El técnico trabaja con una mano y necesita elegir una fecha con el menor número de toques posible.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `TextInput` con validación de texto | Cero dependencias; funciona en web. | Errores de formato, teclado numérico incómodo, no evita fechas imposibles ni futuras; no es un datepicker real. |
| Calendario propio con `Pressable` | Control visual total. | Mucho código, accesibilidad y navegación por meses que hay que probar; no aporta valor al dominio. |
| `@react-native-community/datetimepicker` | Selector nativo de Android e iOS; respeta mínimo/máximo; se integra con Expo; una sola dependencia mantenida. | Requiere build nativo (no basta con recargar JavaScript); el comportamiento visual difiere entre plataformas. |
| Librería de calendario de terceros | Componente completo. | Dependencia grande, estilo difícil de alinear con Claymorphism y otra API que mantener. |

## Decisión

Se usa `@react-native-community/datetimepicker` a través de `src/components/ui/CampoFecha.tsx`:

- Android abre el diálogo nativo de calendario;
- iOS abre un modal con selector tipo spinner y botones Cancelar/Usar fecha;
- web usa un campo `AAAA-MM-DD` como respaldo, porque el selector nativo no existe allí.

Las reglas de fecha viven en `src/utils/fechas.ts`:

- los campos de día calendario se guardan como `YYYY-MM-DD`;
- las fechas de MockAPI que llegan como medianoche UTC se interpretan como el mismo día calendario, no como la noche anterior en Quito;
- `fechaUltimaLectura` admite desde `2000-01-01` hasta hoy;
- la fecha de una lectura nueva debe estar entre un año atrás y hoy;
- una lectura debe tener fecha;
- al corregir una lectura existente se conserva la fecha original y no se vuelve a validar el límite de un año, para no bloquear correcciones de registros antiguos;
- si la lectura de referencia está vacía, la fecha de última lectura también debe estarlo, y viceversa.

`fechaRegistro` se envía como instante ISO. Si el técnico elige el día de hoy se conserva la hora real de guardado; si elige un día pasado se usa el mediodía local como instante estable para no mover el día por zona horaria.

## Consecuencias

- Se gana una captura de fechas guiada, con mínimo/máximo y validación doble (componente y dominio).
- Se agrega una dependencia nativa. El APK y los development builds la incluyen; Expo Go puede no incluirla, así que la verificación debe hacerse con el build de desarrollo o con el APK.
- El día calendario y el instante ISO se tratan de forma distinta a propósito. No se convierten fechas de día a `Date` con `new Date('YYYY-MM-DD')`, porque eso interpreta UTC y puede restar un día.
- En web el respaldo es un campo de texto; la validación de dominio sigue impidiendo fechas inválidas o futuras.
- La fecha de un registro corregido no cambia, aunque la corrección se haga otro día.

## Verificación

1. Abrir el paso 1 de una captura y comprobar que se abre el calendario nativo y que no se pueden elegir fechas futuras.
2. Elegir una fecha del mes anterior y verificar que el periodo del resumen cambia.
3. Guardar una lectura y comprobar que `fechaRegistro` y `periodo` son coherentes.
4. Editar una lectura pendiente y comprobar que la fecha aparece bloqueada y no cambia al guardar.
5. Editar un medidor, vaciar la fecha y la última lectura, guardar, y comprobar que MockAPI acepta `null` en ambos campos.
6. Ejecutar `npm test`: las pruebas de fechas, rangos y coherencia deben pasar.
7. Revisar que `app.json` incluye el plugin `@react-native-community/datetimepicker`.


