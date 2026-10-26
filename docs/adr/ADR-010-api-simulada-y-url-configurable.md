# ADR-010: Simular el sistema de oficina con un servidor local compatible con MockAPI y URL configurable

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R2, R3, R4, R9 y R10. El sistema simulado es el destino de la sincronización y la fuente de los medidores.

## Contexto

El enunciado pide MockAPI o una herramienta equivalente, con recursos `medidores` y `lecturas`. No hay una cuenta de MockAPI configurada en el proyecto y no debo inventar una URL ni afirmar que el servicio existe.

La app necesita una API accesible desde un teléfono real para la demostración. Una URL de MockAPI en la nube sería ideal para el APK, pero:

- requiere que el estudiante cree el proyecto y cargue los datos;
- no puedo crear credenciales por él;
- para probar la idempotencia necesito provocar fallos y revisar los registros, y un servidor local me da control total;
- un MockAPI sin restricciones únicas no permite validar el rechazo de duplicados en el servidor.

Al mismo tiempo, la app no debe incluir respuestas falsas dentro de las pantallas: la verificación de sincronización debe depender de una respuesta HTTP real.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| MockAPI en la nube | Es la opción pedida; URL pública accesible desde cualquier red; panel para ver registros. | Requiere cuenta y configuración manual; no puedo crearla desde aquí; no impone unicidad por `localId` ni por medidor/periodo, así que la idempotencia queda limitada a la comprobación previa. |
| Servidor local Node compatible con la misma API REST | Sin credenciales; datos deterministas; se puede reiniciar; impone unicidad por `localId` y por medidor/periodo; sirve para probar fallos y duplicados. | El teléfono y la computadora deben estar en la misma red; la IP puede cambiar; no es un servicio público. |
| `msw` o un mock dentro del bundle | No requiere red ni computadora. | Simularía las respuestas dentro de la app y ocultaría errores reales de comunicación; el enunciado prohíbe hacer parecer que una operación remota se completó. |
| `json-server` | Poco código, API REST rápida. | No valida reglas de unicidad ni devuelve 409; agrega una dependencia de desarrollo. El servidor propio con `node:http` es más explícito y didáctico. |

## Decisión

Se incluye `mock-api/server.mjs`, un servidor HTTP sin dependencias, y `mock-api/seed.json`, con datos de demostración. La API imita el contrato REST de MockAPI:

- `GET /medidores?codigo=...`
- `GET /medidores/:id`
- `GET /lecturas?localId=...`, `?codigoMedidor=...`, `?periodo=...`
- `GET /lecturas/:id`
- `POST /lecturas` (201; 409 si se repite `localId` o medidor/periodo)
- `PATCH /lecturas/:id` (para pruebas manuales; la app no lo usa porque las enviadas son inmutables)
- `GET /health`

Los datos se guardan en `mock-api/db.json`, que se crea desde `seed.json` y está ignorado por Git. Se puede reiniciar con `npm run mock:reset`.

La app obtiene la URL en este orden:

1. `EXPO_PUBLIC_API_URL` si está definida al compilar;
2. URL guardada desde la pantalla Perfil (SQLite, tabla `configuracion`);
3. valor por defecto `http://10.0.2.2:4000` para el emulador Android.

La URL se puede cambiar en tiempo de ejecución desde Perfil, lo que permite usar el APK con un MockAPI o con la IP LAN de la computadora sin recompilar. Se valida que sea `http://` o `https://` y se prueba con una petición real.

La app funciona igual contra MockAPI: los servicios usan los mismos endpoints y campos. La diferencia es que el servidor local devuelve 409 en duplicados, mientras que MockAPI puede aceptar duplicados si la comprobación previa falla. Esa limitación se documenta y no se oculta.

No se incluyen datos de medidores dentro de las pantallas ni se simula un envío exitoso. Si la API no responde, la lectura queda pendiente y se muestra el error.

## Consecuencias

- Se gana un entorno reproducible para la defensa y para probar R9/R10.
- Se acepta que la demostración con servidor local requiere una computadora y una red compartida.
- Riesgo: la IP LAN cambia entre redes. Por eso la URL es editable en la app y se muestra el estado de la conexión.
- Riesgo: el servidor local no tiene autenticación y no debe exponerse a Internet. Es una herramienta de desarrollo.
- Riesgo: los datos de `mock-api/db.json` se modifican al probar; hay que reiniciarlos para repetir escenarios. Se documenta el comando.
- El APK no incluye una URL de MockAPI real; el estudiante debe configurarla o usar la IP del servidor local. No se afirma que el APK ya esté conectado a un backend de EPMAPS.

## Verificación

1. Revisar `mock-api/server.mjs`, `mock-api/seed.json` y `src/services/apiConfig.ts`.
2. Ejecutar `npm run mock` y abrir `http://localhost:4000/health`.
3. Consultar `GET /medidores?codigo=MED-100001` y comprobar los siete datos.
4. Hacer dos `POST /lecturas` con el mismo `localId` y comprobar que el segundo devuelve 409.
5. Hacer dos `POST` con el mismo medidor y periodo y comprobar que el segundo devuelve 409.
6. En la app, configurar la URL desde Perfil, probar la conexión y consultar un medidor.
7. Revisar que ninguna pantalla contiene medidores hardcodeados ni marca un envío como exitoso sin respuesta del servidor.

## Uso de IA

La IA propuso un servidor local compatible con MockAPI y una URL configurable, porque no hay credenciales de MockAPI en el proyecto y porque la rúbrica exige probar duplicados e idempotencia. Se mantiene el soporte para MockAPI mediante la misma interfaz. Se descartó simular la API dentro de la app porque ocultaría fallos reales y contradiría el enunciado. El estudiante debe revisar este ADR y decidir si, para la entrega final, prefiere configurar un MockAPI real y usar ese URL en el APK.
