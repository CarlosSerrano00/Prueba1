# Arquitectura de AquaRuta

## 1. Objetivo

AquaRuta debe permitir que un técnico de EPMAPS complete una lectura de medidor en campo **sin depender de la señal**, conserve la foto y los datos aunque cierre la aplicación, y envíe todo al sistema de oficina **una sola vez** cuando vuelva la conexión.

La arquitectura prioriza tres cosas:

1. **El teléfono es la fuente de verdad mientras no haya red.** Toda lectura nace en SQLite con un `localId` propio.
2. **La red es un detalle reemplazable.** El dominio no conoce `fetch`; los servicios traducen entre la API y los modelos locales.
3. **La sincronización es explícita y verificable.** Nunca se marca una lectura como enviada sin una confirmación del servidor.

## 2. Vista de capas

```text
┌─────────────────────────────────────────────────────────────┐
│ Presentación · src/app, src/components/ui                    │
│ Pantallas, navegación, formularios controlados, avisos       │
└──────────────────────────────┬──────────────────────────────┘
                               │ hooks / casos de uso
┌──────────────────────────────▼──────────────────────────────┐
│ Estado de aplicación · src/context/AppProvider.tsx           │
│ Sesión, conectividad, resumen, borrador, sincronización      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Dominio y servicios · src/services, src/utils                │
│ Validaciones, consumo, fotos, API, motor de sincronización   │
│ Sin dependencia de React ni de SQLite en la lógica pura      │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
┌───────────────▼──────────────┐ ┌─────────────▼───────────────┐
│ Persistencia · src/storage    │ │ Red · apiClient / fetch      │
│ SQLite: tablas y repositorios │ │ MockAPI /medidores, /lecturas │
└───────────────────────────────┘ └──────────────────────────────┘
```

### Por qué esta separación

- Las **funciones puras** (`validators.ts`, `validacionesEntidades.ts`, `fechas.ts`, `consumo.ts`, `verificacion.ts`, `periodo.ts`, `contratoRemoto.ts`) se prueban con `node:test` sin emulador.
- El **motor de sincronización** (`syncEngine.ts`) recibe sus dependencias como interfaz. En producción usa SQLite y `fetch`; en las pruebas usa arrays y funciones falsas. Así se puede simular un corte de red sin un dispositivo.
- `AppProvider` es el único estado global. Evita que cada pantalla consulte la base por su cuenta para saber cuántas lecturas quedan pendientes.

## 3. Modelo de datos local

Base: `aquaruta.db` (SQLite, WAL, claves foráneas activas). Esquema versionado con `PRAGMA user_version`.

### `sesion`

Una sola fila (`CHECK (id = 1)`).

| Campo | Uso |
|---|---|
| `codigo_tecnico`, `nombre`, `zona` | Técnico autenticado |
| `iniciada_en` | Fecha de inicio de jornada |

La clave **no** se guarda. Se valida contra `src/constants/tecnicos.ts` al iniciar sesión.

### `medidores_cache`

Copia persistente de los datos de la ficha de R3:

| Campo | Dato de la oficina |
|---|---|
| `codigo` | Código de etiqueta (clave primaria) |
| `direccion` | Dirección |
| `sector` | Sector |
| `numero_cuenta` | Número de cuenta |
| `estado` | Estado del medidor |
| `ultima_lectura` | Última lectura |
| `fecha_ultima_lectura` | Fecha de la última lectura |
| `consumo_promedio_mensual` | Consumo promedio mensual |
| `consultado_en` | Cuándo se guardó la copia |

### `lecturas`

