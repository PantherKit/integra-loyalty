# Integra Design System

Sistema de diseño base para productos, landing pages, dashboards, escuelas, herramientas internas y experiencias comerciales de Integra AI.

Este documento traduce la landing actual de Integra en una guia reutilizable. No es solo una lista de colores: define criterio visual, tono, componentes, patrones de layout, motion, accesibilidad y reglas de normalizacion para mantener consistencia entre proyectos.

## 1. Principio Rector

Integra debe sentirse como una firma tecnica senior: clara, calida, precisa y orientada a produccion.

La marca no debe parecer una startup generica de inteligencia artificial, una consultora corporativa fria ni una pagina decorativa sin sustancia. La experiencia debe comunicar que Integra construye sistemas reales, entiende operaciones complejas y puede llevar IA desde estrategia hasta deploy.

La direccion visual se resume asi:

- Tecnica, pero cercana.
- Moderna, pero no efimera.
- Editorial, pero operativa.
- Premium, pero sin lujo ornamental.
- Directa, pero no agresiva.
- Minimalista, pero no vacia.

La interfaz debe inspirar confianza antes que asombro. Si una pantalla necesita explicar que es innovadora, probablemente no lo es. Integra demuestra sofisticacion con estructura, precision, jerarquia, detalles tecnicos bien integrados y copy concreto.

## 2. Personalidad De Marca

### Como Debe Sentirse

Integra debe sentirse como estar hablando con el equipo tecnico fundador, no con un vendedor. La interfaz debe dar la impresion de que detras hay ingenieros que han construido, desplegado, monitoreado y mantenido sistemas reales.

Rasgos principales:

- **Senior:** las decisiones visuales se sienten deliberadas, no decorativas.
- **Confiable:** el contraste, el espaciado y la legibilidad estan cuidados.
- **Concreta:** cada bloque comunica un resultado o una capacidad real.
- **Calida:** la paleta evita el frio corporativo y los azules genericos de SaaS.
- **Tecnica:** el sistema usa metadata, indices, KPIs, diagramas y mono typography con moderacion.
- **Humana:** se muestra el equipo, se habla claro, se evitan buzzwords.

### Como No Debe Sentirse

- No debe sentirse como una plantilla de "AI agency".
- No debe usar estetica de neon, cyberpunk o dark mode con brillos morados.
- No debe sonar como pitch deck generico.
- No debe esconderse detras de jerga tecnica.
- No debe llenar la interfaz de cards sin jerarquia.
- No debe usar elementos decorativos que no expliquen nada.

## 3. Audiencia Y Casos De Uso

### Audiencia Principal

Integra habla principalmente con lideres B2B:

- Founders y CEOs de startups que quieren incorporar IA a su producto.
- Directores de operaciones que buscan automatizar procesos.
- Lideres de producto que necesitan convertir una idea de IA en software real.
- Empresas medianas que quieren modernizar flujos sin contratar un equipo completo de IA.
- Equipos de salud, finanzas y operaciones donde el riesgo de una mala implementacion es alto.

### Jobs To Be Done

La interfaz debe ayudar a estas personas a responder rapido:

- Que puede construir Integra.
- Si Integra entiende problemas reales de operacion.
- Si el equipo es tecnico de verdad.
- Si hay experiencia suficiente para llevar algo a produccion.
- Como se trabaja con Integra.
- Que resultados o tipos de proyecto existen.
- Como iniciar una conversacion sin friccion.

### Implicacion De Diseno

Las pantallas deben priorizar claridad, confianza y evidencia. La decoracion debe ser secundaria. El usuario no esta buscando entretenimiento; esta evaluando si puede confiar una iniciativa de IA a este equipo.

## 4. Atmosfera Visual

La atmosfera base es editorial-tecnica: mucho aire, grandes titulares, divisores finos, layout contenido, contraste sobrio y pequenos momentos de movimiento.

Escalas recomendadas:

- **Densidad:** 4/10 para landing y marketing; 6/10 para herramientas; 7/10 para dashboards operativos.
- **Varianza:** 6/10. Usar composiciones asimetricas y secciones con ritmo, pero sin caos.
- **Motion:** 5/10. Motion refinado y funcional, no espectaculo permanente.
- **Calidez:** 7/10. Los neutrales deben sentirse humanos, no frios.
- **Tecnicidad:** 7/10. Usar senales tecnicas reales: indices, mono labels, diagramas simples, metricas y procesos.

