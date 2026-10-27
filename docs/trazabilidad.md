# Trazabilidad de requisitos

Mapa entre cada requisito de la prueba, su criterio de aceptación, el código que lo implementa y la evidencia disponible.

**Leyenda de evidencia**

- ✅ **Verificado en este entorno**: prueba automatizada, compilación o consulta al mock ejecutada durante el desarrollo.
- 🧪 **Verificable con el mock/emulador**: el código existe y el escenario está preparado, pero requiere un dispositivo o emulador para el recorrido visual.
- ⏳ **Pendiente de dispositivo**: solo puede confirmarse instalando el APK.

## Resumen

| Req. | Puntos | Implementación | Prueba clave | Estado |
|---|---|---|---|---|
| R1 | 1 | `sesionService.ts`, `sesionRepository.ts`, `_layout.tsx` | Recorrido manual | 🧪 |
| R2 | 1 | `validators.ts`, `buscar.tsx`, `medidoresService.ts` | `validators.test.ts` | ✅ |
| R3 | 2 | `medidoresService.ts`, `medidoresRepository.ts`, `medidor/[codigo].tsx` | `medidoresService` + mock | 🧪 |
| R4 | 1 | `registro/[codigo].tsx`, `lecturasService.ts`, `syncEngine.ts` | `syncEngine.test.ts` | ✅ |
| R5 | 2 | `validators.ts`, paso 1 del registro | `validators.test.ts` (9 casos) | ✅ |
| R6 | 1 | `consumo.ts`, `verificacion.ts`, paso 2 | `consumo.test.ts` | ✅ |
| R7 | 2 | `fotoService.ts`, `FotoMedidor.tsx`, validadores | `validators.test.ts` (foto) | 🧪 |
| R8 | 2 | `borradoresService.ts`, `borrador.tsx`, registro | Recorrido manual | 🧪 |
| R9 | 2 | `syncEngine.ts`, `AppProvider.tsx`, `ConnectionStrip.tsx` | `syncEngine.test.ts` (6 casos) | ✅ |
| R10 | 2 | `lecturasService.ts`, `UNIQUE` en `db.ts`, detalle de lectura | `validators` + mock + revisión de código | ✅/🧪 |

---

## R1 · Sesión persistente

**Criterio de la rúbrica:** después de cerrar y abrir la app, el técnico sigue identificado; al cerrar sesión se le vuelve a pedir código y clave.

**Implementación**

- `src/services/sesionService.ts`: valida contra `TECNICOS_DEMO` y llama al repositorio.
- `src/storage/sesionRepository.ts`: guarda una fila en la tabla `sesion`.
- `src/context/AppProvider.tsx`: `restaurarSesion()` al iniciar; expone `iniciarSesion` y `cerrarSesion`.
- `src/app/_layout.tsx`: si no hay sesión redirige a `/login`; si hay sesión y se está en login, redirige a `/`.

**Evidencia**

- La clave no se escribe en SQLite (solo `codigo_tecnico`, `nombre`, `zona`, `iniciada_en`).
- `cerrarSesion()` borra la fila y la guarda de navegación vuelve a `/login`.
- Recorrido manual: iniciar con `TEC-001 / agua2026`, matar la app, abrirla y comprobar que entra directo; cerrar sesión y comprobar que pide credenciales.

**Pendiente:** confirmar el cierre real del proceso en el APK.

---

## R2 · Validación estricta del código

**Criterio:** con un código incompleto o con formato distinto a `MED-` + seis dígitos, la app muestra el error y **no consulta ni muestra datos de ningún medidor**.

**Implementación**

- `src/utils/validators.ts`: `PATRON_CODIGO_MEDIDOR = /^MED-\d{6}$/`; rechaza espacios al inicio/fin y explica el formato.
- `src/app/(tabs)/buscar.tsx`: valida antes de navegar o consultar.
- `src/app/medidor/[codigo].tsx`: vuelve a validar antes de llamar al servicio.
- `src/services/medidoresService.ts`: tercera validación antes de tocar la red o la caché.

