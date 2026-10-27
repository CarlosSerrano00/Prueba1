# Defensa oral · guion de 10 minutos

> Objetivo: demostrar que la app cumple R1–R10 y que el estudiante entiende y puede explicar cada decisión. No leer diapositivas: mostrar la app y abrir el código en los puntos marcados.

## Antes de entrar

1. Teléfono o emulador con el APK instalado y batería suficiente.
2. PC con el mock levantado: `npm run mock:reset`.
3. Verificar en **Perfil** que la URL responde (botón “Probar conexión”).
4. Sesión cerrada y app en la pantalla de login.
5. Tener a mano dos medidores: `MED-100001` (anomalía controlada) y `MED-100008` (duplicado de octubre).
6. Tener una lectura pendiente creada de antemano, para no depender del tiempo en la demo de sincronización.

## Guion

### 0:00–1:00 · Problema y arquitectura

**Decir:**

> “El problema no es solo registrar un número: es que la lectura y la foto no se pierdan cuando no hay señal, y que lleguen una sola vez a la oficina. Por eso el teléfono guarda primero en SQLite y la red se usa después. La app tiene tres capas: pantallas, servicios de dominio y almacenamiento. La lógica de validación y la de sincronización son funciones puras, por eso las puedo probar sin emulador.”

**Mostrar:** `src/` en el editor, en 5 segundos: `app/`, `services/`, `storage/`, `utils/`.

**No decir:** “usé IA para todo”. Decir qué se decidió y por qué.

### 1:00–3:00 · R1, R2 y R3

1. Login con `TEC-001 / agua2026`.
2. Cerrar la app y abrirla: sigue dentro (R1).
3. Ir a **Buscar**, escribir `MED-12` y pulsar buscar: error de formato, sin consulta (R2).
4. Escribir `MED-100001`: se ven dirección, sector, cuenta, estado, última lectura, fecha y promedio (R3).
5. Activar **modo avión**, volver a abrir el mismo medidor: se ven todos los datos con “Copia guardada” (R3).

**Decir:**

> “La validación del código está en una sola función y se usa en tres puntos: la pantalla, el detalle y el servicio. Así, aunque alguien navegue directo por URL, el servicio no consulta con un código inválido. La caché guarda todos los campos de la ficha y la fecha de consulta. Si ya consulté hoy, la entrego desde SQLite; si quiero forzar la oficina, deslizo hacia abajo.”

**Código para abrir:** `src/utils/validators.ts` (patrón) y `src/services/medidoresService.ts` (cache-first).

### 3:00–6:00 · R5, R6 y R7

1. Abrir `MED-100001` → **Registrar lectura**.
2. En el paso 1, abrir el calendario de **Fecha de registro**; mostrar que no permite fechas futuras y que el periodo cambia si se elige otro mes.
3. Probar **Normal** sin lectura: error.
4. Cambiar a **Inaccesible** sin motivo: error. Escribir un motivo: la lectura se oculta y no se registra.
5. Volver a **Normal**, escribir `161`. Aparece la advertencia de anomalía.
6. Intentar continuar sin confirmar y sin foto: no deja.
7. Confirmar la revisión y tomar la foto.
8. Explicar que con `160` el consumo es 60 y **no** hay anomalía, porque el límite es “más del triple”, no “igual o más”.

**Decir:**

> “El consumo es una resta, no una concatenación. El umbral es tres veces el promedio. Si el consumo supera estrictamente el umbral, la foto y la confirmación son obligatorias. Si el medidor está dañado, la foto también es obligatoria. En los demás casos la foto es opcional. La foto se copia de la caché de la cámara a la carpeta de documentos de la app, para que no desaparezca si el sistema limpia la caché.”

**Código para abrir:** `src/utils/consumo.ts` y `src/services/fotoService.ts`.

### 6:00–7:30 · R8 · Borrador

1. Empezar un registro de otro medidor, escribir una lectura y avanzar al paso 2 sin guardar.
2. Salir de la app (no cerrar sesión) y volver a abrirla.
3. Aparece **Captura sin terminar**. Mostrar medidor, paso y fecha.
4. **Continuar**: los datos siguen ahí.
5. Volver a salir y elegir **Descartar**: pide confirmación.

**Decir:**

> “El borrador se guarda con un retraso de 400 milisegundos para no escribir en SQLite en cada tecla. Guarda el paso, los datos y la foto. Solo hay un borrador activo por técnico. Al guardar la lectura definitiva, la inserción y el borrado del borrador van en una sola transacción, para que no quede un borrador fantasma.”

**Código para abrir:** `src/app/_layout.tsx` (detección) y `src/services/borradoresService.ts`.

### 7:30–9:00 · R4 y R9 · Sin señal y sincronización

1. Con modo avión, guardar una lectura normal en `MED-100002`.
2. Mostrar en **Inicio** y **Mis lecturas** que aparece como pendiente y que la franja indica “Sin conexión”.
3. Quitar el modo avión.
4. Mostrar cómo el contador baja y la lectura pasa a “Enviada”.