| Grupo | Campos |
|---|---|
| Identidad | `local_id` (PK), `id_remoto`, `codigo_medidor`, `medidor_id`, `codigo_tecnico` |
| Tiempo | `fecha_registro`, `periodo` (`YYYY-MM`), `creado_en`, `actualizado_en` |
| Captura | `tipo_estado`, `lectura_actual`, `motivo_inaccesible`, `descripcion_dano` |
| Referencia | `ultima_lectura_referencia`, `consumo_promedio_referencia`, `consumo_calculado` |
| Evidencia | `foto_uri`, `foto_url`, `confirmacion_revision` |
| Verificación | `estado_verificacion` |
| Envío | `estado_envio`, `intentos_envio`, `fecha_envio`, `mensaje_error` |

Restricción clave:

```sql
UNIQUE (codigo_medidor, periodo)
```

Es la última defensa contra dos lecturas del mismo medidor en el mismo mes (R10), incluso si la interfaz falla.

### `borradores`

Un registro por captura en curso. Guarda `codigo_medidor`, `codigo_tecnico`, `paso` (1–3), los datos del formulario serializados en `datos_json`, la foto y, si se estaba corrigiendo, `lectura_local_id`.

### `configuracion`

Pares clave/valor. Se usa para la URL del sistema de oficina (`url_api`).

### Contrato remoto de MockAPI

La raíz por defecto es `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`; los recursos son `/medidores` y `/lecturas`. La ruta `/recursos` del panel de MockAPI **no** es un endpoint: devuelve 404.

`src/utils/contratoRemoto.ts` es el único lugar que arma los cuerpos remotos. El seed `mock-api/seed.json` manda: no se agregan campos de apoyo local.

| Recurso | Campos remotos |
|---|---|
| `medidores` | `codigo`, `direccion`, `sector`, `numeroCuenta`, `estado`, `ultimaLectura`, `fechaUltimaLectura`, `consumoPromedioMensual` |
| `lecturas` | `localId`, `medidorId`, `codigoMedidor`, `codigoTecnico`, `fechaRegistro`, `periodo`, `tipoEstado`, `lecturaActual`, `estadoVerificacion` |

`medidores.fechaUltimaLectura` se guarda como día `YYYY-MM-DD`; `lecturas.fechaRegistro` se envía como instante ISO. La foto, el motivo, la descripción del daño y el consumo calculado **no** viajan a MockAPI: quedan en SQLite y se usan para reglas locales.

`scripts/seed-mockapi.mjs` siembra los datos de demostración de forma idempotente (por `codigo` y `localId`). MockAPI no impone unicidad de negocio; la idempotencia de envío sigue siendo responsabilidad del cliente.

## 4. Estados

### Estado del medidor capturado (`tipo_estado`)

| Estado | Lectura | Campo obligatorio | Foto |
|---|---|---|---|
| `normal` | Obligatoria, ≥ 0 y no menor que la anterior | — | Opcional, salvo anomalía |
| `inaccesible` | Prohibida (`null`) | `motivo_inaccesible` (4–300 caracteres) | Opcional |
| `danado` | Opcional | `descripcion_dano` (6–500 caracteres) | **Obligatoria** |

### Verificación (`estado_verificacion`)

| Valor | Cuándo |
|---|---|
| `no_aplica` | Inaccesible o sin lectura |
| `pendiente` | Falta lectura anterior o promedio; no se puede evaluar |
| `verificada` | Consumo calculado y no anómalo |
| `anomalia_confirmada` | Anomalía + confirmación + foto |
| `anomalia_pendiente` | Anomalía sin confirmación o sin foto |

### Envío (`estado_envio`)

```text
                  guardar
                    │
                    ▼
              ┌───────────┐   error de red / 5xx   ┌───────────┐
              │ pendiente │◄───────────────────────│ enviando  │
              └─────┬─────┘                        └─────┬─────┘
                    │                                    │
      regla de negocio│                       2xx o ya existe
      incumplida      │                       en la oficina
                    ▼                                    ▼
          ┌──────────────────┐                    ┌──────────┐
          │ requiere_revision│                    │ enviado  │
          └──────────────────┘                    └──────────┘
```

