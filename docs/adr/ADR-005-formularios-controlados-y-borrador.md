# ADR-005: Usar formularios controlados con `useState` y persistir un borrador por paso

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R5, R6, R7 y R8.

## Contexto

El registro de una lectura tiene tres pasos (datos, foto y resumen), campos que cambian según el estado del medidor y reglas que dependen de valores calculados. El técnico puede cerrar la aplicación en cualquier momento y debe poder continuar donde se quedó.

Las librerías de formularios suelen optimizar formularios grandes y validaciones de esquemas. Aquí el formulario tiene pocos campos, pero necesita guardar un borrador en SQLite y restaurar el paso. También necesita limpiar campos cuando cambia el estado seleccionado y mostrar una advertencia de anomalía en tiempo real.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `useState` controlado + borrador SQLite | Sin dependencias; cada campo es explícito; fácil de mapear a un borrador; se puede guardar en cada cambio o al avanzar; el paso se controla con estado local + SQLite. | Más cableado manual; cada campo necesita su `onChangeText`; hay que cuidar los re-renderizados y el debounce de guardado. |
| React Hook Form | Menos re-renderizados; registro de campos y validación integrada. | Añade una dependencia; su modelo está pensado para formularios grandes y validación por esquema. La persistencia del borrador seguiría siendo manual, y los campos condicionales por estado requieren lógica adicional. |
| Formik | API conocida para formularios controlados y validación. | Dependencia más pesada; para tres pasos y seis campos no reduce el trabajo de persistencia ni el de las reglas de negocio. |
| Guardar el formulario solo al pulsar "Guardar" | Menos escrituras en SQLite. | Incumple R8: si la app se cierra a mitad del proceso, se pierden los datos. |

## Decisión

Se usan formularios controlados con `useState` en la pantalla del registro. El estado del formulario es:

```ts
type DatosFormulario = {
  tipoEstado: 'normal' | 'inaccesible' | 'danado';
  lecturaActual: string;        // se conserva como texto mientras se edita
  motivoInaccesible: string;
  descripcionDano: string;
  confirmacionRevision: boolean;
};
```

El borrador se persiste en SQLite con:

- `local_id` estable, generado al iniciar la captura;
- `codigo_medidor`;
- `paso` actual (1, 2 o 3);
- `datos_json` con el formulario;
- `foto_uri`;
- `lectura_local_id` cuando el borrador es una corrección de una lectura existente;
- fechas de creación y actualización.

Se guarda con un debounce de 400 ms mientras el técnico escribe y de forma inmediata al cambiar de paso. La foto se guarda como archivo persistente y su ruta se actualiza en el borrador.

Política de borradores: **como máximo uno activo**. Si se intenta iniciar otra captura con un borrador existente, la app ofrece continuar el borrador, descartarlo y empezar, o cancelar. Esto evita registros simultáneos y hace explícita la recuperación de R8.

No se instala React Hook Form ni Formik.

## Consecuencias

- Se gana control directo sobre el borrador y sobre la restauración del paso.
- Se acepta más código de formulario; es código visible y fácil de explicar en la defensa.
- Riesgo: el debounce puede perder los últimos caracteres si la app se cierra en los 400 ms posteriores a la última tecla. Se mitiga guardando también al cambiar de paso, al perder el foco y antes de tomar una foto.
- Riesgo: escribir en SQLite en cada tecla sin debounce degradaría la experiencia. Por eso se usa debounce y no se guarda en cada pulsación.
- El formulario no se comparte por Context: vive en la pantalla y se reconstruye desde el borrador.

## Verificación

1. Revisar `src/app/registro/[codigo].tsx`, `src/storage/borradoresRepository.ts` y `src/services/borradoresService.ts`.
2. Iniciar una captura, completar datos, avanzar al paso 2, cerrar la app desde las recientes y abrirla.
3. Comprobar que la pantalla de recuperación ofrece continuar o descartar.
4. Al continuar, verificar que los campos y el paso son los mismos.
5. Al descartar, comprobar que se elimina el borrador y su foto, pero no las lecturas ya guardadas.
6. Ejecutar `npm test` para las reglas de foto obligatoria y estado; el comportamiento de persistencia se verifica en el dispositivo.