**Decir:**

> “El envío se dispara al recuperar la conexión, al volver la app al frente y cada 30 segundos si hay pendientes. Antes de enviar, la app busca su `localId` en la oficina. Si el POST anterior llegó pero la respuesta se perdió, lo encuentra y no duplica. Solo marca enviada con una respuesta 2xx o con la lectura ya existente. Si hay un 409 por medidor y periodo, no es un error de red: pasa a revisión.”

**Código para abrir:** `src/services/syncEngine.ts` (buscar `buscarLecturaRemota` y `marcarEnviada`).

**Si preguntan por el corte a mitad de envío:**

> “El estado `enviando` funciona como bloqueo. Si la app muere en ese estado, al arrancar `resetearEnviosInterrumpidos()` lo devuelve a pendiente. El próximo intento primero busca el `localId`; por eso no se duplica.”

### 9:00–10:00 · R10 y cierre

1. Abrir la lectura enviada: no hay botón de edición.
2. Abrir una pendiente: sí se puede corregir.
3. Volver a abrir un medidor que ya tiene lectura local de octubre: aparece “Ya hay una lectura de octubre” y no deja crear otra.

**Decir:**

> “La regla de una lectura por medidor y mes está en tres capas: la pantalla avisa, el servicio consulta antes de insertar y SQLite tiene una restricción UNIQUE. La base es la última defensa. Una lectura enviada es inmutable: no se puede corregir ni desde la pantalla ni desde el servicio.”

**Si queda tiempo:** guardar `MED-100008`, que ya tiene una lectura de octubre en MockAPI, y sincronizar. El servidor responde 409 y la lectura pasa a “requiere revisión”. Eso demuestra que la oficina también rechaza el duplicado aunque el teléfono no lo conociera.

**Cierre visual:** abrir la ficha de `MED-100001` → **Editar**, cambiar la fecha con el calendario y guardar. Recorrer login, tab bar flotante, tarjetas y alertas para mostrar el Claymorphism.

**Cerrar:**

> “Lo que no está terminado es la prueba en dispositivo: el APK se compiló en EAS, pero en mi entorno no había emulador para instalarlo y recorrerlo. Preferí no afirmar que estaba probado. La lógica de dominio, fechas, contrato remoto y sincronización sí está cubierta con 55 pruebas automatizadas.”

---

## Preguntas probables y respuestas cortas

### 1. ¿Por qué SQLite y no AsyncStorage?

Porque necesito consultas, restricciones de unicidad y transacciones. AsyncStorage guarda cadenas por clave; no me da `UNIQUE(codigo_medidor, periodo)` ni puedo borrar el borrador y guardar la lectura en una transacción.

### 2. ¿Por qué no usaste TanStack Query?

La caché de TanStack vive en memoria y está pensada para estado remoto. R3 exige persistencia y R9 exige una cola con estados. Igual habría necesitado SQLite para lecturas, borradores y duplicados. Añadir la librería no eliminaba el trabajo principal.

### 3. ¿Cómo evitas duplicados si se corta la red?

Cada lectura nace con un `localId` generado en el teléfono. Antes de cada POST se consulta `GET /lecturas?localId=...`. Si ya existe, se marca enviada sin volver a crearla. Si el POST responde 409 por `localId`, también se busca y se marca enviada. El `localId` es la clave de idempotencia.

### 4. ¿Qué pasa si el servidor devuelve 409 por medidor y periodo?

No es un duplicado de envío: es un conflicto de negocio. La lectura pasa a `requiere_revision`, se muestra el motivo y el técnico decide corregir o registrar una incidencia. No se reintenta en bucle.

### 5. ¿Por qué la foto se copia y no se guarda solo la URI?

Porque `expo-image-picker` entrega la foto en la caché temporal. El sistema puede limpiarla o el teléfono reiniciarse. R7 exige que la foto de una pendiente siga disponible días después. La copia a `Paths.document/fotos-lecturas` resuelve eso.

### 6. ¿Cómo sabes si hay conexión?

Con `expo-network` y `AppState`. Escucho cambios, reviso al volver al frente y cada 30 segundos. Considero “en línea” si `isConnected !== false`, no si hay Internet, porque el mock puede estar en la red local sin salida a Internet.

### 7. ¿Por qué el consumo 60 con promedio 20 no es anomalía?

Porque el requisito dice “supera el triple”. 60 es igual a 3 × 20, no lo supera. La comparación es estricta: `consumo > promedio * 3`.

### 8. ¿Qué pasa si falta la lectura anterior o el promedio?

No se inventa un consumo. La evaluación queda `evaluable = false` y el estado de verificación es `pendiente`. Al sincronizar, si el medidor local está incompleto, se consulta la oficina y se vuelve a evaluar antes de enviar.

### 9. ¿Cómo se conserva el borrador si la app se cierra?

Se guarda en SQLite con debounce de 400 ms. Al arrancar, `AppProvider` restaura la sesión, busca el borrador del técnico y `_layout.tsx` navega a `/borrador`. El borrador tiene el paso, los datos serializados y la foto.

