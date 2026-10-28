# ADR-010: Usar MockAPI como sistema de oficina y conservar un mock local compatible

> **Actualización (2026-10-27):** la versión inicial de este ADR elegía un servidor local porque no había una URL de MockAPI disponible. Se proporcionó después el proyecto `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`, se sembró y se verificó. La decisión final usa MockAPI por defecto y mantiene el servidor local como respaldo reproducible.

## Estado

Aceptado y actualizado.

## Fecha

2026-10-26, actualizado el 2026-10-27.

## Requisitos relacionados

R2, R3, R4, R9 y R10. MockAPI es la fuente de los medidores y el destino de la sincronización.

## Contexto

El enunciado pide MockAPI o una herramienta equivalente, con recursos `medidores` y `lecturas`. La app debe funcionar contra un servicio real y no debe simular respuestas dentro de las pantallas.

En la primera entrega no había una URL de MockAPI configurada. Se añadió una URL del panel que terminaba en `/recursos`; esa ruta devuelve 404 y no es un endpoint REST. La raíz correcta es `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`, con los recursos `/medidores` y `/lecturas`.

MockAPI gratuito no impone unicidad por `localId` ni por medidor/periodo. Por eso la idempotencia y la prevención de duplicados deben seguir viviendo en el cliente y en SQLite, sin confiar en una restricción del servidor.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| MockAPI en la nube | Es la opción pedida; URL pública accesible desde cualquier red; panel para ver registros; HTTPS; el APK no depende de una PC. | No impone unicidad por `localId` ni por medidor/periodo; el plan gratuito limita registros; el seed debe ser idempotente. |
| Solo servidor local Node compatible | Sin credenciales; datos deterministas; impone unicidad y permite simular fallos. | El teléfono y la computadora deben estar en la misma red; no demuestra un backend público. |
| `msw` o un mock dentro del bundle | No requiere red. | Simularía las respuestas dentro de la app y ocultaría errores reales; contradice el enunciado. |
| `json-server` | Poco código. | No valida reglas de unicidad ni devuelve 409; agrega una dependencia de desarrollo. |

## Decisión

Se usa **MockAPI por defecto** y se conserva el servidor local como alternativa didáctica.

- URL base por defecto: `https://6ae0a4a2be3bc8fead97a3b2.mockapi.io`.
- Recursos: `/medidores` y `/lecturas`. La ruta `/recursos` es una página del panel, no un endpoint; devuelve 404.
- `mock-api/seed.json` es el contrato canónico. `src/utils/contratoRemoto.ts` arma los cuerpos con exactamente esos campos.
- `scripts/seed-mockapi.mjs` siembra 10 medidores y 3 lecturas de forma idempotente, por `codigo` y por `localId`.
- La app puede apuntar a otro MockAPI, a un túnel o al mock local desde **Perfil → Sistema de oficina**.
- Prioridad de URL: `EXPO_PUBLIC_API_URL` → URL guardada en SQLite → MockAPI por defecto.
- El mock local sigue disponible con `npm run mock:reset` y comparte los mismos endpoints. Si se usa, la URL debe cambiarse en Perfil; el teléfono y la PC deben estar en la misma red.
- El plugin `plugins/withCleartextTraffic.js` se conserva para el mock local HTTP. MockAPI usa HTTPS y no lo necesita, pero el APK de demostración mantiene ambos escenarios.

La app funciona igual contra MockAPI: los servicios usan los mismos endpoints y campos. La diferencia es que el servidor local devuelve 409 en duplicados, mientras que MockAPI puede aceptarlos si la comprobación previa falla. Esa limitación se documenta y no se oculta.

No se incluyen datos de medidores dentro de las pantallas ni se simula un envío exitoso. Si la API no responde, la lectura queda pendiente y se muestra el error.

## Consecuencias

- El APK puede demostrarse sin una computadora ni una red local.
- Se gana un entorno reproducible con el mock local para probar 409 y fallos.
- MockAPI no es una fuente de verdad para reglas de negocio: la idempotencia por `localId` y el `UNIQUE(codigo_medidor, periodo)` local siguen siendo necesarios.
- El seed se puede ejecutar varias veces sin duplicar; si se borran registros desde el panel, el seed los vuelve a crear.
- El plan gratuito y el límite de registros no son un escenario de producción.
- La foto y los campos locales no se envían porque el seed no los define.

## Verificación

1. Ejecutar `npm run seed:mockapi` y confirmar 10 medidores y 3 lecturas.
2. Ejecutar de nuevo el seed y confirmar que no crea duplicados.
3. Consultar `GET /medidores?codigo=MED-100001` y comprobar los ocho campos.
4. Crear una lectura temporal con los nueve campos, consultarla por `localId` y borrarla.
5. Actualizar un medidor temporal con `PUT` y borrarlo.
6. Confirmar que `/recursos` devuelve 404 y que la app usa la raíz.
7. Abrir la app, consultar un medidor y sincronizar una lectura.
8. Opcional: `npm run mock:reset`, cambiar la URL en Perfil y repetir el flujo contra el servidor local.