La interfaz debe tener una cualidad de "documento vivo": como una propuesta tecnica muy bien disenada, no como una pagina publicitaria.

## 5. Tokens De Color

Los tokens actuales viven en `src/styles/global.css` y deben considerarse la fuente visual base para nuevos proyectos.

### Paleta Principal

| Token | Valor | Uso |
| --- | --- | --- |
| `bg-primary` | `#ffffff` | Canvas principal, fondos de pagina, formularios, cards blancas |
| `bg-surface-1` | `#f8f5ed` | Superficies calidas, badges suaves, backgrounds secundarios |
| `bg-surface-2` | `#eee9df` | Hover sutil, bloques alternos, separacion de profundidad |
| `bg-surface-3` | `#e3ddd2` | Scrollbars, borders fuertes, fondos de mayor contraste |
| `text-primary` | `#0f0d0a` | Titulares, botones primarios, texto de alta importancia |
| `text-secondary` | `#5a5450` | Parrafos, subtitulos, descripcion principal |
| `text-muted` | `#8c8780` | Metadata, indices, captions, labels secundarios |
| `accent` | `#4361ee` | Estados activos, indicadores, alertas tecnicas, pequenos acentos |
| `accent-light` | `#6b82f3` | Hover de acento, SVGs tecnicos, microinteracciones |
| `accent-muted` | `#dbe4ff` | Fondos suaves de acento, superficies informativas |
| `border` | `#e3ddd2` | Divisores, inputs, cards, estructura |
| `border-hover` | `#cdc6b9` | Borders en hover, estados de mayor presencia |

### Paleta De Portfolio

La seccion de portfolio usa un sub-sistema mas frio para comunicar infraestructura, casos tecnicos y productos en operacion.

| Token | Valor | Uso |
| --- | --- | --- |
| `portfolio-surface` | `oklch(98% 0.006 255)` | Superficie fria base |
| `portfolio-surface-strong` | `oklch(96.5% 0.018 255)` | Superficie tecnica elevada |
| `portfolio-surface-hover` | `oklch(96% 0.028 255)` | Hover de cards de proyecto |
| `portfolio-pill` | `oklch(100% 0 0)` | Pills, chips y pequenas superficies blancas |
| `portfolio-border` | `oklch(89% 0.018 255)` | Bordes frios |
| `portfolio-border-hover` | `oklch(74% 0.06 255)` | Hover activo de portfolio |
| `portfolio-muted` | `oklch(50% 0.045 255)` | Texto tecnico secundario |

### Modo Oscuro De Cierre

El modo oscuro se reserva para footer, llamadas de cierre, cards activas de portfolio o bloques de contraste editorial. No debe convertirse en el tema dominante por defecto.

Valores recomendados:

| Token | Valor | Uso |
| --- | --- | --- |
| `dark-bg` | `#0f0d0a` | Footer, bloques de cierre |
| `dark-border` | `#252220` | Divisores en fondos oscuros |
| `dark-text-primary` | `#f5f0e8` | Texto principal en oscuro |
| `dark-text-secondary` | `#c8c3bc` | Links y texto secundario claro |
| `dark-text-muted` | `#9e9890` | Parrafos secundarios |
| `dark-text-faint` | `#635e58` | Metadata y legal |
| `dark-glow` | `rgba(245, 240, 232, 0.13)` | Glow inferior muy sutil en footer |

### Reglas De Color

- El charcoal (`#0f0d0a`) es el color de autoridad de Integra.
- El indigo (`#4361ee`) es un acento tecnico, no el color principal de CTA.
- Los fondos deben mantenerse claros y calidos para transmitir cercania.
- El portfolio puede enfriarse ligeramente para separar casos tecnicos de la narrativa comercial.
- El dark mode debe aparecer como contraste estrategico, no como atmosfera principal.
- No usar negro puro `#000000`.
- No usar blanco puro como "efecto premium" en modo oscuro sin tintes calidos alrededor.
- No usar gradientes azul-morado genericos.
- No usar neon glows.
- No crear paletas nuevas por proyecto salvo que haya una extension de marca validada.

## 6. Tipografia

### Familias

| Rol | Fuente | Uso |
| --- | --- | --- |
| Sans principal | `Plus Jakarta Sans` | Titulares, body, nav, botones, formularios |
| Mono tecnica | `JetBrains Mono` | Indices, KPIs, metadata, duraciones, tags, labels tecnicos |

La decision actual de usar Plus Jakarta Sans funciona porque tiene suficiente personalidad sin volverse protagonista. JetBrains Mono debe usarse como senal tecnica, no como estetica general.

