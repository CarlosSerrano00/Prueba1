# AquaRuta

Aplicación móvil para que los técnicos de EPMAPS registren las lecturas de medidores de agua en campo, incluso cuando no hay señal. La lectura, la foto y el estado del medidor se guardan primero en el teléfono; cuando vuelve la conexión, la app los envía sola al sistema de oficina sin duplicarlos.

Proyecto de la prueba técnica de la **ESFOT · Escuela Politécnica Nacional** (2026).

| | |
|---|---|
| Framework | Expo SDK 57 · React Native 0.86 · TypeScript 6 |
| Navegación | Expo Router (rutas por archivos) |
| Almacenamiento | SQLite (`expo-sqlite`) |
| Cámara | `expo-image-picker` + `expo-file-system` |
| Conectividad | `expo-network` + `AppState` |
| Sistema de oficina | MockAPI o servidor local compatible (`mock-api/`) |
| Pruebas | `node:test` + `tsx` |

## Estado de la entrega

- Código fuente completo para R1–R10.
- `npm test`: **40 pruebas, 40 correctas**.
- `npm run typecheck` y `npm run lint`: sin errores.
- `npx expo-doctor`: **21/21 comprobaciones correctas**.
- `npx expo export --platform android`: bundle de producción generado correctamente.
- APK de Android compilado en EAS: ver [APK de demostración](#apk-de-demostración).
- **Pendiente de verificación en dispositivo físico**: la instalación y el recorrido manual del APK. En este entorno no hay Android SDK, `adb` ni emulador. El detalle de lo probado y lo pendiente está en [`docs/pruebas.md`](docs/pruebas.md).

## Requisitos cubiertos

| Requisito | Implementación | Dónde verlo |
|---|---|---|
| **R1** Sesión persistente | Sesión en SQLite; se restaura al abrir; cerrar sesión la borra y vuelve al login. | `src/services/sesionService.ts`, `src/app/_layout.tsx` |
| **R2** Código `MED-` + 6 dígitos | Validación antes de cualquier consulta o navegación. El buscador no llama a la red con un código inválido. | `src/utils/validators.ts`, `src/app/(tabs)/buscar.tsx` |
| **R3** Datos del medidor y caché | 7 campos en `medidores_cache`; consulta remota con red y copia local sin red. Si el medidor ya se consultó hoy, se entrega desde SQLite. Deslizar hacia abajo fuerza la actualización. | `src/services/medidoresService.ts`, `src/storage/medidoresRepository.ts` |
| **R4** Registro sin señal | La lectura se crea en SQLite con `estadoEnvio = pendiente`; al recuperar la conexión se compara con la lectura anterior del servidor. | `src/app/registro/[codigo].tsx`, `src/services/syncEngine.ts` |
| **R5** Tres estados | Normal exige lectura; inaccesible exige motivo y no admite lectura; dañado exige descripción y permite lectura vacía. | `src/utils/validators.ts` |
| **R6** Consumo y anomalía | Consumo = actual − anterior. Si supera `3 × promedio`, se advierte y se exige confirmación + foto. Sin promedio o sin lectura anterior queda pendiente de verificar, no se inventa un consumo. | `src/utils/consumo.ts`, `src/utils/verificacion.ts` |
| **R7** Foto obligatoria y persistente | Obligatoria con anomalía o medidor dañado; opcional en los demás casos. Se copia a `Paths.document/fotos-lecturas`. Si se niega el permiso, se explica y se permite continuar cuando la foto no es obligatoria. | `src/services/fotoService.ts`, `src/components/ui/FotoMedidor.tsx` |
| **R8** Borrador recuperable | Un borrador activo por técnico, guardado con debounce de 400 ms y paso actual. Al reabrir, se ofrece continuar o descartar. | `src/services/borradoresService.ts`, `src/app/borrador.tsx` |
| **R9** Envío automático e idempotente | Se sincroniza al recuperar conexión, al volver la app al frente y cada 30 s. Antes de enviar se busca el `localId`; solo se marca enviada con respuesta 2xx o con la lectura ya existente. | `src/services/syncEngine.ts`, `src/context/AppProvider.tsx` |
| **R10** Corrección y duplicados | Pendientes y `requiere_revision` se pueden corregir; enviadas no. Restricción `UNIQUE(codigo_medidor, periodo)` en SQLite y rechazo del servidor. | `src/services/lecturasService.ts`, `src/storage/db.ts` |

La trazabilidad completa, con criterios de aceptación y evidencia, está en [`docs/trazabilidad.md`](docs/trazabilidad.md).

## Cómo ejecutarlo

### Requisitos

- Node.js 20 o superior y npm.
- Para Android: emulador con Android Studio, o un teléfono con Expo Go / el APK.
- No se necesita Android SDK si se usa EAS Build para generar el APK.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar el sistema de oficina simulado

```bash
npm run mock:reset
```

Queda escuchando en `http://0.0.0.0:4000`. Comprueba la salud:

```bash
curl http://localhost:4000/health
```

El servidor imita el contrato de MockAPI (`GET /medidores`, `GET /lecturas`, `POST /lecturas`) y añade reglas para demostrar idempotencia y duplicados. Los datos se guardan en `mock-api/db.json`, que no se versiona; `--reset` vuelve a `mock-api/seed.json`.

### 3. Abrir la app

```bash
npx expo start
```

- **Emulador Android**: la URL por defecto es `http://10.0.2.2:4000` (el alias del host desde el emulador).
- **Teléfono físico**: cambia la URL en **Perfil → Sistema de oficina** por `http://<IP-LAN-de-tu-PC>:4000`. El teléfono y la PC deben estar en la misma red.
- También puedes fijarla al compilar con `EXPO_PUBLIC_API_URL` (ver `.env.example`). La prioridad es: variable de entorno → URL guardada en Perfil → valor por defecto.

> El mock local usa HTTP. Para el APK se habilitó `usesCleartextTraffic` con un config plugin local (`plugins/withCleartextTraffic.js`). Si usas un MockAPI HTTPS, puedes quitar ese plugin de `app.json`.

### Credenciales de demostración

| Código | Clave | Técnico | Zona |
|---|---|---|---|
| `TEC-001` | `agua2026` | María Quishpe | Nono |
| `TEC-002` | `agua2026` | Diego Cabrera | Lloa |

La clave no se guarda en SQLite; solo se valida contra los datos quemados de `src/constants/tecnicos.ts`.

### Medidores de demostración

| Código | Escenario |
|---|---|
| `MED-100001` | Última lectura 100, promedio 20: una lectura de 160 da consumo 60 (sin anomalía); 161 supera el triple. |
| `MED-100002` | Valores decimales (540.5). |
| `MED-100008` | Ya tiene lectura de `2026-10` en el servidor: sirve para demostrar el rechazo de duplicado mensual. |
| `MED-100009` | Sin consumo promedio: la evaluación queda pendiente de verificar. |
| `MED-100010` | Sin lectura anterior: no se puede calcular consumo. |
| `MED-100007` | Medidor suspendido; la lectura inaccesible está permitida. |

## Comandos

```bash
npm start              # servidor de desarrollo Expo
npm run android        # abrir en emulador/dispositivo Android
npm run mock           # sistema de oficina simulado
npm run mock:reset     # reiniciar datos y arrancar el mock
npm test               # 40 pruebas de dominio y sincronización
npm run typecheck      # TypeScript sin emitir
npm run lint           # ESLint
npm run export:android # bundle de producción para Android
npx expo-doctor        # diagnóstico de dependencias y configuración
```

## Build del APK

El proyecto está vinculado a EAS (`@carlosserrano00/aquaruta-lecturas`). El perfil `preview` genera un APK instalable:

```bash
npx eas-cli@latest build -p android --profile preview
```

El perfil `production` genera también APK (no AAB) y autoincrementa `versionCode`. Las credenciales Android las administra EAS.

### APK de demostración

- Build de EAS: _ver enlace en la respuesta final / sección actualizada al terminar el build_.
- El APK **no se instaló ni se recorrió en un dispositivo en este entorno**. La verificación manual con un teléfono o emulador queda documentada como pendiente en [`docs/pruebas.md`](docs/pruebas.md).

## Estructura del proyecto

```text
src/
  app/                 rutas de Expo Router (pantallas)
    (tabs)/            Inicio, Buscar, Mis lecturas, Perfil
    medidor/[codigo]   detalle del medidor y caché
    registro/[codigo]  captura en 3 pasos con borrador
    lectura/[localId]  detalle, corrección y reintento
    borrador           recuperación de una captura interrumpida
    login               inicio de jornada
  components/ui/       biblioteca visual propia (botones, tarjetas, alertas…)
  context/             AppProvider: sesión, red, resumen y sincronización
  services/            casos de uso, API, fotos, sincronización
  storage/             SQLite: esquema, repositorios y mappers
  types/               modelos del dominio
  utils/               validaciones, consumo, periodo, formato y URL
docs/
  adr/                 12 decisiones de arquitectura
  arquitectura.md      capas, modelo de datos y flujos
  trazabilidad.md      R1–R10 → código → prueba
  pruebas.md           pruebas automáticas y matriz manual
  defensa-oral.md      guion de 10 minutos y preguntas probables
mock-api/              servidor de oficina sin dependencias
tests/                 pruebas con node:test
plugins/               config plugin de tráfico HTTP local
```

## Decisiones de arquitectura

Cada dependencia y decisión relevante tiene un ADR. El índice está en [`docs/adr/`](docs/adr/):

1. SQLite para el almacenamiento local.
2. `fetch` nativo y caché persistente, sin Axios ni TanStack Query.
3. Estado compartido con un único React Context.
4. Validación centralizada en funciones puras.
5. Formularios controlados y borrador persistente.
6. Fotografías copiadas al almacenamiento permanente.
7. Sincronización idempotente por `localId`.
8. Identidad visual e iconos propios.
9. Pruebas con `node:test` y `tsx`.
10. API simulada y URL configurable.
11. Navegación con Expo Router.
12. Periodo mensual y prevención de duplicados.

Las dependencias del template que no se usan se retiraron (`expo-device`, `expo-web-browser`). Las que quedan de Expo Router son peers o las usa el propio router.

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md): capas, esquema SQLite, flujos y manejo de errores.
- [`docs/trazabilidad.md`](docs/trazabilidad.md): cada requisito con archivos, criterio y evidencia.
- [`docs/pruebas.md`](docs/pruebas.md): inventario de pruebas y recorrido manual de demostración.
- [`docs/defensa-oral.md`](docs/defensa-oral.md): guion y preguntas para la defensa.
- [`docs/adr/`](docs/adr/): decisiones con alternativas y consecuencias.

## Limitaciones conocidas

- El inicio de sesión usa datos quemados, como permite el enunciado; no hay backend de usuarios.
- El mock local no sube fotos: la foto queda en el teléfono y se envía su nombre/ruta lógica, no un archivo binario. La subida a un servicio externo era un requisito opcional y no se implementó.
- La sincronización es secuencial y reintenta cada 30 s; no pretende ser un motor de colas de nivel producción.
- El APK usa HTTP local para el mock; para producción habría que usar HTTPS y quitar el plugin de cleartext.