- `pendiente` → se intenta enviar.
- `enviando` → bloqueo temporal para que dos ejecuciones simultáneas no reclamen la misma lectura. Si la app muere en este estado, al arrancar `resetearEnviosInterrumpidos()` lo devuelve a `pendiente`.
- `enviado` → inmutable. No se puede corregir.
- `requiere_revision` → el técnico debe corregir algo (por ejemplo, lectura menor que la anterior, falta de foto o duplicado mensual detectado por el servidor).

## 5. Flujos principales

### 5.1 Inicio y restauración de sesión

```text
Abrir app
  → AppProvider.init
  → resetearEnviosInterrumpidos()
  → restaurarSesion() desde SQLite
  → si hay sesión: tabs; si no: /login
```

El login valida código y clave contra datos quemados. Al cerrar sesión se borra solo la fila de `sesion`; las lecturas y borradores del técnico se conservan (el enunciado no pide borrarlos).

### 5.2 Consulta de un medidor (R2/R3)

```text
Buscar (código)
  → validarCodigoMedidor()          ← no llama a la red si falla
  → consultarMedidor(codigo, enLinea, forzarRed?)
      ├─ caché consultada hoy y !forzarRed → devolver caché
      ├─ sin red y hay caché            → devolver caché + aviso
      ├─ con red                        → GET /medidores?codigo=...
      │     ├─ éxito → guardarMedidor() → devolver remoto
      │     └─ fallo y hay caché → devolver caché + aviso
      └─ sin caché y sin red → error explicativo
```

Detalle de la pantalla: `src/app/medidor/[codigo].tsx`. El gesto de actualizar (`RefreshControl`) pasa `forzarRed = true`, por lo que vuelve a consultar la oficina aunque la copia sea de hoy.

### 5.3 Captura en tres pasos (R5–R8)

1. **Estado y datos.** Elección entre normal / inaccesible / dañado; campos condicionales. La fecha de registro se elige con `CampoFecha` (calendario nativo en Android/iOS) y se valida contra un año atrás y hoy. La validación de este paso no exige foto.
2. **Foto y advertencia.** Se evalúa el consumo. Si hay anomalía, se muestra la advertencia, se exige confirmación y la foto pasa a ser obligatoria. Si el medidor está dañado, la foto también es obligatoria. En el resto de casos se puede continuar sin foto.
3. **Resumen y guardado.** Se revisa todo, incluidos fecha y periodo derivado, y se guarda como lectura pendiente.

La fecha se guarda como día calendario en el formulario; al guardar se convierte a instante ISO. Si el día elegido es hoy se conserva la hora real; para días pasados se usa el mediodía local para que la zona horaria no mueva el día. Al corregir una lectura existente, la fecha original no cambia.

La foto se toma con `expo-image-picker` y se **copia** de la caché temporal a `Paths.document/fotos-lecturas` antes de guardar la URI. Así sobrevive a reinicios y a la limpieza de caché del sistema.

### 5.4 Borrador (R8)

- Al iniciar una captura se crea un borrador en SQLite.
- Cada cambio se persiste con **debounce de 400 ms**; también se guarda al cambiar de paso.
- Solo hay un borrador activo por técnico. Si se intenta abrir otro medidor, se ofrece continuar el existente, descartarlo o cancelar.
- Al abrir la app, `_layout.tsx` detecta un borrador y navega a `/borrador`, donde se puede continuar (con datos y paso conservados) o descartar (con confirmación).
- Al guardar la lectura definitiva, la inserción y el borrado del borrador ocurren en **una sola transacción**.

### 5.5 Sincronización idempotente (R9)

Disparadores:

- al recuperar la conexión (`Network.addNetworkStateListener`);
- al volver la app a primer plano (`AppState`);
- cada 30 s si hay pendientes;
- al deslizar hacia abajo en Inicio o Mis lecturas.

Algoritmo por lectura:

```text
listarPendientes(tecnico)
para cada lectura:
  reclamarLectura(localId)          ← UPDATE ... WHERE estado_envio='pendiente'
  prepararLectura()
    ├─ completar datos del medidor si faltan
    ├─ evaluar consumo con la referencia más reciente
    └─ decidir si requiere revisión
  si requiere revisión → requiere_revision, continuar
  buscarLecturaRemota(localId)
    ├─ ya existe → marcar enviada (idempotencia)
    └─ no existe → buscarLecturaRemotaPorPeriodo(codigo, periodo)
          ├─ existe con otro localId → requiere_revision
          ├─ existe con el mismo localId → marcar enviada
          └─ no existe → POST /lecturas
                ├─ 2xx → marcar enviada con id remoto
                ├─ 409 por localId → buscar de nuevo; si existe, marcar enviada
                ├─ 409 por medidor/periodo → requiere_revision (mock local)
                ├─ red o 5xx → volver a pendiente, detener si fue red
                └─ otro 4xx → requiere_revision
```

Puntos importantes:

- **Antes de enviar se busca el `localId`.** Si el POST llegó al servidor pero la respuesta se perdió, el siguiente intento encuentra la lectura y no la duplica.
- **MockAPI no impone unicidad por medidor/periodo.** Por eso, si no aparece el `localId`, se consulta `GET /lecturas?codigoMedidor=...&periodo=...` y se evita el `POST` cuando ya hay otra lectura de ese mes.
- **El cuerpo del POST usa solo los nueve campos del seed** (`cuerpoLecturaRemota`), no el modelo local completo. Lo mismo aplica al `PUT` del medidor.
- **Un 409 por `localId` no es un error definitivo**: significa que el envío anterior sí se registró.
- **Un 409 por medidor/periodo también es revisión**: el mock local lo devuelve; MockAPI no lo garantiza, por eso la comprobación previa es obligatoria.
- El motor es secuencial. Si se corta la red, se detiene y deja el resto pendiente para el próximo ciclo.

### 5.6 Corrección y duplicados (R10)

- Se puede editar si `estado_envio` es `pendiente` o `requiere_revision`.
- `enviado` y `enviando` se rechazan tanto en la interfaz como en el servicio y en el repositorio.
- Al corregir, la lectura vuelve a `pendiente`, se reinician intentos y error.
- Antes de insertar se busca `(codigo_medidor, periodo)`. Si existe, se lanza `LecturaDuplicadaError` con la lectura existente para que la interfaz ofrezca verla o corregirla.
- Si la comprobación previa falla por una carrera, SQLite lanza `UNIQUE constraint failed`; el servicio lo traduce al mismo error de dominio.
- Al sincronizar se comprueba el periodo en el servidor; un duplicado remoto se marca `requiere_revision` en vez de enviarse. MockAPI no ofrece una garantía atómica: dos dispositivos podrían pasar la comprobación a la vez.

### 5.7 Edición de la ficha del medidor

`src/app/medidor/editar/[codigo].tsx` reutiliza la ficha cacheada y permite actualizar dirección, sector, cuenta, estado, última lectura, fecha de última lectura y promedio. La fecha usa `CampoFecha` y la coherencia lectura/fecha se valida antes del `PUT /medidores/:id`.

La actualización exige conexión: no se inventa una cola para fichas de medidor. Si la copia local no tiene `idRemoto`, el botón de edición se deshabilita con una explicación. Tras un `PUT` exitoso se parsea la respuesta y se actualiza la caché local; si el servidor devuelve un estado que la app no reconoce, no se guarda como válido.

## 6. Conectividad

`AppProvider` combina tres señales:

1. `Network.getNetworkStateAsync()` al arrancar.
2. `Network.addNetworkStateListener()` para cambios.
3. Revisión periódica cada 30 s y al volver del segundo plano.

Se considera **en línea** si `isConnected !== false`. Esto es deliberado: un teléfono conectado a una red local sin Internet puede hablar con el mock o con la oficina por LAN. No se usa `isInternetReachable` para no bloquear ese escenario.

