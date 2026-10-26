# ADR-011: Usar Expo Router con rutas por archivo y un grupo de pestañas

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R1, R3, R8 y R10. La navegación condiciona la recuperación del borrador, el acceso al detalle del medidor y la edición de una lectura pendiente.

## Contexto

La app tiene login, panel, búsqueda, detalle de medidor, registro en pasos, lista de lecturas, detalle/edición, recuperación de borrador y perfil. El proyecto ya viene creado con Expo Router y `typedRoutes` habilitado.

R8 exige que, al volver a abrir la app, se pueda llevar al técnico al paso pendiente. Necesito rutas identificables y la posibilidad de navegar desde código, no solo desde botones.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Expo Router | Ya está en la plantilla; cada pantalla es un archivo; permite `router.push('/registro/MED-100001')`; grupo `(tabs)` para el panel; deep links. | Obliga a mantener los componentes fuera de `src/app`; los parámetros de ruta no sustituyen la persistencia; hay que aprender su ciclo de navegación. |
| React Navigation configurado a mano | Control total; es la base de Expo Router; documentación amplia. | Hay que instalar y configurar navegadores; el proyecto ya trae Expo Router; se duplicaría una decisión resuelta. |
| Una sola pantalla con pasos condicionales | Menos archivos y menos navegación. | El botón atrás de Android no retrocede entre pasos sin código extra; la pantalla acumula toda la lógica; R8 queda más frágil. |
| WebView o app web | Rápido de prototipar. | No cumple la restricción de React Native/Expo y perdería cámara, SQLite y archivos nativos. |

## Decisión

Se usa Expo Router con esta estructura:

- `src/app/_layout.tsx`: proveedores, splash, guardia de sesión y `Stack` raíz.
- `src/app/login.tsx`: inicio de sesión.
- `src/app/(tabs)/`: Inicio, Buscar, Lecturas y Perfil.
- `src/app/medidor/[codigo].tsx`: detalle y acciones del medidor.
- `src/app/registro/[codigo].tsx`: captura por pasos y edición (`?editar=<localId>`).
- `src/app/lectura/[localId].tsx`: detalle, estado de envío y edición.
- `src/app/borrador.tsx`: continuar o descartar una captura pendiente.

Los componentes, servicios, repositorios y utilidades viven fuera de `src/app` para que Expo Router no los convierta en rutas. Los parámetros de ruta solo identifican el recurso; el contenido del formulario se recupera desde SQLite, nunca desde los parámetros.

## Consecuencias

- Se gana una estructura visible y una navegación profunda sencilla.
- Se acepta la convención de archivos y la generación de tipos de ruta.
- Riesgo: navegar al paso pendiente antes de que el borrador termine de cargar mostraría un formulario vacío. La pantalla de recuperación espera a leer SQLite antes de navegar.
- Riesgo: el botón atrás de Android puede sacar al técnico del registro. El borrador ya está persistido, así que no se pierden datos; al volver a entrar se ofrece continuar.
- No se instalan paquetes adicionales de React Navigation; se usan los que trae Expo Router.

## Verificación

1. Revisar el árbol `src/app/`.
2. Comprobar que `src/app/` solo contiene pantallas, layouts y `+not-found.tsx`.
3. Navegar de Inicio a Buscar, a Medidor, a Registro y volver atrás sin perder el borrador.
4. Cerrar la app en el paso 2 y abrirla; debe aparecer la pantalla de borrador antes de restaurar el formulario.
5. Revisar que `package.json` no tiene una instalación manual de `@react-navigation/*` distinta de las dependencias de Expo Router.
6. Verificar que los deep links `aquaruta://medidor/MED-100001` abren la pantalla correcta en desarrollo.

## Uso de IA

La IA recomendó mantener Expo Router porque ya viene en la plantilla y porque las rutas con parámetros permiten dirigir al técnico al recurso pendiente. Se descartó React Navigation manual y una única pantalla con condicionales. Se aceptó la advertencia de no guardar el formulario en los parámetros de ruta: los parámetros se pierden al cerrar la app y no resuelven R8. El estudiante debe poder explicar esta diferencia.
