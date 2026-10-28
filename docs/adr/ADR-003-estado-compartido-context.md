# ADR-003: Gestionar sesión, conectividad, pendientes y borrador con React Context y hooks

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R1, R8 y R9. También apoya R4 y R10 porque el contador de pendientes y el borrador deben estar disponibles desde varias pantallas.

## Contexto

Varias pantallas necesitan la misma información:

- el técnico identificado y la acción de cerrar sesión;
- si hay conexión;
- cuántas lecturas faltan por enviar;
- si hay un borrador pendiente;
- si una sincronización está en curso;
- la URL configurada del sistema de oficina.

Si cada pantalla consultara SQLite por su cuenta, el indicador de pendientes podría quedar desactualizado y el cierre de sesión tendría que replicarse. Necesito un estado compartido pequeño, pero la fuente de verdad de los datos debe seguir siendo SQLite.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| React Context + hooks, con SQLite como fuente de verdad | Ya viene con React; cero dependencias; el estado global es pequeño; se puede envolver la app una sola vez | Cada cambio en el valor del contexto vuelve a renderizar a los consumidores; hay que memorizar el valor y separar responsabilidades para no crear un "contexto gigante". |
| Zustand | Selectores, menos renderizados, API pequeña y persistencia opcional. | Es una dependencia adicional; su persistencia típica usa AsyncStorage, que no es la fuente de verdad de las lecturas. Para este tamaño, el beneficio no compensa. |
| Redux Toolkit | Estructura conocida, DevTools, middlewares. | Demasiado ceremonial para una sesión, un contador y un booleano de conexión. Añade dependencias y archivos que no aportan a los requisitos. |
| Pasar todo por props y parámetros de ruta | Sin estado global; flujo explícito. | El indicador de conexión y pendientes debe verse en todas las pantallas; pasarlo por props en cada ruta duplica código y se rompe al navegar. Los parámetros de ruta no sobreviven al cierre de la app. |

## Decisión

Se usa un único `AppProvider` en `src/context/AppProvider.tsx` con:

- `cargando`, `errorInicial`;
- `sesion` y las acciones `iniciarSesion` / `cerrarSesion`;
- `enLinea`, `estadoRed` y `ultimoErrorSync`;
- `pendientes`, `borradores`, `borrador`, `revision`;
- `sincronizando`, `sincronizarAhora`, `refrescarEstado`;
- `apiUrl`, `guardarApiUrl`.

Las pantallas consumen el contexto con `useApp()`. El formulario del registro sigue siendo estado local de la pantalla, porque es efímero y no lo necesitan otras pantallas. Lo que debe sobrevivir se persiste en SQLite; el contexto solo mantiene la copia necesaria para pintar la interfaz y se refresca con `refrescarEstado()` después de guardar, borrar o sincronizar.

No se instala Zustand ni Redux.

## Consecuencias

- Se gana un lugar único para el estado transversal y para las acciones de sesión y sincronización.
- Se acepta que cualquier cambio en el contexto puede re-renderizar las pantallas que lo consumen. El valor se memoriza y el estado se mantiene pequeño.
- Riesgo: el contador de pendientes podría quedar desactualizado si una operación modifica SQLite sin llamar a `refrescarEstado`. Se mitiga centralizando las mutaciones en servicios que siempre notifican.
- Riesgo: el contexto no debe convertirse en la fuente de verdad. Si la app se cierra, el contexto se reconstruye desde SQLite al iniciar.
- La sincronización no se lanza desde varias pantallas: el proveedor es el único que la programa, y el servicio tiene un candado para evitar ejecuciones simultáneas.

## Verificación

1. Revisar `src/context/AppProvider.tsx` y `src/app/_layout.tsx`.
2. Confirmar que `package.json` no contiene `zustand` ni `@reduxjs/toolkit`.
3. Iniciar sesión, guardar una lectura sin conexión y comprobar que el indicador de pendientes cambia en Inicio, Buscar, Lecturas y Perfil sin recargar la app.
4. Cerrar sesión y comprobar que el contexto de sesión se limpia y que la app vuelve al login.
5. Cerrar y abrir la app: la sesión se recupera desde SQLite, no desde memoria.


