# ADR-014: Adoptar Claymorphism como identidad visual de toda la interfaz

## Estado

Aceptado.

## Fecha

2026-10-27.

## Requisitos relacionados

R1–R10 en usabilidad y el criterio de diseño de la rúbrica. La identidad también debe comunicar los estados de conexión, envío y verificación sin depender solo del color.

## Contexto

La primera versión tenía componentes propios correctos, pero con una paleta azul/cian plana y superficies blancas. La rúbrica penaliza una interfaz genérica y la app se usa en campo, con sol, prisa y una mano disponible. La interfaz debía seguir siendo legible y rápida, no convertirse en una demostración de efectos.

Claymorphism es un estilo de superficies blandas: bordes claros y oscuros que simulan arcilla, sombras exteriores suaves, campos hundidos y formas muy redondeadas. Encaja con una app de agua y con la idea de una herramienta táctil, pero puede volverse ilegible si se exagera.

## Alternativas consideradas

| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Claymorphism con tokens propios | Personalidad reconocible; se aplica a los componentes existentes; los estados siguen siendo texto + icono. | Hay que revisar contraste y sombras en Android e iOS; más código de presentación. |
| Flat design / Material | Rápido y probado. | Se parece a una plantilla genérica; la rúbrica lo penaliza. |
| Glassmorphism | Moderno y llamativo. | El desenfoque y la transparencia reducen contraste bajo el sol y complican el rendimiento en Android. |
| Neumorphism puro | Muy táctil. | Contraste bajo, poca accesibilidad y estados difíciles de distinguir. |

## Decisión

Se crea una capa de tokens en `src/constants/ui.ts` y se aplica a todos los componentes de `src/components/ui`:

- paleta lavanda/índigo (`#5B5BD6`, `#E9EDF8`, `#F3F6FF`) con acento menta (`#0EA5A4`);
- superficies elevadas con borde claro superior/izquierdo y borde sombreado inferior/derecho (`clayBorder`);
- campos hundidos con borde invertido (`clayInset`);
- radios de 14–32 px y botones de al menos 48 px;
- sombras suaves (`clayShadowSoft`, `clayShadowStrong`) y `elevation` en Android;
- fondo con manchas lavanda, menta y durazno;
- tab bar flotante tipo píldora;
- botones y tarjetas con un brillo interior sutil.

La identidad se aplica a login, inicio, búsqueda, lecturas, perfil, ficha del medidor, edición del medidor, captura, borrador, detalle de lectura y estados vacíos. La foto y los datos no se decoran en exceso: la prioridad sigue siendo leer y capturar.

La accesibilidad se mantiene por encima del estilo:

- los estados siempre tienen texto e icono, además del color;
- las áreas táctiles miden al menos 48 px;
- los errores tienen texto y borde, no solo color;
- se conserva `userInterfaceStyle: "light"` para evitar un modo oscuro no probado bajo el sol.

## Consecuencias

- Se gana una identidad visual coherente y reconocible, distinta de una plantilla.
- Se acepta más código de presentación y una revisión visual multiplataforma.
- Las sombras de Android son más limitadas que las de iOS; `elevation` aproxima el efecto sin depender de `shadow*`.
- El fondo decorativo se dibuja con `View` absolutos y `pointerEvents="none"`; no bloquea toques.
- El estilo no reemplaza las reglas de negocio ni la validación: un formulario con Claymorphism sigue rechazando datos inválidos.

## Verificación

1. Revisar `src/constants/ui.ts` y los componentes de `src/components/ui/`.
2. Recorrer las pantallas y comprobar que todas usan las mismas superficies, radios, sombras y estados.
3. Verificar contraste de textos sobre lavanda, menta y fondos claros.
4. Activar modo avión y comprobar que el estado cambia de color, texto e icono.
5. Revisar que los campos con error muestran mensaje escrito.
6. Confirmar que el tab bar flotante no tapa el último botón de cada pantalla.
7. Ejecutar `npm run lint`, `npm run typecheck` y `npx expo export --platform android`.


