# ADR-008: Construir una identidad visual propia con componentes nativos y `@expo/vector-icons`

> **Nota de actualización (2026-10-27):** la decisión de mantener componentes propios e Ionicons sigue vigente, pero la paleta y el tratamiento de superficies de este ADR fueron reemplazados por [ADR-014](ADR-014-claymorphism.md). Este documento se conserva como registro histórico.

## Estado

Aceptado.

## Fecha

2026-10-26.

## Requisitos relacionados

R1–R10 en su dimensión de usabilidad, y el criterio de diseño visual de la rúbrica, que penaliza con 5 puntos una interfaz genérica. R9 exige además que el estado de conexión y los pendientes se vean en todas las pantallas.

## Contexto

La app será usada por técnicos de campo, con sol, prisa, una mano disponible y guantes. La legibilidad y la jerarquía importan más que los efectos visuales. La app debe parecer una herramienta de agua y campo, no una plantilla de formularios.

El proyecto viene con componentes de plantilla (texto temático, tabs de ejemplo, badges de Expo) que no corresponden al dominio. Necesito una capa visual propia, consistente y fácil de explicar, sin instalar un sistema de diseño completo.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Componentes propios con `StyleSheet` + `@expo/vector-icons` (Ionicons) | Control exacto de la identidad; sin dependencias de UI pesadas; los iconos son familiares y se pueden usar en toda la app; los colores de estado se centralizan. | Hay que escribir y mantener cada componente; los iconos añaden una fuente al bundle. |
| NativeWind (Tailwind para React Native) | Utilidades rápidas, consistencia por clases. | Añade compilación y configuración; para una app pequeña, las clases no explican mejor la jerarquía que un tema centralizado. |
| React Native Paper | Componentes accesibles y probados, tema Material. | La app se parecería a una app Material genérica, justo lo que la rúbrica penaliza. Añade una dependencia grande y limita la personalidad. |
| Componentes de la plantilla de Expo | Ya existen; menos trabajo inicial. | Son una demo de Expo (logo, tabs de ejemplo, textos en inglés) y no tienen la información de campo ni los estados del dominio. |

## Decisión

Se crea un tema propio en `src/constants/ui.ts` con:

- azul profundo `#073B4C` para cabeceras y navegación;
- azul agua `#0E7490` como acento principal;
- cian claro `#E0F2FE` para superficies informativas;
- fondo `#F4F7F9` y tarjetas blancas;
- verde `#15803D` para éxito, ámbar `#B45309` para pendientes/advertencias, rojo `#B91C1C` para errores;
- tipografía del sistema, con tamaños y pesos consistentes;
- espaciado en múltiplos de 4 y radios de 16–24.

Componentes reutilizables:

- `AppScreen` (fondo, safe area, cabecera, estado de conexión);
- `AppHeader` (título, subtítulo, botón atrás, acción);
- `ConnectionStrip` (conexión + pendientes + sincronización);
- `Card`, `SectionTitle`, `InfoRow`, `Badge`, `Boton`, `CampoTexto`, `ChoiceCard`, `EmptyState`, `MeterCard`, `LecturaCard`, `FotoMedidor`.

Se usa `@expo/vector-icons` (Ionicons) para una iconografía coherente. No se usan degradados fuertes ni animaciones decorativas. Los estados no se comunican solo con color: siempre hay texto e icono.

La app se fija en modo claro (`userInterfaceStyle: "light"`), porque el contraste bajo el sol y la consistencia de los estados son más importantes que un tema oscuro no probado.

## Consecuencias

- Se gana una identidad reconocible y componentes que se pueden explicar uno por uno.
- Se acepta escribir más código de presentación y mantener el tema.
- Se agrega `@expo/vector-icons` como dependencia visual; se justifica porque la rúbrica evalúa el diseño y porque los iconos comunican estados y acciones sin texto adicional.
- Riesgo: si los componentes se usan de forma inconsistente, la app vuelve a parecer una plantilla. Se revisan todas las pantallas al final y se usan los mismos tokens.
- No hay modo oscuro. Se documenta como decisión de alcance, no como olvido.
- La accesibilidad se apoya en etiquetas `accessibilityLabel`, áreas táctiles de al menos 48 px y mensajes escritos además del color.

## Verificación

1. Revisar `src/constants/ui.ts` y `src/components/`.
2. Comprobar que `app.json` tiene `userInterfaceStyle: "light"` y que `package.json` incluye `@expo/vector-icons`.
3. Recorrer las pantallas y verificar: misma cabecera, mismos colores de estado, mismo espaciado, botones grandes, textos legibles.
4. Activar modo avión y comprobar que el indicador cambia de color **y** de texto/icono.
5. Revisar que los errores de formulario tienen texto, no solo borde rojo.
6. Verificar que las tarjetas de medidor muestran los siete datos sin amontonarlos.

## Uso de IA

La IA propuso una identidad propia con componentes nativos y descartó NativeWind y React Native Paper para evitar una apariencia genérica y dependencias grandes. Se aceptó. Se decidió usar `@expo/vector-icons` porque la plantilla no trae un set de iconos multiplataforma y porque los iconos ayudan a comunicar estados en campo. El estudiante debe poder justificar la paleta y señalar dónde se usa cada color de estado.