### Escala Recomendada

| Nivel | Desktop | Mobile | Peso | Line-height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Hero | `5.5rem` aprox | `3.75rem` aprox | 700 | `0.95` | `-0.025em` |
| Section title XL | `4.5rem` | `3rem` | 700 | `0.95` | `-0.02em` |
| Section title L | `3.75rem` | `2.5rem` | 700 | `0.98` | `-0.02em` |
| Feature title | `2rem-3rem` | `1.5rem-2rem` | 500-700 | `1.05-1.15` | `-0.018em` |
| Body large | `1.125rem-1.25rem` | `1rem` | 400 | `1.65` | `0` |
| Body | `1rem` | `1rem` | 400 | `1.65-1.75` | `0` |
| Small body | `0.875rem` | `0.875rem` | 400-500 | `1.6-1.75` | `0` |
| Mono label | `10-12px` | `10-12px` | 400-500 | `1.2-1.4` | `0.14em-0.2em` |

### Reglas Tipograficas

- Los titulares grandes deben ser compactos y seguros, no enormes sin control.
- Los parrafos no deben superar aproximadamente 65 caracteres por linea.
- Las descripciones comerciales deben ser cortas: una idea por parrafo.
- Usar mono para estructura: `01`, `KPI`, `~1 semana`, tags de proyecto.
- No usar mono para parrafos largos.
- Evitar uppercase en frases completas. Reservarlo para metadata corta.
- El tracking negativo solo aplica a display/headings, no a body.
- No usar Inter, Roboto, Arial u Open Sans en nuevas experiencias de marca.
- No introducir serif salvo en una exploracion editorial especifica y validada.

## 7. Espaciado Y Layout

### Contenedores

El contenedor base de Integra es amplio, centrado y con padding lateral consistente.

- Max width principal: `max-w-7xl`.
- Padding mobile: `1rem`.
- Padding tablet: `1.5rem`.
- Padding desktop: `2rem`.
- Secciones landing: `py-24` en mobile/base y `lg:py-32` en desktop.
- Scroll anchor offset: `scroll-mt-24`.

### Ritmo Vertical

La landing usa respiracion amplia. Ese ritmo debe mantenerse en otros proyectos:

- Hero: minimo `100dvh` si es experiencia principal.
- Seccion principal: 96px a 128px verticales.
- Separacion header-contenido: 48px a 64px.
- Separacion entre items editoriales: 32px a 40px.
- Separacion pequena entre label y titulo: 20px a 24px.
- Separacion entre titulo y parrafo: 24px a 32px.

### Layouts Permitidos

#### Editorial Split

Usar para secciones de alto nivel: titulo grande a un lado, explicacion breve al otro.

Ejemplos:

- Contacto.
- Portfolio.
- Servicios.
- Escuela.

Reglas:

- Titulo ocupa entre 48% y 60%.
- Descripcion ocupa entre 32% y 45%.
- En desktop puede alinearse al bottom.
- En mobile colapsa a una columna con texto alineado a la izquierda.

#### Divided Rows

Usar cuando el contenido es una lista de capacidades o proceso.

Reglas:

- Preferir divisores sobre cards.
- Indice mono a la izquierda.
- Titulo fuerte al centro.
- Descripcion breve a la derecha.
- En mobile, apilar indice, titulo y descripcion.

#### Asymmetric Case Grid

Usar para portafolio, casos de estudio y bloques con evidencia.

Reglas:

- Una card destacada mas grande.
- Una card CTA contrastada.
- Cards secundarias mas compactas.
- Las metricas deben tener contexto, no ser numeros sueltos.

#### Sticky Narrative

Usar solo cuando hay progresion real: equipo, proyecto activo, scroll de casos.

Reglas:

- Desktop only.
- Mobile debe tener fallback estatico.
- No depender del scroll para entender contenido critico.

#### Full-Viewport Conceptual Moment

Usar para una sola gran idea: hero o challenge field.

Reglas:

- `min-h-[100dvh]`, no `h-screen`.
- Debe tener fallback mobile claro.
- El texto no debe quedar tapado por visuales.

### Layouts A Evitar

- Tres cards iguales con icono, titulo y parrafo.
- Bento grid sin jerarquia real.
- Secciones encerradas en una card flotante sin razon.
- Cards dentro de cards.
- Layouts centrados repetidos en todas las secciones.
- Hero con split generico texto/imagen si la imagen no aporta informacion.

## 8. Componentes Base

### Navbar

