# Pruebas

Este documento separa lo que **ya se ejecutó** de lo que **requiere un dispositivo**. No se afirma que el APK haya sido instalado o recorrido: en el entorno de desarrollo no hay Android SDK, `adb` ni emulador.

## 1. Pruebas automatizadas

Comando:

```bash
npm test
```

Resultado de la última ejecución:

```text
tests 55
suites 17
pass 55
fail 0
duration_ms ~732
```

### Distribución

| Archivo | Casos | Qué cubre |
|---|---:|---|
| `tests/validators.test.ts` | 15 | R2, R5, R6 (foto), periodo y parsing de lectura |
| `tests/consumo.test.ts` | 12 | R6: consumo, umbral, anomalía, casos sin datos |
| `tests/syncEngine.test.ts` | 13 | R4, R6, R9: idempotencia, reintentos, revisión |
| `tests/validacionesEntidades.test.ts` | 13 | Fechas, rangos, longitudes, ficha de medidor y reglas de lectura |
| `tests/contratoRemoto.test.ts` | 2 | Campos exactos de MockAPI |
| **Total** | **55** | |

### `tests/validators.test.ts`

- **R2**
  - acepta exactamente `MED-` + seis dígitos;
  - rechaza códigos incompletos o con otro formato.
- **R5 · lectura numérica**
  - acepta enteros y decimales con coma o punto;
  - rechaza vacío, negativos, letras y más de tres decimales.
- **R5 · tres estados**
  - normal exige lectura;
  - normal acepta lectura válida y calcula consumo;
  - normal rechaza lectura menor que la anterior;
  - inaccesible exige motivo y no registra lectura;
  - dañado exige descripción y permite lectura vacía;
  - dañado con lectura válida también se acepta.
- **R6 · foto**
  - no exige foto en lectura normal sin anomalía;
  - exige foto si el medidor está dañado;
  - exige foto y confirmación si el consumo es anómalo;
  - una lectura dañada sin foto no es válida.
- **Periodo**
  - valida `YYYY-MM`;
  - presenta el periodo en español;
  - usa el mes calendario local con dos dígitos.
- **Identificador local**
  - genera IDs estables y únicos en una ráfaga.
- **URL**
  - normaliza espacios y barras finales;
  - rechaza protocolos distintos y espacios internos.

### `tests/consumo.test.ts`

- Calcula la diferencia numérica, no una concatenación.
- Devuelve `null` si falta la lectura actual o la anterior.
- Calcula el umbral como el triple del promedio.
- Con 100, 160 y promedio 20: consumo 60 y **no** hay anomalía (el límite es estricto).
- Con 161, 100 y 20: consumo 61 y **sí** hay anomalía.
- Marca verificación pendiente si falta la lectura anterior o el promedio.
- Con promedio 0, cualquier consumo positivo es anómalo.

### `tests/syncEngine.test.ts`

El motor se prueba con dependencias falsas: no usa SQLite, `fetch` ni React.

- **R9 · idempotencia**
  - envía una lectura válida y la marca enviada solo después de la respuesta;
  - no duplica si el POST se guardó pero la respuesta se perdió;
  - reintenta si falla la red antes de llegar al servidor;
  - recupera un 409 de `localId` duplicado sin marcarlo como error definitivo;
  - mantiene pendiente y reporta error ante un 500;
  - no reenvía una lectura ya marcada como enviada.
- **R6 · anomalías durante la sincronización**
  - no envía una anomalía sin confirmación ni foto;
  - envía una anomalía confirmada con foto;
  - deja para revisión una lectura menor que la última de la oficina;
  - completa datos del medidor desde la oficina antes de evaluar.
- **R3/R5**
  - envía una lectura inaccesible sin lectura actual;
  - no envía si el medidor no existe en la oficina;
  - deja pendiente si falla la consulta del medidor por red.

### `tests/validacionesEntidades.test.ts`

- **Fechas**
  - acepta un día válido y rechaza días imposibles;
  - normaliza una fecha ISO de MockAPI sin perder el día calendario;
  - rechaza fechas futuras y anteriores a `2000-01-01`;
  - calcula el periodo desde la fecha elegida.
- **Rangos numéricos**
  - acepta coma o punto y hasta tres decimales;
  - rechaza negativos, letras y valores fuera del rango;
  - acepta vacío solo donde el campo es opcional.