**Evidencia**

- `tests/validators.test.ts`:
  - acepta exactamente `MED-` + seis dígitos;
  - rechaza `MED-12345`, `MED-1234567`, `med-123456`, `MED-12345A`, `MED 123456`, vacío y con espacios.
- La validación ocurre antes de `consultarMedidor`, por lo que un código inválido no genera tráfico.

**Pendiente:** recorrido visual con el teclado del teléfono.

---

## R3 · Datos del medidor y caché

**Criterio:** con señal se muestran los siete datos; tras activar modo avión, una segunda consulta del mismo medidor muestra sus datos sin error.

**Implementación**

- `src/services/medidoresService.ts`:
  - si la copia se consultó **hoy** y no se fuerza la red, se devuelve desde SQLite;
  - si la copia es de otro día y hay red, se consulta la oficina;
  - sin red se devuelve la copia con advertencia;
  - si la consulta remota falla y hay copia, se conserva.
- `src/storage/medidoresRepository.ts`: `guardarMedidor` con `ON CONFLICT(codigo) DO UPDATE`.
- `src/app/medidor/[codigo].tsx`: muestra los siete campos, el origen (`Datos de oficina` / `Copia guardada`) y la fecha de la copia. El `RefreshControl` pasa `forzarRed = true`.
- `src/app/(tabs)/buscar.tsx` y `src/app/registro/[codigo].tsx` reutilizan la misma consulta.

**Evidencia**

- `mock-api/server.mjs`: `GET /medidores?codigo=MED-100001` responde los siete campos; probado con `curl` durante el desarrollo.
- La tabla `medidores_cache` guarda `consultado_en` y los siete datos.
- El aviso cambia de tono: informativo si la copia es de hoy y hay red; advertencia si es antigua o no hay conexión.

**Pendiente:** prueba física de modo avión. El escenario está listo: consultar `MED-100001`, activar modo avión, volver a abrirlo.

---

## R4 · Registro sin señal

**Criterio:** en modo avión se puede completar una lectura y queda marcada como pendiente de verificar (con la lectura anterior).

**Implementación**

- `src/app/registro/[codigo].tsx`: permite completar los tres pasos sin red si el medidor ya está en caché.
- `src/services/lecturasService.ts`: crea `estadoEnvio = 'pendiente'` y guarda `ultimaLecturaReferencia` y `consumoPromedioReferencia`.
- `src/services/syncEngine.ts`: al sincronizar, completa la referencia con el medidor del servidor si la copia local estaba incompleta.
- `src/app/(tabs)/lecturas.tsx`: filtro “Pendientes” y contador global.

**Evidencia**

- `tests/syncEngine.test.ts` prueba que una lectura se guarda, se envía y solo entonces cambia a `enviado`.
- `tests/syncEngine.test.ts` prueba que una lectura inaccesible se envía sin `lecturaActual`.
- La lectura pendiente se ve en Inicio, Mis lecturas y Perfil.

**Pendiente:** recorrido completo en modo avión con el APK.

---

## R5 · Tres estados del medidor

**Criterio:** normal exige lectura; inaccesible exige motivo y no permite lectura; dañado exige descripción y permite lectura vacía.

**Implementación**

- `src/utils/validators.ts`:
  - `validarDatosRegistro()` aplica reglas por estado;
  - `validarRegistroCompleto()` añade foto y confirmación;
  - `validarMotivoInaccesible()` (4–300) y `validarDescripcionDano()` (6–500).
- `src/app/registro/[codigo].tsx`: campos condicionales; al elegir inaccesible se oculta y limpia la lectura.
- `src/storage/db.ts`: `CHECK (tipo_estado IN ('normal', 'inaccesible', 'danado'))`.

**Evidencia**

- `tests/validators.test.ts`:
  - normal sin lectura → inválido;
  - normal con lectura válida → válido;
  - normal con lectura menor que la anterior → inválido;
  - inaccesible sin motivo → inválido;
  - inaccesible con motivo → válido y `lectura = null`;
  - dañado sin descripción → inválido;
  - dañado con descripción y lectura vacía → válido;
  - dañado con descripción y lectura válida → válido.