La navbar debe ser fija, ligera y funcional.

Estados:

- Inicial: transparente, sin border visible.
- Scrolled: fondo blanco `rgba(255,255,255,0.88)`, blur `12px`, border inferior calido.
- Mobile: menu colapsado vertical con fondo solido/translucido.

Composicion:

- Logo a la izquierda.
- Navegacion al centro en desktop.
- Toggle de idioma y CTA a la derecha.
- CTA ocultable en mobile si el espacio es limitado.

Reglas:

- No usar mega menus para una landing simple.
- No usar sombras pesadas.
- Mantener altura entre 64px y 80px.
- Links en `text-secondary`; hover a `text-primary`.

### Botones

#### Primary

Uso: accion principal, contacto, agendar llamada, enviar formulario.

Estilo:

- Fondo: `text-primary`.
- Texto: `bg-primary`.
- Border radius: full pill.
- Min height: 44px o 48px.
- Padding horizontal: 20px a 28px.
- Font: 14px, 600.
- Hover: `text-secondary` como fondo o leve translate en contextos premium.

#### Secondary

Uso: explorar servicios, ver mas, accion de menor prioridad.

Estilo:

- Fondo: transparente o `bg-primary`.
- Border: `border`.
- Texto: `text-primary`.
- Hover: `border-hover` + `bg-surface-1`.

#### Icon Action

Uso: enlaces en channels, abrir externo, flechas.

Estilo:

- Circulo de 32px a 40px.
- Border calido.
- Icono simple.
- Hover puede invertir a `accent` si el contexto es tecnico o a `text-primary` si es comercial.

Reglas generales:

- No hacer todos los botones primarios.
- No usar gradientes en botones.
- No usar glow externo.
- Todo target interactivo debe medir minimo 44px en mobile.

### Inputs Y Formularios

Los formularios deben sentirse simples, confiables y rapidos.

Estilo:

- Label arriba.
- Input de una linea en pill.
- Textarea con `rounded-2xl`.
- Border `border`.
- Fondo `bg-primary`.
- Focus: border `text-primary` + ring sutil `text-primary / 7%`.
- Error debajo del campo, no solo color.
- Success state reemplaza el formulario o aparece claramente arriba.

Reglas:

- No floating labels.
- No placeholders como sustituto de labels.
- No ocultar errores.
- No pedir datos que no se usaran.

### Cards

Las cards en Integra son para agrupar evidencia, no para decorar.

Tipos:

- **Case card:** proyecto, metrica, descripcion y stack.
- **CTA card:** bloque de cierre con fondo contrastado.
- **Program card:** escuela, curso o oferta educativa.
- **Technical card:** visualizacion, diagrama o KPI.

Estilo:

- Radius: 12px a 24px.
- Border: `border` o `portfolio-border`.
- Fondo: `bg-primary`, `portfolio-pill` o `text-primary` para contraste.
- Shadow: usar muy poco; preferir border y espacio.

Reglas:

- No usar cards para todo.
- No meter cards dentro de cards.
- Si una card no tiene una unidad semantica clara, probablemente debe ser un row o section.

### Pills, Chips Y Badges

Uso:

- Tags de tecnologia.
- Estado de programa.
- Categorias.
- Labels pequenos.

Estilo:

- Radius full.
- Border suave.
- Font 11px a 13px.
- Texto `text-secondary` o `text-muted`.
- Fondo `bg-surface-1`, `portfolio-pill` o transparente.

Reglas:

- No saturar una seccion con demasiados chips.
- Los chips deben ayudar a escanear, no reemplazar explicacion.

### Metrics / KPIs

Uso:

- Resultados de casos.
- Estadisticas de portfolio.
- Indicadores de proceso.

Estilo:

- Valor en 40px a 56px.
- Tracking `-0.03em`.
- Label pequeno debajo o alineado.
- Contexto obligatorio.

Reglas:

- No usar metricas inventadas.
- No usar numeros redondos genericos como `99%`, `10x`, `1M+` sin respaldo.
- Si la metrica es cualitativa, usar label honesto.

### Footer

El footer puede funcionar como cierre oscuro de marca.

Estilo:

- Fondo `#0f0d0a`.
- Texto principal `#f5f0e8`.
- Texto secundario `#9e9890`.
- Metadata `#635e58`.
- Border `#252220`.
- Glow inferior muy sutil, nunca neon.

Reglas:

- El footer debe cerrar con datos reales: email, WhatsApp, ubicacion, links.
- Legal puede usar mailto si no existen paginas legales, pero debe documentarse como fallback temporal.