- **Ficha del medidor**
  - valida `codigo`, dirección, sector, cuenta y estado;
  - exige coherencia entre última lectura y fecha;
  - rechaza una fecha de última lectura futura.
- **Lectura**
  - exige `fechaRegistro` en una lectura nueva;
  - permite conservar la fecha original al corregir una lectura antigua.

### `tests/contratoRemoto.test.ts`

- El cuerpo de `POST /lecturas` contiene **exactamente** los nueve campos del seed; no incluye foto, motivo ni consumo calculado.
- El cuerpo de `PUT /medidores/:id` contiene **exactamente** los ocho campos de la ficha; no incluye `id` ni `consultadoEn`.

### Cómo se ejecutan sin emulador

`syncEngine.ts` no importa React Native ni SQLite. Recibe una interfaz `SyncDependencias` y las pruebas le pasan funciones en memoria. Por eso se puede simular un corte de red, un 409 o un 500 con `node:test`.

## 2. Verificaciones estáticas y de empaquetado

Ejecutadas en este entorno:

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores ni advertencias |
| `npx expo-doctor` | 21/21 comprobaciones correctas |
| `npx expo export --platform android` | Bundle de producción generado (Hermes, ~3.5 MB) |
| `npx eas-cli build -p android --profile preview` | Build `f02b8285-fbca-48dd-b9b2-b4a8dfce2b36` finalizado con estado `FINISHED` |

El `expo export` confirma que el bundle de JavaScript compila para Android. **No** confirma que la app se ejecute correctamente en un dispositivo.

### Evidencia del APK

- Build: <https://expo.dev/accounts/carlosserrano00/projects/aquaruta-lecturas/builds/f02b8285-fbca-48dd-b9b2-b4a8dfce2b36>
- APK descargado: 112.947.078 bytes, SHA-256 `945AA528EB689D8A071823735D64A1E87C73FCD0718221DEBA534195B5D98426`.
- Se comprobó que el archivo es un ZIP/APK legible y que contiene `AndroidManifest.xml`, `resources.arsc`, cuatro archivos `classes*.dex` y librerías nativas para `arm64-v8a`, `armeabi-v7a`, `x86` y `x86_64`.
- **No verificado:** instalación con `adb`, apertura de la app, permisos de cámara, modo avión y recorrido manual. En este entorno no hay Android SDK ni emulador.

## 3. Pruebas del sistema de oficina

### 3.1 MockAPI sembrado

```bash
npm run seed:mockapi
```

Resultado comprobado: 10 medidores y 3 lecturas. El comando se ejecutó dos veces y la segunda no creó duplicados. La raíz es `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`; `/recursos` devuelve 404 y no se usa.

| Prueba | Condición | Resultado |
|---|---|---|
| Listar medidores | `GET /medidores` | 10 registros |
| Listar lecturas | `GET /lecturas` | 3 registros |
| Filtro por código | `GET /medidores?codigo=MED-100001` | 1 registro con los 8 campos |
| Campo Date de día | `fechaUltimaLectura` | conserva `YYYY-MM-DD` |
| Campo Date de instante | `fechaRegistro` | conserva ISO completo |
| Actualizar ficha | `PUT /medidores/:id` | 200 y datos actualizados |
| Crear lectura | `POST /lecturas` con los 9 campos | 201 |
| Consultar por `localId` | `GET /lecturas?localId=...` | recupera la lectura |

La prueba de `PUT` y `POST` usó un medidor temporal `MED-999998` y se borraron ambos registros al terminar. La base quedó en 10 medidores y 3 lecturas.

### 3.2 Mock local opcional

El mock se levanta con:

```bash
npm run mock:reset
```

### Contrato probado

| Prueba | Comando / condición | Resultado esperado | Estado |
|---|---|---|---|
| Salud | `GET /health` | `200` con `ok: true` | ✅ |
| Buscar medidor | `GET /medidores?codigo=MED-100001` | `200` con un medidor y sus 8 campos | ✅ |
| Lectura de septiembre | `GET /lecturas?codigoMedidor=MED-100002&periodo=2026-09` | `200` con la lectura sembrada | ✅ |
| Crear lectura | `POST /lecturas` con `localId` nuevo | `201` | ✅ |
| Repetir `localId` | mismo `localId` otra vez | `409 DUPLICADO_LOCAL_ID` | ✅ |
| Duplicado mensual | `POST` de `MED-100008` en `2026-10` | `409 DUPLICADO_PERIODO` | ✅ |
| Validación | `POST` con `codigoMedidor` inválido | `400 VALIDACION` | ✅ |
| Fallo simulado | `MOCK_FAIL_POSTS=3 npm run mock` | los 3 primeros POST responden `500` | ✅ |