La franja `ConnectionStrip` aparece en todas las pantallas e indica conexión y número de pendientes. El resumen se recalcula desde SQLite después de cada sincronización.

## 7. Manejo de errores

| Tipo | Ejemplo | Respuesta |
|---|---|---|
| `ApiError` tipo `red` | No hay ruta al servidor | Se conserva la lectura; se reintenta |
| `ApiError` tipo `timeout` | 12 s sin respuesta | Igual que red; no se marca enviada |
| `ApiError` tipo `http` | 400/409/500 | 5xx se reintenta; 4xx de negocio pasa a revisión |
| `ApiError` tipo `respuesta` | JSON inválido | Se trata como error de respuesta; no se guarda como válido |
| `ReglaNegocioError` | Validación, lectura enviada | Mensaje para el técnico; no se reintenta |
| `LecturaDuplicadaError` | Medidor ya registrado en el mes | Se enlaza a la lectura existente |
| `PermisoCamaraError` | Permiso denegado | Se explica el motivo y se permite continuar si la foto no es obligatoria |

Los parsers (`apiParsers.ts`) validan campo por campo antes de escribir en caché. Una respuesta incompleta no se guarda como si fuera buena.

## 8. Decisiones y ADR

| Tema | Decisión | ADR |
|---|---|---|
| Persistencia | SQLite local | [ADR-001](adr/ADR-001-sqlite-almacenamiento-local.md) |
| HTTP y caché | `fetch` + SQLite, sin Axios ni TanStack Query | [ADR-002](adr/ADR-002-fetch-y-cache-persistente.md) |
| Estado global | Un React Context | [ADR-003](adr/ADR-003-estado-compartido-context.md) |
| Validación | Funciones puras reutilizadas | [ADR-004](adr/ADR-004-validacion-centralizada.md) |
| Formularios | Controlados + borrador persistente | [ADR-005](adr/ADR-005-formularios-controlados-y-borrador.md) |
| Fotos | Copia a `Paths.document` | [ADR-006](adr/ADR-006-fotografias-persistentes.md) |
| Sincronización | Idempotencia por `localId` + periodo | [ADR-007](adr/ADR-007-sincronizacion-idempotente.md) |
| UI | Componentes propios + iconos | [ADR-008](adr/ADR-008-identidad-visual-e-iconos.md) |
| Pruebas | `node:test` + `tsx` | [ADR-009](adr/ADR-009-pruebas-automatizadas.md) |
| API | MockAPI + URL configurable | [ADR-010](adr/ADR-010-api-simulada-y-url-configurable.md) |
| Navegación | Expo Router | [ADR-011](adr/ADR-011-navegacion-expo-router.md) |
| Duplicados | Periodo `YYYY-MM` + `UNIQUE` + consulta remota | [ADR-012](adr/ADR-012-periodo-mensual-y-duplicados.md) |
| Fechas | Selector nativo + normalización de día | [ADR-013](adr/ADR-013-selector-de-fechas-y-normalizacion.md) |
| Diseño | Claymorphism | [ADR-014](adr/ADR-014-claymorphism.md) |

### 8.1 Dependencias y justificación

