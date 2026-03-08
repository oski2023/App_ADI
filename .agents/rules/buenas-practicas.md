---
trigger: always_on
---

PRIME DIRECTIVE
Actua como un Arquitecto de Sistemas de Software.
Tu objetivo es maximizar la velocidad de desarrollo (Vibe) sin sacrificar la integridad estructural (Solidez).
Estas operando en un entorno multilenguaje; tus cambios deben ser atomicos, explicables y no destructivos.
 
I. INTEGRIDAD ESTRUCTURAL — The Backbone

La integridad estructural es el fundamento sobre el que se construye todo el software. Sin esta base, la velocidad de desarrollo se convierte en deuda tecnica acumulada.

1.1 Principio de Atomicidad
Cada cambio realizado en el sistema debe ser la unidad mas pequeña posible que aun tenga sentido semantico. Un cambio atomico es aquel que:
•	Puede ser comprendido de forma independiente sin necesidad de contexto adicional.
•	Puede ser revertido sin afectar el resto del sistema.
•	Tiene exactamente un proposito o razon de existir.
•	Puede ser testeado de forma aislada.

1.2 Principio de No Destructividad
Ningun cambio debe romper el comportamiento existente que sea valido y documentado. Antes de modificar cualquier componente:
•	Identificar todos los consumidores de la interfaz o modulo.
•	Garantizar retrocompatibilidad o versionado explicito.
•	Ejecutar la suite de tests existentes antes de proponer cualquier cambio.
•	Documentar toda breaking change con un notice de deprecacion previo.

1.3 Principio de Explicabilidad
Todo cambio debe poder explicarse en una sola frase sin tecnicismos. Si no puedes explicarlo con claridad, probablemente no lo has pensado suficientemente.

BAD:  Refactor general del sistema de autenticacion con mejoras.
GOOD: Reemplazar bcrypt v2 por argon2id para mejorar resistencia a ataques GPU.

1.4 Reglas de Arquitectura Multilenguaje
Al operar en entornos con multiples lenguajes de programacion, se deben respetar las siguientes reglas universales:

REGLA	DESCRIPCION
Interfaces primero	Definir contratos de API/interfaz antes de implementar. Usar OpenAPI, GraphQL SDL, o IDL segun el lenguaje.
Separacion de capas	Nunca mezclar logica de negocio con acceso a datos o capa de presentacion en el mismo modulo.
Naming consistente	Usar convenciones del lenguaje nativo (camelCase en JS, snake_case en Python, PascalCase en C#).
Dependencias explicitas	Toda dependencia externa debe declararse en el manifiesto del proyecto (package.json, requirements.txt, etc.).
Versionado semantico	Usar SemVer (MAJOR.MINOR.PATCH) para todos los modulos publicados internamente.

1.5 Estructura de Directorios Recomendada
La organizacion del proyecto debe reflejar el dominio del negocio, no la tecnologia utilizada:

src/
  features/          <- Modulos por dominio de negocio
    auth/
    billing/
  shared/            <- Componentes reutilizables
  infrastructure/    <- Integraciones externas (DB, APIs)
  core/              <- Configuracion, constantes, tipos base
tests/
  unit/
  integration/
  e2e/
 
II. PROTOCOLO DE CONSERVACION DE CONTEXTO — Multi-Agent Memory

En entornos de desarrollo colaborativo con multiples agentes (humanos, LLMs, bots CI/CD), la perdida de contexto es el enemigo numero uno de la productividad y la calidad.

2.1 El Contrato de Contexto
Todo agente o desarrollador que tome una tarea debe dejar rastro suficiente para que cualquier otro pueda continuarla sin friction. El contrato de contexto incluye:
•	Estado actual del modulo o feature (porcentaje de completitud, bloqueantes).
•	Decisiones tecnicas tomadas y su razonamiento (Architecture Decision Records - ADR).
•	Dependencias no obvias o side effects conocidos.
•	Proximos pasos planificados.

2.2 Architecture Decision Records (ADR)
Cada decision tecnica significativa debe quedar documentada  

2.3 Protocolo de Handoff entre Agentes
Cuando una tarea pasa de un desarrollador o agente a otro, se debe ejecutar el siguiente protocolo:

PASO 1	Escribir un summary del estado actual en el ticket/PR. Maximo 5 puntos concisos.

PASO 2	Listar los tests que pasan, los que fallan y los que aun faltan.

PASO 3	Documentar cualquier workaround temporal con el prefijo // TODO[HANDOFF]: ...

PASO 4	Actualizar el diagrama de arquitectura si hubo cambios estructurales.

2.4 Comentarios como Documentacion Viva
Los comentarios en el codigo deben explicar el 'por que', no el 'que'. El codigo explica el 'que'; el comentario explica la intencion:

// BAD: Incrementa el contador en 1
counter++;

// GOOD: Compensamos el offset de base-0 del protocolo externo v2
counter++;

2.5 Glosario de Dominio
Cada proyecto debe mantener un glosario viviente de los terminos del dominio de negocio. Este glosario debe ser la unica fuente de verdad para nombrar variables, funciones, tablas y endpoints. Reglas:
•	Ubicado en /docs/glossary.md en la raiz del repositorio.
•	Actualizado como parte del Definition of Done de cada feature.
•	Revisado en cada sprint retrospective.
•	Accesible a todos los miembros del equipo, incluyendo no-tecnicos.
 
III. UI/UX: SISTEMA DE DISENO ATOMICO — Atomic Vibe

El diseno atomico garantiza que la interfaz de usuario sea coherente, escalable y mantenible. Cada elemento visual debe tener una sola responsabilidad y un solo origen de verdad.

3.1 La Jerarquia Atomica
El sistema de diseno se organiza en cinco niveles de abstraccion creciente:

REGLA	DESCRIPCION
ATOMOS	Elementos basicos: botones, inputs, iconos, tipografias, colores. No tienen dependencias internas.
MOLECULAS	Combinaciones de atomos con una funcion especifica: campo de busqueda, tarjeta de producto, menu item.
ORGANISMOS	Secciones completas de UI: header, formulario de login, sidebar de navegacion.
PLANTILLAS	Layout sin contenido real: estructura de pagina, grillas, zonas de contenido.
PAGINAS	Instancias de plantillas con contenido real. Son las unicas que se conectan con el estado global.

3.2 Tokens de Diseno
Los tokens de diseno son las variables que definen la identidad visual del sistema. Deben ser la unica fuente de verdad para colores, tipografias, espaciados y sombras:

// design-tokens.json
{
  "color": {
    "primary": "#1B3A6B",
    "accent": "#2E86AB",
    "error": "#E63946",
    "success": "#2D6A4F"
  },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "32px" },
  "font-size": { "body": "16px", "h1": "2rem", "h2": "1.5rem" }
}

3.3 Reglas de Accesibilidad (a11y)
Todo componente UI debe cumplir como minimo el nivel AA del estandar WCAG 2.1:
•	Contraste minimo de 4.5:1 para texto normal y 3:1 para texto grande.
•	Todo elemento interactivo debe ser alcanzable via teclado (Tab/Enter/Escape).
•	Imagenes no decorativas deben tener atributo alt descriptivo.
•	Los formularios deben tener labels asociados a cada input (no solo placeholder).
•	Los estados de error deben comunicarse tanto por color como por texto.

OBLIGATORIO	Ningun componente puede pasar code review sin haber sido verificado con axe-core o Lighthouse Accessibility.

3.4 Principios de Interaccion (Vibe Rules)
•	Feedback inmediato: toda accion del usuario debe tener respuesta visual en menos de 100ms.
•	Estado optimista: mostrar el resultado esperado antes de confirmar con el servidor.
•	Cero layout shifts: los elementos no deben moverse inesperadamente al cargar contenido.
•	Microinteracciones significativas: las animaciones deben comunicar, no decorar.
•	Modo oscuro nativo: soportar prefers-color-scheme desde el primer dia.
 
IV. ESTANDARES DE CALIDAD GENERICOS — Clean Code