Ejemplo de creación (PowerShell):

```powershell
$body = @{
  localId = 'demo_med_100001_202610'
  codigoMedidor = 'MED-100001'
  codigoTecnico = 'TEC-001'
  periodo = '2026-10'
  tipoEstado = 'normal'
  lecturaActual = 130
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:4000/lecturas `
  -ContentType 'application/json' -Body $body
```

### Variables útiles del mock

| Variable | Efecto |
|---|---|
| `PORT` | Puerto (por defecto 4000) |
| `HOST` | Interfaz (por defecto `0.0.0.0`) |
| `MOCK_DELAY_MS` | Retraso artificial para probar timeouts |
| `MOCK_FAIL_POSTS` | Número de POST que fallan con 500 antes de aceptar |

## 4. Matriz de pruebas manuales

Estas pruebas están diseñadas para ejecutarse con el APK o en Expo Go. La columna **Estado** indica si se ejecutó en este entorno.

### Preparación

1. `npm run seed:mockapi` (recomendado), o `npm run mock:reset` para el mock local.
2. Abrir la app.
3. Por defecto usa MockAPI; para el mock local, verificar en Perfil que la URL apunta a `http://10.0.2.2:4000` (emulador) o `http://IP-LAN:4000` (teléfono).
4. Iniciar sesión con `TEC-001 / agua2026`.

| # | Requisito | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| M1 | R1 | Iniciar sesión, cerrar la app por completo, abrirla | Entra directo sin pedir credenciales | ⏳ |
| M2 | R1 | Perfil → Cerrar sesión | Vuelve a login; al reabrir sigue en login | ⏳ |
| M3 | R2 | Buscar `MED-12`, `MED-1234567`, `med-123456` | Error de formato; no hay consulta ni datos | ⏳ |
| M4 | R3 | Buscar `MED-100001` con red | Se ven todos los datos y “Datos de oficina” | ⏳ |
| M5 | R3 | Activar modo avión y volver a abrir el mismo medidor | Se ven los datos con aviso de copia local | ⏳ |
| M6 | R4 | En modo avión, registrar `MED-100001` con lectura 130 | Se guarda como pendiente | ⏳ |
| M7 | R5 | Probar normal sin lectura | Error; no avanza | ⏳ |
| M8 | R5 | Inaccesible sin motivo; luego con motivo | Error; con motivo permite continuar y no hay lectura | ⏳ |
| M9 | R5 | Dañado sin descripción; luego con descripción | Error; con descripción permite continuar | ⏳ |
| M10 | R6 | `MED-100001`, lectura 161 | Advertencia de anomalía; exige confirmación | ⏳ |
| M11 | R6 | `MED-100001`, lectura 160 | Consumo 60; no hay anomalía | ⏳ |
| M12 | R7 | Anomalía sin foto | No permite guardar | ⏳ |
| M13 | R7 | Medidor dañado sin foto | No permite guardar | ⏳ |
| M14 | R7 | Normal sin anomalía, sin foto | Permite guardar | ⏳ |
| M15 | R7 | Denegar permiso de cámara en un caso opcional | Explica el motivo y permite continuar | ⏳ |
| M16 | R7 | Guardar una lectura con foto, reiniciar el teléfono | La foto sigue visible | ⏳ |
| M17 | R8 | Empezar registro, escribir datos, quitar la app de recientes, abrirla | Ofrece continuar o descartar | ⏳ |
| M18 | R8 | Continuar el borrador | Conserva datos, paso y foto | ⏳ |
| M19 | R8 | Descartar el borrador | Pide confirmación y no queda borrador | ⏳ |
| M20 | R9 | Con pendientes, quitar modo avión | Se envían solas; el contador baja | ⏳ |
| M21 | R9 | Activar modo avión durante el envío | La lectura llega una sola vez | ⏳ |
| M22 | R9 | Navegar por todas las pestañas | La franja de conexión y pendientes está visible | ⏳ |
| M23 | R10 | Abrir una pendiente y corregir la lectura | Se guarda y vuelve a pendiente | ⏳ |
| M24 | R10 | Abrir una enviada | No muestra acción de edición | ⏳ |
| M25 | R10 | Registrar dos veces el mismo medidor en el mismo mes | La segunda vez muestra “Ya hay una lectura de este periodo” y no crea otra | ⏳ |
| M26 | R10 | Guardar `MED-100008` (el mock ya tiene octubre) y sincronizar | El servidor responde 409; la lectura local pasa a revisión y no se duplica en la oficina | ⏳ |
| M27 | R10 | Insertar dos veces el mismo medidor/periodo | SQLite rechaza el segundo `INSERT` | ✅ (código) |
| M28 | R5 | Abrir el calendario de `fechaRegistro` y elegir una fecha futura | El calendario no permite elegirla; si se escribe en web, el dominio la rechaza | ⏳ |
| M29 | R5 | Elegir el mes anterior en el paso 1 | El resumen muestra el periodo elegido y la fecha formateada | ⏳ |
| M30 | R10 | Corregir una lectura de hace más de un año | La fecha original se conserva y no se bloquea por el límite de un año | ⏳ |
| M31 | R3 | Abrir `MED-100001` → Editar; cambiar dirección y fecha; guardar | `PUT` correcto, mensaje de éxito y caché actualizada | ⏳ |
| M32 | Diseño | Recorrer login, tabs, tarjetas, campos, alertas y tab bar | Claymorphism consistente, textos legibles y estados con icono + texto | ⏳ |