---

## R6 · Consumo y anomalía

**Criterio:** el consumo calculado es correcto; si supera el triple del promedio, la app advierte y exige confirmación del técnico.

**Implementación**

- `src/utils/consumo.ts`:
  - `consumo = actual − anterior`;
  - `umbral = 3 × promedio`;
  - anomalía solo si `consumo > umbral` (estrictamente).
- `src/utils/verificacion.ts`: `anomalia_pendiente` hasta que haya confirmación **y** foto; luego `anomalia_confirmada`.
- `src/app/registro/[codigo].tsx`: paso 2 muestra la advertencia, exige el `ChoiceCard` de confirmación y la foto.
- `src/services/syncEngine.ts`: vuelve a evaluar al enviar; si falta confirmación o foto, deja la lectura en `requiere_revision` y no la envía.

**Evidencia**

- `tests/consumo.test.ts`:
  - `100 → 160` con promedio 20: consumo 60, sin anomalía (60 = 3 × 20);
  - `100 → 161`: anomalía;
  - promedio 0: cualquier consumo positivo es anómalo;
  - sin lectura anterior o sin promedio: `evaluable = false`, no se inventa consumo.
- `tests/validators.test.ts`: foto y confirmación obligatorias con anomalía.
- `tests/syncEngine.test.ts`: una anomalía sin confirmación/foto no se envía.

---

## R7 · Foto obligatoria, persistente y permisos

**Criterio:** la foto se exige solo con anomalía o medidor dañado; la foto de una lectura pendiente sigue disponible tras reiniciar; con permiso denegado se explica el motivo.

**Implementación**

- `src/services/fotoService.ts`:
  - pide permiso con `ImagePicker.requestCameraPermissionsAsync()`;
  - lanza `PermisoCamaraError` con `canAskAgain`;
  - copia el archivo a `Paths.document/fotos-lecturas` antes de devolver la URI;
  - borra solo fotos huérfanas por conteo de referencias.
- `src/components/ui/FotoMedidor.tsx` y el paso 2 del registro: explican por qué se necesita la cámara y permiten continuar si la foto no es obligatoria.
- `src/utils/validators.ts`: `fotoEsObligatoria()` = anomalía o dañado.

**Evidencia**

- `tests/validators.test.ts`:
  - lectura normal sin anomalía → no exige foto;
  - medidor dañado → exige foto;
  - anomalía → exige foto y confirmación.
- La URI guardada apunta a `Paths.document`, no a la caché temporal.

**Pendiente:** denegar el permiso en un dispositivo y comprobar el texto; reiniciar el teléfono y verificar que la miniatura sigue cargando.

---

## R8 · Recuperación del borrador

**Criterio:** al quitar la app de recientes en medio de un registro y abrirla de nuevo, se ofrece continuar o descartar, y al continuar se conservan los datos ya ingresados.

**Implementación**

- `src/services/borradoresService.ts`: crear, guardar con debounce, obtener por técnico, descartar.
- `src/app/registro/[codigo].tsx`: persiste datos, paso y foto; un solo borrador activo por técnico; detecta conflicto al abrir otro medidor.
- `src/app/_layout.tsx`: al restaurar sesión, si hay borrador navega a `/borrador`.
- `src/app/borrador.tsx`: muestra medidor, paso y última actualización; botones Continuar / Descartar.
- `src/storage/lecturasRepository.ts`: guardar lectura + borrar borrador en una transacción.

**Evidencia**

- El borrador se escribe en SQLite, no en memoria.
- El paso se conserva (1, 2 o 3) y el formulario se restaura desde `datos_json`.
- Descartar pide confirmación y elimina la foto si nadie más la referencia.

**Pendiente:** el recorrido de “quitar de recientes” solo se puede hacer en dispositivo/emulador.

---

## R9 · Envío automático, idempotente e indicadores

**Criterio:** al recuperar conexión se envían solas; si se activa modo avión durante un envío, la lectura llega una sola vez; conexión y pendientes se ven en todas las pantallas.