## 9. Patrones Por Seccion

### Hero

Objetivo: comunicar la propuesta de valor en menos de 5 segundos.

Estructura recomendada:

- Splash o entrada breve solo en experiencias principales.
- Titulo grande con una idea clara.
- Palabra o frase cinetica si refuerza posicionamiento.
- Subtitulo corto: de estrategia a deploy, produccion, infraestructura, operacion.
- Dos CTAs maximo.
- Visual abstracto o tecnico que no compita con el texto.

Reglas:

- El H1 debe ser literal y claro.
- No usar claims genericos como "Transforma tu negocio".
- No saturar con badges.
- El motion no debe bloquear el acceso si el usuario tiene reduced motion.

### Challenge Field

Objetivo: demostrar que Integra entiende los problemas reales antes de vender solucion.

Estructura:

- Statement central.
- Chips alrededor en desktop.
- Lista lineal en mobile.
- Icono de alerta simple.

Reglas:

- Los chips deben representar dolores concretos.
- No convertirlo en una lista de beneficios.
- El layout absoluto solo aplica en desktop y con control de overlap.

### Social Proof

Objetivo: dar confianza tecnica sin hacer ruido.

Estructura:

- Texto corto.
- Lista de tecnologias, clientes o capacidades.

Reglas:

- Si se muestran tecnologias, no usar logos pesados salvo que agreguen confianza real.
- Si se muestran clientes, usar solo los aprobados.
- Mantenerlo sobrio.

### Services

Objetivo: explicar que construye Integra.

Patron actual recomendado:

- Header editorial.
- Rows divididos.
- Numero mono.
- Titulo.
- Descripcion concreta.

Reglas:

- Evitar cards iguales.
- Cada servicio debe mapear a un problema operativo.
- No listar tecnologias como sustituto de valor.

### Process

Objetivo: reducir incertidumbre sobre como trabaja Integra.

Estructura:

- 4 etapas maximo.
- Numero mono.
- Titulo breve.
- Descripcion orientada a entregable.
- Duracion aproximada.
- CTA final.

Reglas:

- El proceso debe sonar ejecutable, no ceremonial.
- Evitar pasos vagos como "innovacion" o "transformacion".
- Duraciones deben ser aproximadas y honestas.

### Team

Objetivo: demostrar que quienes venden tambien construyen.

Estructura desktop:

- Claims de "por que Integra".
- Sticky scroll del equipo.
- Foto en grayscale.
- Rol, bio y skills en mono.

Estructura mobile:

- Lista apilada.
- Foto pequena.
- Bio clara.

Reglas:

- Mostrar perfiles reales.
- No usar avatars genericos.
- Las bios deben explicar la funcion de negocio, no solo tecnologias.

### Case Studies / Portfolio

Objetivo: dar evidencia de capacidad.

Estructura landing:

- Sticky intro.
- Featured case.
- CTA card al portfolio.
- Casos secundarios.

Estructura portfolio:

- Header editorial.
- Stats generales.
- Scroll-driven project stack en desktop.
- Fallback estatico en mobile/reduced motion.

Reglas:

- Cada caso debe tener problema, resultado, stack y contexto.
- Si hay NDA, escribir caso anonimo pero especifico.
- No usar metricas falsas.
- Las demos navegables deben tener URL real.

### Contact

Objetivo: reducir friccion para iniciar conversacion.

Estructura:

- Titulo directo.
- Subtitulo con expectativa.
- Formulario principal.
- Canales secundarios: calendario, WhatsApp, email.

Reglas:

- El primer contacto debe sentirse facil.
- El formulario no debe parecer enterprise procurement.
- WhatsApp puede ser directo, pero sin tono informal excesivo.
- Si el calendario no esta conectado, no usar `#` en produccion.

## 10. Motion E Interaccion

### Filosofia

Motion en Integra debe comunicar precision, continuidad y estado. No debe parecer animacion decorativa de template.

Principios:

- Motion ayuda a entender jerarquia.
- Motion confirma interaccion.
- Motion revela progresivamente contenido complejo.
- Motion nunca debe ser necesario para entender la pagina.

### Easing Y Timing

Valores recomendados:

- Entrada base: `0.7s cubic-bezier(0.16, 1, 0.3, 1)`.
- Hero reveal: `0.72s cubic-bezier(0.16, 1, 0.3, 1)`.
- Crossfade de contenido: `0.45s cubic-bezier(0.16, 1, 0.3, 1)`.
- Scroll reveal GSAP: `power4.out`.
- Scroll scrub: `0.7` a `0.9`.