### Cómo registrar el resultado

Para la entrega, se recomienda ejecutar la matriz en el emulador o teléfono y sustituir ⏳ por “OK” o “falla + detalle”. No se debe afirmar que un caso pasó sin haberlo ejecutado.

## 5. Pruebas de la lógica de duplicados

La restricción tiene tres capas:

1. **Interfaz**: al abrir el medidor se busca la lectura del periodo y se muestra un aviso.
2. **Servicio**: `guardarNuevaLectura()` consulta `(codigo_medidor, periodo)` antes de insertar.
3. **SQLite**: `UNIQUE (codigo_medidor, periodo)`.

Para probar la capa 3 sin la interfaz, se puede abrir una consola de desarrollo y ejecutar dos `INSERT` con el mismo medidor y periodo; el segundo debe fallar con `UNIQUE constraint failed`.

## 6. Riesgos conocidos y qué falta probar

| Riesgo | Mitigación actual | Prueba pendiente |
|---|---|---|
| El permiso de cámara se deniega para siempre | Se detecta `canAskAgain` y se ofrece abrir ajustes | Probar en dispositivo |
| El teléfono mata la app durante un POST | La lectura queda `enviando`; al arrancar se resetea a `pendiente` | Simular cierre forzado |
| El servidor guarda pero no responde | Antes de reintentar se busca por `localId` | Simulado en pruebas unitarias |
| El mock no es accesible por LAN | URL configurable en Perfil + `EXPO_PUBLIC_API_URL` | Probar con teléfono real |
| La foto se borra al limpiar caché | Se copia a `Paths.document` | Reinicio real del teléfono |
| El consumo se calcula con datos viejos | Al sincronizar se refresca el medidor si faltan datos | Simulado en pruebas unitarias |
| La fecha se desplaza un día por UTC | Se distingue día calendario (`YYYY-MM-DD`) de instante ISO; medianoche UTC se trata como el mismo día | `tests/validacionesEntidades.test.ts` |
| El selector nativo no está en Expo Go | Se usa development build o APK; `app.json` declara el plugin | Instalar el APK |
| MockAPI gratuito limita registros o no impone unicidad | Seed idempotente y sincronización idempotente en el cliente | No se prueba un volumen mayor a 100 registros |

## 7. Conclusión honesta

- **Automatizado y verificado:** reglas de validación, fechas y rangos, consumo, estados, foto obligatoria, idempotencia del motor de sincronización, contrato exacto de MockAPI, typecheck, lint, doctor y bundle Android.
- **Verificado solo por código:** restricción `UNIQUE`, transacciones, persistencia de la foto y restauración del borrador.
- **No verificado:** ejecución del APK, selector nativo en un teléfono, permisos reales de cámara, modo avión, reinicio del teléfono y envío con corte de red real.