**Implementación**

- `src/services/syncEngine.ts`: motor puro con dependencias inyectadas.
- `src/services/syncService.ts`: cableado con SQLite y `fetch`.
- `src/context/AppProvider.tsx`: listener de red, `AppState`, intervalo de 30 s, resumen y `sincronizarAhora`.
- `src/components/ui/ConnectionStrip.tsx`: franja de conexión + pendientes en todas las pantallas.
- `src/storage/lecturasRepository.ts`: `reclamarLecturaParaEnvio` evita que dos ejecuciones tomen la misma fila.

**Evidencia**

- `tests/syncEngine.test.ts`:
  - envía y marca enviada solo tras la respuesta;
  - no duplica si el POST se guardó pero la respuesta se perdió (busca por `localId`);
  - reintenta si la red falla antes de llegar al servidor;
  - recupera un 409 de `localId` duplicado sin marcarlo como error definitivo;
  - mantiene pendiente ante un 500;
  - no reenvía una lectura ya enviada.
- El mock permite simular fallos con `MOCK_FAIL_POSTS=3`.
- Prueba manual del contrato: `POST /lecturas` responde 201; repetir el mismo `localId` responde 409; otro medidor en el mismo periodo responde 409.

**Pendiente:** el corte real de red a mitad de un POST. El código está preparado para el caso “llegó pero no volvió la respuesta”.

---

## R10 · Corrección, inmutabilidad y duplicado mensual

**Criterio:** una lectura pendiente puede corregirse; una enviada no; un segundo registro del mismo medidor en el mismo mes se rechaza.

**Implementación**

- `src/services/lecturasService.ts`:
  - `corregirLectura()` rechaza `enviado` y `enviando`;
  - `guardarNuevaLectura()` busca `(codigo_medidor, periodo)` y lanza `LecturaDuplicadaError`.
- `src/storage/db.ts`: `UNIQUE (codigo_medidor, periodo)` y `UNIQUE(local_id)`.
- `src/app/lectura/[localId].tsx`: acciones de corregir/reintentar según estado.
- `src/app/medidor/[codigo].tsx`: si ya existe lectura del periodo, muestra un aviso con “Ver lectura” y, si es editable, “Corregir”.
- `src/utils/verificacion.ts`: `lecturaSePuedeCorregir()` solo para `pendiente` y `requiere_revision`.

**Evidencia**

- El mock devuelve `409 DUPLICADO_PERIODO` y se probó con `curl`.
- La base local rechaza el segundo `INSERT` aunque la comprobación previa se saltara.
- Las lecturas enviadas se muestran con badge “Enviada” y sin botón de edición.

**Pendiente:** recorrido visual de corregir una pendiente y comprobar que una enviada no muestra el botón.

---

## Requisito opcional · Subida de foto

No implementado. La app guarda la foto en el teléfono, envía `fotoArchivo` (nombre) y `fotoDisponible` al mock, pero no sube el binario ni guarda una URL pública. Se documenta como limitación en el README. El modelo ya tiene `foto_url` para una extensión futura.

---

## Matriz rápida para la defensa

| Lo que pedirá el docente | Dónde mostrarlo |
|---|---|
| Código inválido | Buscar → `MED-12` → error sin consulta |
| Siete datos y caché | `MED-100001`, modo avión, reabrir |
| Tres estados | Registro → cambiar entre normal/inaccesible/dañado |
| Consumo y anomalía | `MED-100001`, lectura 161 |
| Foto obligatoria | Anomalía o dañado; intentar continuar sin foto |
| Borrador | Empezar registro, matar app, reabrir |
| Sin señal | Modo avión, registrar, ver “Pendiente” |
| Envío automático | Quitar modo avión y ver el contador bajar |
| Registro duplicado | Registrar dos veces el mismo medidor en el mismo mes; la segunda vez debe avisar. `MED-100008` demuestra además el 409 del servidor al sincronizar. |
| Corrección | Abrir una pendiente, corregir; abrir una enviada y ver que no se puede |