### Reglas De Implementacion

- Animar `opacity` y `transform`.
- Evitar animar `top`, `left`, `width`, `height`, `padding` y `margin`.
- Para expand/collapse, preferir `grid-template-rows`.
- Para scroll avanzado, usar GSAP ScrollTrigger solo donde aporte narrativa.
- Para smooth scrolling, usar Lenis solo en desktop/no-touch y sin reduced motion.
- Siempre incluir fallback para `prefers-reduced-motion`.
- En touch/coarse pointer, desactivar pinned scroll complejo.

### Patrones Permitidos

- Fade-up con stagger.
- Word cycling en hero.
- Splash breve de marca.
- Sticky story desktop.
- SVG mini-animations para casos tecnicos.
- Count-up solo para metricas numericas reales.

### Patrones Prohibidos

- Bounce/elastic exagerado.
- Parallax constante sin funcion.
- Particulas.
- Blobs flotantes.
- Cursor personalizado.
- Animaciones infinitas que compiten con lectura.

## 11. Accesibilidad

La accesibilidad forma parte de la calidad percibida. No es una fase posterior.

Reglas base:

- Todo sitio debe incluir skip link.
- Todo focus visible debe tener outline claro.
- El contraste debe cumplir WCAG AA minimo.
- Los botones y links deben tener nombres accesibles.
- Los links externos deben indicar si abren nueva pestaña con texto sr-only.
- Las imagenes decorativas deben tener `alt=""`.
- Las imagenes informativas deben tener alt especifico.
- Los menus mobile deben actualizar `aria-expanded`.
- Formularios deben usar labels reales.
- Errores deben comunicarse con texto, no solo color.
- Motion debe respetar `prefers-reduced-motion`.

Reglas de responsive accessibility:

- Target tactil minimo de 44px.
- No debe existir scroll horizontal accidental.
- El contenido critico no debe depender de hover.
- El sticky/pinned desktop debe tener alternativa mobile.

## 12. UX Writing

### Voz

La voz de Integra debe sonar como un equipo tecnico que sabe explicar. Clara, segura, especifica y sin exageracion.

Debe ser:

- Directa.
- Concreta.
- Profesional.
- Humana.
- Sin hype.
- Orientada a resultado.

### Frases Que Si Funcionan

- "De estrategia a deploy en semanas."
- "Los fundadores escriben el codigo."
- "Sistemas de IA construidos para operar, no para quedarse en demo."
- "Cada solucion se disena para tu operacion."
- "Demos semanales para que nunca estes a ciegas."
- "El codigo, la documentacion y el sistema son tuyos desde el primer dia."

### Frases A Evitar

- "Transforma tu negocio con IA."
- "Potencia tu empresa con soluciones innovadoras."
- "Lleva tu negocio al siguiente nivel."
- "El futuro de la inteligencia artificial."
- "Soluciones disruptivas."
- "IA revolucionaria."
- "Experiencias seamless."
- "Next-gen AI."
- "Unleash the power of AI."

### Reglas De Copy

- Una idea por bloque.
- Titulares literales antes que poeticos.
- Subtitulos explican el valor, no repiten el titulo.
- CTAs deben decir accion concreta.
- Las metricas deben explicar contexto.
- Si se habla de velocidad, incluir mecanismo o proceso.
- Si se habla de seniority, mostrar evidencia.

## 13. Sistema De Iconografia E Imagen

### Iconos

La iconografia debe ser lineal, simple y funcional. Los iconos actuales usan SVGs de stroke fino, 20px, `stroke-width` aproximado de `1.5`.

Reglas:

- Usar iconos solo si ayudan a escanear.
- Mantener stroke consistente.
- Evitar iconos rellenos pesados.
- Evitar iconos genericos grandes arriba de cada card.
- No usar emoji como iconografia de marca.

### Fotografia

Uso permitido:

- Equipo real.
- Producto real.
- Capturas o visualizaciones reales.

Tratamiento:

- Fotos de equipo en grayscale para mantener sobriedad.
- Radius moderado: 12px.
- Object-fit cover.
- Evitar stock photos.

### Visualizaciones Tecnicas

Se prefieren pequenos SVGs/diagramas propios para explicar:

- Pipelines.
- Agentes.
- Conexiones.
- Flujos.
- Sistemas.
- KPIs.

Reglas:

- Deben ser simples.
- Deben reforzar contenido real.
- No usar charts decorativos sin datos.

## 14. Responsive System

### Breakpoints Practicos

- Mobile: `<640px`.
- Tablet: `640px-1023px`.
- Desktop: `1024px+`.
- Large desktop: `1280px+`.

### Mobile

Reglas:

- Todo layout multicolumna colapsa a una columna.
- El texto se alinea mayormente a la izquierda.
- Las secciones mantienen aire, pero reducen padding vertical.
- Los sticky scrolls se convierten en listas.
- Visuales absolutos se convierten en listas o bloques estaticos.
- CTAs pueden wrappear, pero no deben quedar apretados.

### Tablet

Reglas:

- Mantener jerarquia desktop cuando sea posible.
- Evitar composiciones absolutas complejas.
- Usar grids de 2 columnas solo si el contenido respira.

### Desktop

Reglas:

- Aprovechar layouts asimetricos.
- Usar sticky narrativo solo con valor claro.
- Mantener max-width para no diluir lectura.
- No estirar parrafos a ancho completo.

## 15. Normalizacion Entre Proyectos

Cuando se construya un nuevo proyecto de Integra, revisar estas dimensiones antes de considerarlo alineado.

### Checklist Visual

- Usa la paleta base de Integra o una extension justificada.
- Los CTAs primarios usan charcoal, no azul por defecto.
- El acento indigo aparece con moderacion.
- La tipografia base es Plus Jakarta Sans + JetBrains Mono o equivalente aprobado.
- Los headings tienen tracking compacto y line-height controlado.
- Los parrafos tienen line-height amplio.
- Los borders son calidos y sutiles.
- No hay sombras pesadas innecesarias.
- No hay neon, blobs ni gradientes IA genericos.

### Checklist De Layout

- Usa contenedor max-width consistente.
- Tiene ritmo vertical suficiente.
- No abusa de cards.
- Usa divisores cuando el contenido es procedural.
- Las secciones tienen jerarquia clara.
- Mobile no tiene overflow horizontal.
- No hay cards anidadas.
- No hay contenido critico oculto en hover.

### Checklist De Componentes

- Botones tienen estados hover/focus/disabled.
- Inputs tienen labels reales.
- Formularios tienen success/error states.
- Links externos tienen `rel="noopener noreferrer"`.
- Nav mobile tiene `aria-expanded`.
- Imagenes tienen alt correcto.
- Cards representan unidades semanticas reales.

### Checklist De Motion

- Respeta `prefers-reduced-motion`.
- No corre scroll smooth en touch si degrada experiencia.
- Animaciones usan transform/opacity.
- No hay loops infinitos distractores.
- Sticky scroll tiene fallback.

### Checklist De Copy

- El H1 comunica valor real.
- No hay buzzwords vacios.
- Cada servicio se conecta a un problema operativo.
- Cada metrica tiene contexto.
- Los CTAs son concretos.
- El tono suena senior, no vendedor.

## 16. Oportunidades De Extraccion En Codigo

Estas oportunidades no son obligatorias para todos los proyectos, pero conviene extraerlas si Integra seguira creciendo varios sitios o apps.

### Tokens

Extraer a un paquete o archivo compartido:

- Color tokens principales.
- Dark footer tokens.
- Portfolio/cool technical tokens.
- Radius scale.
- Shadow scale.
- Typography tracking scale.
- Motion easing/duration tokens.

### Componentes Reutilizables

Componentes candidatos:

- `SectionShell`: wrapper con `max-w-7xl`, padding lateral y vertical.
- `SectionHeader`: titulo grande + descripcion lateral.
- `Button`: variants `primary`, `secondary`, `ghost`, `icon`.
- `Pill`: tech, status, badge.
- `MonoLabel`: uppercase metadata.
- `Metric`: value + label + optional context.
- `ContactForm`: campos base + estados.
- `ChannelLink`: canal de contacto con icon action.
- `CaseCard`: featured/secondary/contrast variants.
- `ProcessStep`: indice + titulo + descripcion + duracion.
- `Footer`: dark cierre de marca.

### Patrones Reutilizables

- Editorial split.
- Divided rows.
- Sticky narrative with static fallback.
- Project stack with reduced-motion fallback.
- Challenge chips desktop/mobile.
- CTA contrast block.

### Criterio De Extraccion

No extraer todo inmediatamente. Extraer cuando:

- El patron aparece 3 o mas veces.
- El patron se reutilizara en otro proyecto.
- La extraccion reduce inconsistencia.
- La API del componente puede ser simple.