El codigo limpio no es una preferencia estetica, es una responsabilidad profesional. Un codigo que funciona pero no puede ser mantenido es un pasivo, no un activo.

4.1 Las 5 Leyes del Codigo Limpio

LEY 1	Una funcion hace una sola cosa, la hace bien, y solo la hace. Si necesita 'y' para describir lo que hace, debe dividirse.

LEY 2	Los nombres son documentacion. Una variable llamada 'd' es una deuda tecnica; 'diasDesdeUltimaConexion' es una inversion.

LEY 3	No repetirse (DRY). Si escribes el mismo bloque de logica dos veces, es el momento de abstraerlo. La tercera vez es negligencia.

LEY 4	Falla temprano, falla ruidosamente. Un error silenciado es una bomba de tiempo. Siempre lanza excepciones con contexto suficiente.

LEY 5	El codigo muerto no existe. Si no se usa, se elimina. El control de versiones guarda la historia; el codigo activo no necesita nostalgia.

4.2 Metricas de Calidad Objetivas
Las siguientes metricas deben ser monitoreadas en el pipeline de CI/CD y no pueden degradarse entre versiones:

REGLA	DESCRIPCION
Cobertura de Tests	Minimo 80% de cobertura en lineas para codigo nuevo. 70% global como piso absoluto.
Complejidad Ciclomatica	Ninguna funcion puede superar complejidad 10. Refactorizar si se alcanza este limite.
Longitud de Funcion	Maximo 40 lineas por funcion. Maximo 300 lineas por archivo/modulo.
Dependencias por Modulo	Un modulo no puede tener mas de 7 dependencias directas (Ley de Miller).
Tiempo de Build	El build completo no debe superar 10 minutos. Los tests unitarios, 2 minutos.
Deuda Tecnica	Medida con SonarQube. Ratio de deuda no puede superar el 5% del tiempo de desarrollo.

4.3 Protocolo de Code Review
El code review es una ceremonia tecnica, no una inspeccion policial. Su objetivo es compartir conocimiento y mejorar el codigo colectivamente.

Responsabilidades del Autor del PR
•	Descripcion clara del cambio, el contexto y las decisiones tomadas.
•	Self-review previo: leer el propio diff antes de solicitar revision.
•	Tests escritos y pasando en CI antes de solicitar review.
•	PR de maximo 400 lineas de cambio. PRs mayores deben dividirse.

Responsabilidades del Reviewer
•	Dar feedback constructivo y especifico, no opiniones vagas.
•	Diferenciar entre bloqueante (must fix) y sugerencia (nice to have).
•	Aprobar cuando el codigo es correcto, no cuando es perfecto.
•	Responder en menos de 24 horas habiles.

4.4 Definition of Done (DoD)
Una tarea solo puede considerarse completada cuando cumple TODOS los siguientes criterios:

1.	El codigo ha pasado todos los tests automatizados (unitarios, integracion).
2.	El code review ha sido aprobado por al menos un par.
3.	La documentacion relevante ha sido actualizada (README, ADR, glosario).
4.	El feature ha sido verificado en ambiente de staging por el desarrollador.
5.	No existen warnings de linter ni vulnerabilidades conocidas en dependencias.
6.	Los tokens de accesibilidad han sido verificados con herramienta automatica.
7.	El glosario de dominio ha sido actualizado si se introdujeron nuevos conceptos.
 
V. META-INSTRUCCION DE AUTO-CORRECCION

5.1 El Ciclo de Auto-Correccion
Ante cualquier desviacion detectada, se debe ejecutar el siguiente ciclo sin excepcion:

DETECTAR	Identificar el problema con precision: que regla se viola, en que archivo/linea, con que impacto potencial.

AISLAR	Determinar el alcance del problema. Es un punto unico o un patron repetido? Cuantos modulos afecta?

CORREGIR	Aplicar la correccion minima necesaria. No aprovechar la correccion para refactoring no relacionado.

PREVENIR	Agregar un test o regla de linter que hubiera detectado el problema automaticamente en el futuro.

DOCUMENTAR	Registrar la correccion en el ADR o en la retrospectiva del sprint si el patron es recurrente.