### 10. ¿Por qué un solo borrador por técnico?

Porque el flujo de campo es secuencial y el enunciado habla de “la captura pendiente”. Permitir varios obliga a diseñar una bandeja de borradores y a decidir cuál ofrecer. Si se intenta abrir otro medidor, se ofrece continuar, descartar o cancelar.

### 11. ¿Qué pasa si el permiso de cámara está denegado?

Se muestra un mensaje que explica para qué se usa la cámara. Si la foto no es obligatoria, se puede continuar. Si es obligatoria (anomalía o dañado), no se puede guardar hasta tener la foto; si el permiso está bloqueado, se ofrece abrir los ajustes.

### 12. ¿Cómo se prueba la sincronización sin emulador?

El motor `syncEngine.ts` recibe sus dependencias como interfaz. En las pruebas se le pasan funciones en memoria que simulan un POST exitoso, un 409, un 500 o un corte de red. Así se prueban los casos difíciles sin depender de la señal real.

### 13. ¿Por qué Expo Router?

Porque el proyecto ya usa Expo y Router da rutas por archivos, tipadas, con grupos como `(tabs)` y rutas dinámicas como `medidor/[codigo]`. Evita mantener un navegador manual y encaja con el template de SDK 57.

### 14. ¿Qué dependencias agregaste y para qué?

- `expo-sqlite`: persistencia y unicidad.
- `expo-image-picker`: cámara.
- `expo-file-system`: copiar la foto a documentos.
- `expo-network`: detectar conexión.
- `@react-native-community/datetimepicker`: selector nativo de fechas.
- `@expo/vector-icons`: iconos (ya venía con Expo).
- `tsx` y `@types/node`: ejecutar pruebas TypeScript con `node:test`.
- `eslint` y `eslint-config-expo`: lint.

Cada una tiene su ADR. No se instalaron Axios, TanStack Query, Zustand, Redux, Zod, Formik ni una librería de UI.

### 15. ¿Por qué usaste un selector nativo de fechas?

Porque los campos `fechaUltimaLectura` y `fechaRegistro` son Date en MockAPI. Escribir la fecha a mano produce errores de formato y días imposibles. `CampoFecha` usa el diálogo nativo en Android, un modal en iOS y un campo de respaldo en web. La regla de dominio vuelve a validar: no fechas futuras y, en lecturas nuevas, máximo un año atrás.

### 16. ¿Cómo evitas que una fecha se corra un día por UTC?

Los campos de día se guardan como `YYYY-MM-DD` y se interpretan a mediodía local. Una fecha de MockAPI que llega como medianoche UTC se trata como el mismo día calendario. Para `fechaRegistro`, que es un instante, se envía ISO completo. No uso `new Date('2026-09-20')` para los campos de día.

### 17. ¿Qué campos se envían a MockAPI?

Solo los del seed. `/lecturas` recibe nueve campos y `/medidores/:id` ocho. La foto, el motivo, la descripción del daño y el consumo calculado son locales. `tests/contratoRemoto.test.ts` comprueba que no se filtren campos extra.

### 18. ¿Qué es Claymorphism y por qué?

Es una identidad de superficies blandas: bordes claros y oscuros, sombras suaves, campos hundidos y radios grandes. Se eligió frente a flat, glassmorphism y neumorphism porque da personalidad sin sacrificar contraste. Los estados siempre llevan texto e icono, no solo color; las áreas táctiles miden al menos 48 px. Está en `src/constants/ui.ts` y el ADR-014.

### 19. ¿Qué harías con más tiempo?

- Subir la foto a un almacenamiento externo y guardar la URL (requisito opcional).
- Backoff exponencial y cola con prioridad.
- Pruebas de integración con SQLite real.
- Probar el APK en varios tamaños de pantalla y con permiso de cámara denegado.
- Sincronizar cambios de medidor y lecturas de otros técnicos.

---

## Trampas que evitar

- **No decir** “está probado en el teléfono” si no se instaló el APK.
- **No decir** “la caché se actualiza sola en segundo plano”: la estrategia real es cache-first por jornada y actualización explícita al deslizar.
- **No confundir** “enviado” con “guardado”: guardar solo crea la lectura local; enviado significa que la oficina confirmó.
- **No decir** que la foto se sube al servidor: se guarda en el teléfono y el contrato remoto no tiene campo de foto.
- **No justificar** una dependencia con “es la más popular”. Justificarla con el requisito que resuelve.

## Código mínimo que conviene saber de memoria

```ts
// R2
const PATRON_CODIGO_MEDIDOR = /^MED-\d{6}$/;

// R6
const consumo = lecturaActual - ultimaLectura;
const anomalia = consumo > promedio * 3; // estricto

// R9
const existente = await buscarLecturaRemota(localId);
if (existente) return marcarEnviada(localId, existente.id);

// R10
UNIQUE (codigo_medidor, periodo)
```

Si se puede explicar estas cuatro líneas con el flujo que las rodea, la defensa está cubierta.