No extraer cuando:

- Es una seccion unica de storytelling.
- Requiere demasiadas props para casos raros.
- La abstraccion oculta el contenido.
- Solo evita escribir algunas clases.

## 17. Implementacion Recomendada En Tailwind / Astro

### Tokens

Mantener tokens semanticos en `@theme`. Preferir nombres por funcion, no por color visual.

Ejemplos correctos:

- `--color-bg-primary`
- `--color-text-secondary`
- `--color-border-hover`
- `--color-accent-muted`

Ejemplos a evitar:

- `--color-beige-1`
- `--color-random-blue`
- `--color-card-gray`

### Componentes Astro

Reglas:

- Componentes de seccion reciben `lang` cuando dependen de i18n.
- Mantener data/content fuera del markup cuando sea repetitivo.
- Evitar scripts duplicados por componente si puede centralizarse.
- Scripts interactivos deben protegerse contra elementos inexistentes.
- Toda interaccion compleja debe tener fallback.

### CSS

Reglas:

- Usar tokens antes que valores hardcodeados.
- Valores hardcodeados solo si son especificos y documentados.
- CSS scoped en componentes para comportamientos locales.
- Global CSS para tokens, base styles y utilidades transversales.

## 18. Gobernanza Del Sistema

### Cuando Crear Un Nuevo Token

Crear token si:

- Representa una decision de marca.
- Aparece en varias secciones.
- Se usara en mas de un proyecto.
- Tiene un rol semantico claro.

No crear token si:

- Es un ajuste unico de una animacion.
- Es un valor experimental.
- Solo aparece una vez.

### Cuando Crear Un Nuevo Componente

Crear componente si:

- Tiene estructura repetida.
- Necesita accesibilidad consistente.
- Tiene estados o variantes.
- Reduce duplicacion real.

No crear componente si:

- La abstraccion seria mas dificil de leer que el HTML.
- Depende demasiado del contenido especifico.
- Solo agrupa clases sin criterio.

### Cuando Permitir Variacion

La variacion es aceptable cuando:

- El proyecto tiene un contexto distinto: dashboard, escuela, portfolio, herramienta interna.
- La variacion conserva tokens base.
- La variacion mejora el job-to-be-done.
- La variacion no rompe voz ni accesibilidad.

La variacion no es aceptable cuando:

- Introduce una paleta nueva sin razon.
- Usa patrones prohibidos.
- Hace que Integra parezca otra marca.
- Sacrifica legibilidad por impacto visual.

## 19. Anti-Patrones Prohibidos

No usar:

- Gradientes azul/morado de IA generica.
- Neon glows.
- Blobs, orbs o particulas decorativas.
- Stock photos corporativas.
- Emojis como iconografia de interfaz.
- Tres cards iguales como solucion por defecto.
- Cards dentro de cards.
- Hero con texto generico y visual irrelevante.
- Metricas falsas o sin contexto.
- Copy con buzzwords.
- Dark mode por defecto con acentos brillantes.
- Pure black `#000000`.
- Inter/Roboto/Open Sans como default de marca.
- Scroll-jacking sin fallback.
- Animaciones que bloquean contenido.
- Links `#` en acciones productivas.
- Formularios sin estados de error/success.
- Componentes one-off con valores hardcodeados que deberian ser tokens.

## 20. Definition Of Done Para Nuevas Interfaces Integra

Una nueva interfaz de Integra esta lista cuando:

- Respeta paleta, tipografia y layout base.
- Tiene jerarquia clara en 5 segundos.
- Comunica valor concreto sin buzzwords.
- Funciona bien en mobile y desktop.
- No tiene overflow horizontal.
- Cumple focus visible y labels accesibles.
- Respeta reduced motion.
- Los CTAs llevan a destinos reales.
- Las metricas y claims tienen contexto.
- No introduce patrones visuales ajenos a la marca.
- El codigo usa tokens donde corresponde.
- Los componentes reutilizables no duplican implementaciones existentes.

## 21. Resumen Ejecutivo

Integra debe verse como lo que vende: inteligencia aplicada con criterio senior.

El sistema visual se sostiene en cinco decisiones:

1. Base clara, calida y sobria.
2. Charcoal como autoridad principal.
3. Indigo como acento tecnico controlado.
4. Tipografia grande, compacta y editorial.
5. Estructuras limpias con evidencia concreta.

Si una decision visual no mejora claridad, confianza o comprension tecnica, probablemente debe eliminarse.

