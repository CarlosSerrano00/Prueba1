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
| Sistema de oficina | MockAPI (`/medidores`, `/lecturas`) o servidor local compatible (`mock-api/`) |
| Fechas | Selector nativo (`@react-native-community/datetimepicker`) |
| Diseño | Claymorphism lavanda/índigo con acento menta |
| Pruebas | `node:test` + `tsx` |

## Estado de la entrega

- Código fuente completo para R1–R10.
- `npm test`: **57 pruebas, 57 correctas** (17 suites).
- `npm run typecheck` y `npm run lint`: sin errores.
- `npx expo-doctor`: **21/21 comprobaciones correctas**.
- `npx expo export --platform android`: bundle de producción generado correctamente.
- MockAPI sembrado con 10 medidores y 3 lecturas de demostración mediante `npm run seed:mockapi`.
- APK de Android compilado en EAS: ver [APK de demostración](#apk-de-demostración).
- **Pendiente de verificación en dispositivo físico**: la instalación y el recorrido manual del APK. En este entorno no hay Android SDK, `adb` ni emulador. El detalle de lo probado y lo pendiente está en [`docs/pruebas.md`](docs/pruebas.md).

## Requisitos cubiertos

| Requisito | Implementación | Dónde verlo |
|---|---|---|
| **R1** Sesión persistente | Sesión en SQLite; se restaura al abrir; cerrar sesión la borra y vuelve al login. | `src/services/sesionService.ts`, `src/app/_layout.tsx` |
| **R2** Código `MED-` + 6 dígitos | Validación antes de cualquier consulta o navegación. El buscador no llama a la red con un código inválido. | `src/utils/validators.ts`, `src/app/(tabs)/buscar.tsx` |
| **R3** Datos del medidor y caché | Los datos de la ficha en `medidores_cache`; consulta remota con red y copia local sin red. Si el medidor ya se consultó hoy, se entrega desde SQLite. Deslizar hacia abajo fuerza la actualización. | `src/services/medidoresService.ts`, `src/storage/medidoresRepository.ts` |
| **R4** Registro sin señal | La lectura se crea en SQLite con `estadoEnvio = pendiente`; al recuperar la conexión se compara con la lectura anterior del servidor. | `src/app/registro/[codigo].tsx`, `src/services/syncEngine.ts` |
| **R5** Tres estados | Normal exige lectura; inaccesible exige motivo y no admite lectura; dañado exige descripción y permite lectura vacía. | `src/utils/validators.ts` |
| **R6** Consumo y anomalía | Consumo = actual − anterior. Si supera `3 × promedio`, se advierte y se exige confirmación + foto. Sin promedio o sin lectura anterior queda pendiente de verificar, no se inventa un consumo. | `src/utils/consumo.ts`, `src/utils/verificacion.ts` |
| **R7** Foto obligatoria y persistente | Obligatoria con anomalía o medidor dañado; opcional en los demás casos. Se copia a `Paths.document/fotos-lecturas`. Si se niega el permiso, se explica y se permite continuar cuando la foto no es obligatoria. | `src/services/fotoService.ts`, `src/components/ui/FotoMedidor.tsx` |
| **R8** Borrador recuperable | Un borrador activo por técnico, guardado con debounce de 400 ms y paso actual. Al reabrir, se ofrece continuar o descartar. | `src/services/borradoresService.ts`, `src/app/borrador.tsx` |
| **R9** Envío automático e idempotente | Se sincroniza al recuperar conexión, al volver la app al frente y cada 30 s. Antes de enviar se busca el `localId`; solo se marca enviada con respuesta 2xx o con la lectura ya existente. | `src/services/syncEngine.ts`, `src/context/AppProvider.tsx` |
| **R10** Corrección y duplicados | Pendientes y `requiere_revision` se pueden corregir; enviadas no. Restricción `UNIQUE(codigo_medidor, periodo)` en SQLite y comprobación remota por medidor/periodo antes de enviar. El mock local además devuelve 409; MockAPI no impone unicidad. | `src/services/lecturasService.ts`, `src/storage/db.ts`, `src/services/syncEngine.ts` |

La trazabilidad completa, con criterios de aceptación y evidencia, está en [`docs/trazabilidad.md`](docs/trazabilidad.md).

### Validaciones y fechas

- Código de medidor: `MED-` + 6 dígitos; cuenta de 10 caracteres; dirección de 5 a 160; sector de 2 a 60.
- Lectura actual: de `0` a `999999.999`, máximo 3 decimales; no puede ser menor que la lectura anterior.
- Promedio mensual: de `0` a `100000`, máximo 3 decimales.
- `fechaUltimaLectura` y `fechaRegistro` se eligen con calendario nativo. No se permiten fechas futuras; una lectura nueva debe estar dentro del último año.
- La fecha y la última lectura del medidor deben estar ambas presentes o ambas vacías.
- Al corregir una lectura se conserva su fecha original; al editar un medidor se puede actualizar la ficha con `PUT /medidores/:id`.
- El contrato remoto está aislado en `src/utils/contratoRemoto.ts` y probado en `tests/contratoRemoto.test.ts`: no se envían campos que no existan en `mock-api/seed.json`.

## Cómo ejecutarlo

### Requisitos

- Node.js 20 o superior y npm.
- Para Android: emulador con Android Studio, o un teléfono con un development build / el APK. El selector nativo de fechas no está incluido en Expo Go.
- No se necesita Android SDK si se usa EAS Build para generar el APK.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Sembrar MockAPI (recomendado)

La app apunta por defecto a `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`. Los recursos son `/medidores` y `/lecturas`.

```bash
npm run seed:mockapi
```

El script es idempotente: no duplica medidores por `codigo` ni lecturas por `localId`. Usa los campos exactos de `mock-api/seed.json` y respeta los tipos Date de MockAPI. Para revisar qué haría sin escribir:

```bash
npm run seed:mockapi -- --dry-run
```

> La URL del navegador de MockAPI puede terminar en `/recursos`; esa ruta **no** es un endpoint de la API (devuelve 404). Usa la raíz del proyecto, sin `/recursos`.

### 2b. Sistema de oficina local opcional

```bash
npm run mock:reset
```

Queda escuchando en `http://0.0.0.0:4000`. Comprueba la salud:

```bash
curl http://localhost:4000/health
```

El servidor imita el contrato de MockAPI (`GET /medidores`, `GET /lecturas`, `POST /lecturas`) y añade reglas para demostrar idempotencia y duplicados. Los datos se guardan en `mock-api/db.json`, que no se versiona; `--reset` vuelve a `mock-api/seed.json`. Si lo usas, cambia la URL en **Perfil → Sistema de oficina**.

### 3. Abrir la app

```bash
npx expo start
```

- Por defecto la app usa el MockAPI sembrado; no hay que configurar nada.
- Para usar el mock local, cambia la URL en **Perfil → Sistema de oficina**:
  - emulador Android: `http://10.0.2.2:4000`;
  - teléfono físico: `http://<IP-LAN-de-tu-PC>:4000` (misma red que la PC).
- También puedes fijar la URL al compilar con `EXPO_PUBLIC_API_URL` (ver `.env.example`). La prioridad es: variable de entorno → URL guardada en Perfil → valor por defecto.
- `@react-native-community/datetimepicker` es un módulo nativo. Para probar el selector de fechas usa un development build o el APK; si Expo Go no incluye el módulo, el selector no estará disponible.

> El mock local usa HTTP. El APK habilita `usesCleartextTraffic` con un config plugin local (`plugins/withCleartextTraffic.js`). MockAPI usa HTTPS, así que ese permiso solo es necesario para el mock local.

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
| `MED-100008` | Ya tiene lectura de `2026-10` en MockAPI: sirve para demostrar la detección de duplicado mensual antes del envío. |
| `MED-100009` | Sin consumo promedio: la evaluación queda pendiente de verificar. |
| `MED-100010` | Sin lectura anterior: no se puede calcular consumo. |
| `MED-100007` | Medidor suspendido; la lectura inaccesible está permitida. |

## Comandos

```bash
npm start              # servidor de desarrollo Expo
npm run android        # abrir en emulador/dispositivo Android
npm run mock           # sistema de oficina simulado
npm run mock:reset     # reiniciar datos y arrancar el mock
npm run seed:mockapi   # sembrar MockAPI de forma idempotente
npm test               # 57 pruebas de dominio, contrato y sincronización
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

- **Estado del build:** `FINISHED` (compilación correcta en EAS).
- **Build de EAS:** <https://expo.dev/accounts/carlosserrano00/projects/aquaruta-lecturas/builds/f02b8285-fbca-48dd-b9b2-b4a8dfce2b36>
- **Descarga directa del APK:** <https://expo.dev/artifacts/eas/kzwO0FZN7iyBG80hf7mtiKp5Obkvec_xiZd7NBgzSBQ.apk>
- **Copia local (no versionada):** `dist/AquaRuta-1.0.0.apk`
- **Tamaño:** 112.947.078 bytes (107,7 MiB).
- **SHA-256:** `945AA528EB689D8A071823735D64A1E87C73FCD0718221DEBA534195B5D98426`
- **Commit compilado:** `40dba43` (el mismo código de aplicación que `HEAD`; los cambios posteriores solo afectan a esta documentación).
- **Expiración del artefacto según EAS:** 10/11/2026. Después de esa fecha usa la página del build o genera uno nuevo con el comando de arriba.

El APK **no se instaló ni se recorrió en un dispositivo en este entorno**. La descarga se verificó como un ZIP/APK válido (manifiesto, `classes*.dex`, `resources.arsc` y librerías nativas para varias ABI), pero la instalación, los permisos reales de cámara y el recorrido manual quedan documentados como pendientes en [`docs/pruebas.md`](docs/pruebas.md).

## Estructura del proyecto

```text
src/
  app/                 rutas de Expo Router (pantallas)
    (tabs)/            Inicio, Buscar, Mis lecturas, Perfil
    medidor/[codigo]   detalle del medidor y caché
    medidor/editar/    edición de la ficha del medidor (PUT a MockAPI)
    registro/[codigo]  captura en 3 pasos con borrador y selector de fecha
    lectura/[localId]  detalle, corrección y reintento
    borrador           recuperación de una captura interrumpida
    login               inicio de jornada
  components/ui/       biblioteca visual Claymorphism (botones, tarjetas, CampoFecha…)
  context/             AppProvider: sesión, red, resumen y sincronización
  services/            casos de uso, API, fotos, sincronización
  storage/             SQLite: esquema, repositorios y mappers
  types/               modelos del dominio
  utils/               fechas, validaciones de entidades, contrato remoto, consumo, periodo
docs/
  adr/                 14 decisiones de arquitectura
  arquitectura.md      capas, modelo de datos y flujos
  trazabilidad.md      R1–R10 → código → prueba
  pruebas.md           pruebas automáticas y matriz manual
  defensa-oral.md      guion de 10 minutos y preguntas probables
mock-api/              seed canónico y servidor de oficina local sin dependencias
scripts/               seed idempotente de MockAPI
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
13. Selector nativo de fechas y normalización del día calendario.
14. Claymorphism como identidad visual.

Las dependencias del template que no se usan se retiraron (`expo-device`, `expo-web-browser`). Las que quedan de Expo Router son peers o las usa el propio router.

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md): capas, esquema SQLite, flujos y manejo de errores.
- [`docs/trazabilidad.md`](docs/trazabilidad.md): cada requisito con archivos, criterio y evidencia.
- [`docs/pruebas.md`](docs/pruebas.md): inventario de pruebas y recorrido manual de demostración.
- [`docs/defensa-oral.md`](docs/defensa-oral.md): guion y preguntas para la defensa.
- [`docs/adr/`](docs/adr/): decisiones con alternativas y consecuencias.

## Limitaciones conocidas

- El inicio de sesión usa datos quemados, como permite el enunciado; no hay backend de usuarios.
- MockAPI solo recibe los campos del seed. La foto, el motivo de inaccesibilidad, la descripción del daño y el consumo calculado quedan en SQLite y **no** se envían al servidor.
- La sincronización es secuencial y reintenta cada 30 s; no pretende ser un motor de colas de nivel producción.
- MockAPI no impone unicidad por medidor/periodo. Antes de enviar, la app consulta el periodo y evita el `POST` si ya existe otra lectura; aun así, dos dispositivos podrían pasar la comprobación al mismo tiempo.
- El APK conserva el permiso de tráfico HTTP para el mock local; MockAPI usa HTTPS. Para producción se puede quitar `plugins/withCleartextTraffic`.
- El artefacto de EAS caduca; si el enlace ya no sirve, genera un APK nuevo con el comando de esta guía.