| Paquete | Origen | Para qué |
|---|---|---|
| `expo`, `react`, `react-native` | Base del template | Plataforma SDK 57. |
| `expo-router` | Template | Navegación por archivos, grupos y rutas dinámicas (R1–R10). |
| `expo-sqlite` | Agregada | Caché, lecturas, borradores, sesión y `UNIQUE` (R3, R4, R8, R9, R10). |
| `expo-image-picker` | Agregada | Cámara y permisos (R7). |
| `expo-file-system` | Agregada | Copiar la foto a almacenamiento permanente (R7). |
| `expo-network` | Agregada | Detectar conexión para el envío automático (R9). |
| `@react-native-community/datetimepicker` | Agregada | Selector nativo de fechas para `fechaUltimaLectura` y `fechaRegistro`. |
| `@expo/vector-icons` | Template | Iconos de la interfaz; incluido con Expo. |
| `expo-image` | Template | Renderizado eficiente de las miniaturas de foto. |
| `expo-splash-screen` | Template | Pantalla de arranque con la identidad de AquaRuta. |
| `expo-status-bar`, `expo-system-ui` | Template | Barra de estado y fondo del tema claro. |
| `expo-constants` | Template | Versión mostrada en Perfil. |
| `expo-font` | Template | Carga de las fuentes de los iconos. |
| `expo-linking` | Template / peer de Router | Enlaces profundos que usa Expo Router. |
| `react-native-safe-area-context`, `react-native-screens` | Template / peer de Router | Safe areas y navegación nativa. |
| `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | Template / peers opcionales | Soportan las animaciones y gestos del navegador; no se usan directamente en el código de negocio. |
| `react-native-web`, `react-dom` | Template | Permiten el target web; no es el objetivo de la entrega. |
| `@expo/ui`, `expo-glass-effect`, `expo-symbols` | Template / dependencias de Router | Las usa internamente Expo Router; figuran como dependencias directas del template. |
| `typescript`, `@types/react`, `@types/node` | Desarrollo | Tipado y tipos para las pruebas. |
| `tsx` | Desarrollo | Ejecutar TypeScript con `node:test`. |
| `eslint`, `eslint-config-expo` | Desarrollo | Análisis estático. |

Se retiraron `expo-device` y `expo-web-browser` porque no tenían uso. No se agregaron Axios, TanStack Query, Zustand, Redux, Zod, Formik ni una librería de componentes.

## 9. Estructura de archivos

```text
src/
  app/
    _layout.tsx              Stack raíz, guardas de sesión y borrador
    login.tsx
    (tabs)/
      _layout.tsx            Tabs: Inicio, Buscar, Lecturas, Perfil
      index.tsx
      buscar.tsx
      lecturas.tsx
      perfil.tsx
    medidor/[codigo].tsx
    medidor/editar/[codigo].tsx
    registro/[codigo].tsx
    lectura/[localId].tsx
    borrador.tsx
    +not-found.tsx
  components/ui/             Componentes visuales reutilizables
  context/AppProvider.tsx
  services/
    apiClient.ts             fetch, timeout, errores HTTP
    apiParsers.ts            Validación de respuestas
    medidoresService.ts      R2/R3 y caché
    lecturasService.ts       R5/R10 y guardado
    syncEngine.ts            Motor puro e idempotente
    syncService.ts           Cableado del motor con SQLite/fetch
    fotoService.ts           R7
    borradoresService.ts     R8
    sesionService.ts         R1
    errors.ts                Errores de dominio
  storage/
    db.ts                    Esquema y migración
    *Repository.ts           Consultas SQL
    mappers.ts               Fila ↔ modelo
  utils/
    validators.ts            R2/R5/R6
    validacionesEntidades.ts Rangos, longitudes y ficha del medidor
    fechas.ts                Día calendario, ISO y límites
    contratoRemoto.ts        Campos exactos de MockAPI
    consumo.ts               R6
    verificacion.ts          Estados de verificación
    periodo.ts               Periodo mensual local
    ...
```

## 10. Límites asumidos

- La autenticación es local y con datos quemados, como autoriza el enunciado.
- No hay subida binaria de fotos. El contrato remoto de MockAPI no tiene campos de foto ni de evidencia: esos datos quedan solo en SQLite. La subida a un servicio externo era opcional y no se implementó.
- El mock local guarda en un JSON y no implementa concurrencia real; la restricción de duplicados también vive en SQLite del teléfono y en la comprobación previa.
- La sincronización no tiene backoff exponencial; reintenta cada 30 s mientras haya red y pendientes.
- La app no administra usuarios, roles ni cierre automático de jornada.
- La edición de la ficha del medidor requiere conexión; no se encola como las lecturas.
