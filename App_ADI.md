


DOCUMENTO DE ESPECIFICACIÓN
DE REQUERIMIENTOS DE SOFTWARE
Sistema de Agenda Docente Inteligente

Proyecto	Agenda Docente Inteligente
Versión	3.0
Fecha	06 de Marzo de 2026
Estado	Borrador para revisión
Clasificación	Confidencial — Uso interno
Integración	Google Workspace (Sheets / Drive / Calendar)
Tipo de App	Aplicación Web Responsiva (PWA) + SaaS
Basado en	SRS v1.0 (Web) + v2.0 (Pro)



 
Historial de Revisiones
Versión	Fecha	Autor	Descripción del Cambio
1.0	2025	Equipo de Desarrollo	Versión inicial — Agenda Docente Web (base)
2.0	06/03/2026	Equipo de Desarrollo	Versión Pro ampliada: módulos nuevos, SaaS, roadmap
3.0	06/03/2026	Equipo de Desarrollo	Versión consolidada: unificación de v1 + v2, requerimientos completos, arquitectura final
 
1. Introducción
1.1 Propósito del Documento
Este Documento de Especificación de Requerimientos de Software (SRS) versión 3.0 consolida y amplía las versiones anteriores (v1.0 Web y v2.0 Pro) del sistema Agenda Docente Inteligente. Describe de manera detallada los requerimientos funcionales, no funcionales, restricciones y atributos de calidad del sistema. Su objetivo es establecer una base clara y acordada entre los stakeholders y el equipo de desarrollo, sirviendo como guía durante todo el ciclo de vida del proyecto, incluyendo la evolución hacia un modelo SaaS educativo.

1.2 Alcance del Sistema
La Agenda Docente Inteligente es una aplicación web moderna, responsiva y progresiva (PWA) diseñada para facilitar la gestión integral del trabajo docente cotidiano. El sistema permitirá:
•	Gestionar múltiples cursos y comisiones por docente.
•	Administrar el padrón completo de alumnos (alta, modificación, baja e importación masiva).
•	Registrar y calcular automáticamente la asistencia e inasistencia de cada alumno.
•	Administrar materias, notas parciales y nota final de manera automatizada.
•	Gestionar un Libro de Temas digital con el registro de actividades por clase.
•	Planificar clases de forma anual y semanal.
•	Registrar el seguimiento individual de cada alumno.
•	Mantener una agenda digital con feriados, reuniones de plenaria y reuniones de padres.
•	Sincronizar toda la información con Google Sheets, Google Drive y Google Calendar en tiempo real.
•	Generar reportes automáticos diarios, semanales y boletines exportables.
•	Ofrecer un Dashboard inteligente con alertas y métricas del día.
•	Operar en modo offline con sincronización posterior al recuperar conexión.

1.3 Definiciones, Acrónimos y Abreviaturas
Término	Definición
SRS	Software Requirements Specification — Especificación de Requerimientos de Software
RF	Requerimiento Funcional
RNF	Requerimiento No Funcional
UI	User Interface — Interfaz de Usuario
API	Application Programming Interface — Interfaz de Programación de Aplicaciones
Google Sheets	Servicio de hojas de cálculo en la nube de Google
Google Drive	Servicio de almacenamiento en la nube de Google
Google Calendar	Servicio de calendario en la nube de Google (nuevo en v3)
OAuth 2.0	Protocolo de autorización utilizado para acceder a los servicios de Google
PWA	Progressive Web App — Aplicación Web Progresiva
CRUD	Create, Read, Update, Delete — operaciones básicas sobre datos
SaaS	Software as a Service — Modelo de distribución de software por suscripción
ABM	Alta, Baja y Modificación de registros

1.4 Referencias
•	IEEE Std 830-1998: Recommended Practice for Software Requirements Specifications.
•	Google Sheets API v4 Documentation: https://developers.google.com/sheets/api
•	Google Drive API v3 Documentation: https://developers.google.com/drive
•	Google Calendar API v3 Documentation: https://developers.google.com/calendar
•	Material Design 3 Guidelines: https://m3.material.io
 
2. Descripción General del Sistema
2.1 Visión del Producto
La Agenda Docente Inteligente es una aplicación web diseñada para simplificar y potenciar la gestión diaria del trabajo docente. Centraliza alumnos, asistencia, notas, planificación de clases, libro de temas y reportes en una interfaz simple e intuitiva, sin perder la flexibilidad de Google Workspace como sistema de almacenamiento y colaboración. El docente interactúa únicamente con la aplicación web, mientras que toda la persistencia y el historial quedan almacenados en la cuenta de Google del usuario.

2.2 Perspectiva del Producto
La Agenda Docente Inteligente es un sistema independiente que se integra con el ecosistema de Google Workspace. No reemplaza a Google Sheets ni Google Drive; provee una capa de interfaz amigable sobre ellos, volcando y recuperando datos de manera transparente. A partir de la v3 se incorpora además la integración con Google Calendar para sincronizar eventos del ciclo lectivo.

2.3 Objetivos del Sistema
•	Reducir el tiempo administrativo del docente.
•	Centralizar toda la información académica en un solo lugar.
•	Generar reportes automáticos y boletines sin esfuerzo manual.
•	Permitir acceso desde cualquier dispositivo (desktop, tablet, móvil).
•	Sincronizar automáticamente con Google Drive y Google Calendar.
•	Proveer alertas inteligentes sobre asistencia, notas y eventos próximos.

2.4 Módulos Principales
Módulo	Descripción Resumida
Gestión de Cursos	ABM de cursos y comisiones con asignación de materias y docentes.
Gestión de Alumnos	ABM completo de alumnos con datos personales, foto, contacto e importación CSV.
Asistencia	Registro diario rápido, cálculo automático de presencias, ausencias y porcentaje.
Materias y Notas	Asignación de materias, carga de notas parciales y cálculo automático de nota final.
Libro de Temas	Registro digital de temas y actividades por clase, por fecha y curso.
Planificación	Planificación anual y semanal de clases con registro de tareas enviadas.
Seguimiento Alumno	Historial académico individual, alertas personalizadas y notas privadas.
Agenda Docente	Calendario con feriados, reuniones de plenaria, reuniones de padres y eventos.
Dashboard	Panel diario con métricas, alertas automáticas y accesos rápidos.
Reportes	Generación automática de informes diarios, semanales y boletines exportables.
Integración Google	Sincronización con Google Sheets, Drive y Calendar. Backup automático.

2.5 Características de los Usuarios
Rol	Descripción	Nivel Técnico
Docente	Usuario principal. Gestiona cursos, alumnos, notas, asistencia, planificación y reportes.	Básico-Intermedio
Administrador	Configura materias, feriados, gestiona la integración con Google y administra el modelo SaaS.	Intermedio

2.6 Restricciones Generales
•	El sistema requiere conexión a Internet para sincronizar con Google Workspace (modo offline disponible para lectura).
•	El acceso a Google Sheets, Drive y Calendar se realiza mediante OAuth 2.0; el usuario debe autorizar la aplicación desde su cuenta de Google.
•	La aplicación debe ser compatible con Chrome, Firefox, Safari y Edge en sus versiones actuales y la anterior.
•	El sistema debe ser responsivo y funcionar correctamente en dispositivos móviles (smartphones y tablets) y escritorio.
•	El navegador del usuario debe tener habilitado JavaScript.
 
3. Requerimientos Funcionales
3.1 Módulo de Gestión de Cursos (NUEVO en v3)
Este módulo permite al docente gestionar múltiples cursos y comisiones.

ID	Requerimiento	Prioridad	Estado
RF-01	El sistema permitirá crear, editar y eliminar cursos indicando: año, división, turno, ciclo lectivo y materias asignadas.	Alta	Propuesto
RF-02	El sistema permitirá asignar uno o más docentes a un curso.	Alta	Propuesto
RF-03	El sistema permitirá compartir un curso con otro docente de manera colaborativa.	Media	Propuesto
RF-04	El sistema listará todos los cursos activos del docente en el Dashboard.	Alta	Propuesto

3.2 Módulo de Gestión de Alumnos
Este módulo permite al docente administrar el padrón completo de sus alumnos.

ID	Requerimiento	Prioridad	Estado
RF-05	El sistema permitirá crear un nuevo alumno ingresando: nombre, apellido, DNI/ID, fecha de nacimiento, dirección, teléfono de contacto y correo electrónico del tutor.	Alta	Propuesto
RF-06	El sistema permitirá editar cualquier dato de un alumno existente.	Alta	Propuesto
RF-07	El sistema permitirá dar de baja (inhabilitar) un alumno, conservando su historial.	Alta	Propuesto
RF-08	El sistema permitirá buscar alumnos por nombre, apellido o DNI/ID.	Media	Propuesto
RF-09	El sistema permitirá cargar o actualizar la foto del alumno.	Baja	Propuesto
RF-10	Al crear o modificar un alumno, los datos se sincronizarán automáticamente con la hoja 'Alumnos' en Google Sheets.	Alta	Propuesto
RF-11	El sistema mostrará una lista paginada y ordenable de todos los alumnos activos.	Alta	Propuesto
RF-12	El sistema permitirá la importación masiva de alumnos desde un archivo CSV.	Alta	Propuesto
RF-13	El sistema mostrará el historial académico completo del alumno (asistencia, notas, observaciones).	Alta	Propuesto

3.3 Módulo de Asistencia
Permite el registro diario de asistencia y calcula automáticamente los totales por alumno.

ID	Requerimiento	Prioridad	Estado
RF-14	El sistema permitirá registrar la asistencia diaria de cada alumno seleccionando entre: Presente, Ausente o Tarde.	Alta	Propuesto
RF-15	El sistema calculará automáticamente el total de días presentes, ausentes y tardanzas de cada alumno.	Alta	Propuesto
RF-16	El sistema calculará y mostrará el porcentaje de asistencia de cada alumno con respecto al total de días hábiles.	Alta	Propuesto
RF-17	El sistema alertará visualmente cuando un alumno supere el umbral de inasistencias configurado (p.ej. 25%).	Media	Propuesto
RF-18	El docente podrá marcar la asistencia de todo el curso con un solo clic y luego modificar individualmente los ausentes.	Alta	Propuesto
RF-19	El historial completo de asistencia se volcará en la hoja 'Asistencia' de Google Sheets.	Alta	Propuesto
RF-20	El sistema permitirá visualizar el historial de asistencia de un alumno individual en un rango de fechas.	Media	Propuesto
RF-21	El sistema enviará alertas automáticas cuando un alumno acumule ausencias consecutivas.	Media	Propuesto

3.4 Módulo de Materias y Notas
Gestiona la asignación de materias y el registro de evaluaciones parciales y finales.

ID	Requerimiento	Prioridad	Estado
RF-22	El sistema permitirá crear, editar y eliminar materias asignadas al docente.	Alta	Propuesto
RF-23	El sistema permitirá cargar hasta N notas parciales por alumno por materia (N configurable).	Alta	Propuesto
RF-24	El sistema calculará automáticamente la nota final como promedio ponderado de las notas parciales (pesos configurables).	Alta	Propuesto
RF-25	El docente podrá definir la ponderación de cada nota parcial en el cálculo de la nota final.	Media	Propuesto
RF-26	El sistema indicará visualmente (color) si la nota final es aprobatoria o reprobatoria según el umbral configurado.	Media	Propuesto
RF-27	Todas las notas se sincronizarán en la hoja 'Notas' de Google Sheets.	Alta	Propuesto
RF-28	El sistema permitirá visualizar un boletín consolidado por alumno con todas sus materias y notas.	Media	Propuesto
RF-29	El sistema permitirá exportar boletines automáticamente en formato PDF.	Alta	Propuesto
RF-30	El sistema mostrará gráficos de evolución académica por alumno y por materia.	Media	Propuesto
RF-31	El docente podrá utilizar plantillas de evaluación predefinidas.	Baja	Propuesto

3.5 Módulo de Libro de Temas (NUEVO en v3)
Registro digital de los temas y actividades desarrollados en cada clase.

ID	Requerimiento	Prioridad	Estado
RF-32	El sistema permitirá registrar el tema desarrollado en cada clase indicando: fecha, curso, materia, tema y tipo de actividad.	Alta	Propuesto
RF-33	El sistema mostrará el historial cronológico del Libro de Temas por curso.	Alta	Propuesto
RF-34	El libro de temas se sincronizará en la hoja 'LibroTemas' de Google Sheets.	Alta	Propuesto
RF-35	El docente podrá registrar las tareas enviadas a los alumnos por clase.	Media	Propuesto

3.6 Módulo de Planificación (NUEVO en v3)
Permite al docente planificar el año lectivo y la semana de clases.

ID	Requerimiento	Prioridad	Estado
RF-36	El sistema ofrecerá una vista de planificación anual por materia y curso.	Alta	Propuesto
RF-37	El sistema ofrecerá una vista de planificación semanal editable.	Alta	Propuesto
RF-38	La planificación se guardará y sincronizará automáticamente en Google Sheets.	Alta	Propuesto

3.7 Módulo de Agenda Docente
Proporciona un calendario interactivo para gestionar eventos relevantes del ciclo lectivo.

ID	Requerimiento	Prioridad	Estado
RF-39	El sistema mostrará un calendario mensual/anual con los feriados nacionales precargados.	Alta	Propuesto
RF-40	El docente podrá agregar, editar y eliminar feriados locales o provinciales adicionales.	Media	Propuesto
RF-41	El docente podrá crear eventos de tipo 'Reunión de Plenaria' con fecha, hora, lugar y notas.	Alta	Propuesto
RF-42	El docente podrá crear eventos de tipo 'Reunión de Padres' con fecha, hora, lugar y lista de alumnos convocados.	Alta	Propuesto
RF-43	El sistema enviará recordatorios visuales (notificaciones en la app) con 24 hs de anticipación a cada evento.	Media	Propuesto
RF-44	Los eventos de la agenda se guardarán en la hoja 'Agenda' de Google Sheets y se sincronizarán con Google Calendar.	Alta	Propuesto
RF-45	El calendario destacará visualmente los días con feriados, reuniones y días de exámenes.	Media	Propuesto

3.8 Módulo de Dashboard Inteligente (NUEVO en v3)
Vista resumen diaria con métricas clave, alertas y accesos rápidos.

ID	Requerimiento	Prioridad	Estado
RF-46	El Dashboard mostrará: alumnos con asistencia pendiente, próximos eventos, alertas de inasistencias y notas por cargar.	Alta	Propuesto
RF-47	El Dashboard mostrará un panel diario del docente con el resumen del día.	Alta	Propuesto
RF-48	El sistema generará alertas automáticas por ausencias que superen el umbral configurado.	Alta	Propuesto
RF-49	El Dashboard mostrará accesos rápidos a las acciones más frecuentes.	Media	Propuesto

3.9 Módulo de Integración con Google Workspace
ID	Requerimiento	Prioridad	Estado
RF-50	El sistema permitirá al docente autenticarse con su cuenta de Google mediante OAuth 2.0.	Alta	Propuesto
RF-51	Al iniciar sesión por primera vez, el sistema creará automáticamente un Spreadsheet en Google Drive con todas las hojas necesarias.	Alta	Propuesto
RF-52	El sistema sincronizará los datos en tiempo real con Google Sheets ante cada acción del usuario.	Alta	Propuesto
RF-53	El sistema sincronizará los eventos de la agenda con Google Calendar.	Alta	Propuesto
RF-54	El docente podrá visualizar el enlace directo al Google Spreadsheet desde la configuración.	Media	Propuesto
RF-55	El sistema generará un backup automático en Google Drive de todos los datos.	Alta	Propuesto
RF-56	El sistema respetará los permisos del archivo en Google Drive; el docente puede compartirlo con otros.	Baja	Propuesto
RF-57	El docente podrá exportar la totalidad de los datos de un curso.	Media	Propuesto

3.10 Módulo de Reportes
ID	Requerimiento	Prioridad	Estado
RF-58	El sistema generará un reporte diario con: alumnos presentes/ausentes, actividades registradas y notas cargadas en el día.	Alta	Propuesto
RF-59	El sistema generará un reporte semanal consolidando asistencia, notas y eventos de la semana.	Alta	Propuesto
RF-60	El docente podrá exportar los reportes en formato PDF y/o Google Sheets.	Alta	Propuesto
RF-61	Los reportes generados se guardarán automáticamente en una carpeta 'Reportes' dentro de Google Drive.	Media	Propuesto
RF-62	El sistema permitirá filtrar reportes por materia, grupo o rango de fechas.	Media	Propuesto
RF-63	El sistema generará boletines individuales por alumno exportables en PDF.	Alta	Propuesto
 
4. Requerimientos No Funcionales
4.1 Rendimiento
ID	Requerimiento	Prioridad	Estado
RNF-01	El tiempo de carga inicial de la aplicación no debe superar los 3 segundos con conexión de banda ancha estándar.	Alta	Propuesto
RNF-02	Las operaciones de sincronización con Google Sheets deben completarse en menos de 5 segundos.	Alta	Propuesto
RNF-03	La aplicación debe soportar listas de hasta 500 alumnos sin degradación perceptible del rendimiento.	Media	Propuesto

4.2 Usabilidad
ID	Requerimiento	Prioridad	Estado
RNF-04	La interfaz debe seguir principios de Material Design 3 o equivalente, con paleta de colores coherente.	Alta	Propuesto
RNF-05	El sistema debe ser completamente responsivo: funcionar en pantallas de 320px a 2560px de ancho.	Alta	Propuesto
RNF-06	El registro de asistencia de un grupo completo no debe requerir más de 3 clics/taps.	Alta	Propuesto
RNF-07	Todos los formularios deben incluir validación en tiempo real con mensajes de error claros en español.	Alta	Propuesto
RNF-08	La aplicación debe poder usarse sin manual de usuario para las tareas más frecuentes.	Media	Propuesto

4.3 Seguridad y Privacidad
ID	Requerimiento	Prioridad	Estado
RNF-09	Toda la comunicación entre el cliente y los servicios de Google debe realizarse sobre HTTPS/TLS.	Alta	Propuesto
RNF-10	El sistema no almacenará credenciales de Google; utilizará tokens OAuth 2.0 con alcance mínimo necesario.	Alta	Propuesto
RNF-11	Los datos personales de los alumnos deben manejarse conforme a la legislación de protección de datos vigente.	Alta	Propuesto
RNF-12	El sistema debe implementar cierre de sesión seguro que revoque el token de acceso.	Alta	Propuesto

4.4 Disponibilidad y Mantenibilidad
ID	Requerimiento	Prioridad	Estado
RNF-13	La aplicación debe mostrar un modo offline (lectura de datos en caché y cola de escritura) cuando no haya conexión.	Media	Propuesto
RNF-14	El código fuente debe estar documentado y seguir estándares de codificación acordados.	Media	Propuesto
RNF-15	El sistema debe incluir manejo de errores de API de Google con mensajes informativos al usuario.	Alta	Propuesto
 
5. Casos de Uso Principales
CU-ID	Caso de Uso	Actor	Descripción
CU-01	Registrar Alumno	Docente	El docente completa el formulario de nuevo alumno y el sistema lo guarda y sincroniza con Google Sheets.
CU-02	Importar Alumnos CSV	Docente	El docente carga un archivo CSV con el padrón y el sistema importa masivamente los registros.
CU-03	Tomar Asistencia Diaria	Docente	El docente selecciona la fecha y el curso, marca la asistencia y confirma; el sistema actualiza los totales automáticamente.
CU-04	Cargar Notas Parciales	Docente	El docente selecciona la materia y el alumno, ingresa la nota parcial y el sistema recalcula la nota final.
CU-05	Registrar Tema en Libro	Docente	El docente ingresa el tema, actividad y fecha de la clase en el libro de temas digital.
CU-06	Planificar Semana	Docente	El docente organiza las clases de la semana en la vista de planificación semanal.
CU-07	Crear Evento en Agenda	Docente	El docente elige el tipo de evento, ingresa los detalles y lo guarda en el calendario, Google Sheets y Calendar.
CU-08	Generar Reporte Semanal	Docente	El docente selecciona el rango de fechas y el sistema genera el reporte, lo guarda en Drive y lo ofrece para descargar.
CU-09	Exportar Boletín	Docente	El docente selecciona el alumno y el período; el sistema genera el boletín en PDF y lo guarda en Drive.
CU-10	Configurar Integración Google	Docente/Admin	El usuario inicia sesión con Google, autoriza los permisos y el sistema crea o vincula el Spreadsheet de trabajo.
CU-11	Visualizar Boletín de Alumno	Docente	El docente busca un alumno y accede a su ficha completa con asistencia, notas y estado de aprobación.
CU-12	Consultar Dashboard	Docente	El docente abre la app y visualiza el resumen del día con alertas, métricas y accesos rápidos.
 
6. Arquitectura Técnica
6.1 Stack Tecnológico Recomendado
Capa	Tecnología Sugerida	Justificación
Frontend	React + Vite / Next.js	Ecosistema maduro, componentes reutilizables, SSR opcional.
UI Framework	Material UI v5 / Tailwind CSS	Diseño responsivo, componentes accesibles, alta productividad.
Autenticación	Google OAuth 2.0	Requerido por la integración con Google Workspace.
Integración Sheets	Google Sheets API v4	API oficial con soporte CRUD completo.
Integración Drive	Google Drive API v3	Creación y organización de archivos en Drive.
Integración Calendar	Google Calendar API v3	Sincronización de eventos del ciclo lectivo. (Nuevo v3)
Estado Global	Zustand / Redux Toolkit	Gestión del estado del docente y datos sincronizados.
Generación PDF	react-pdf / jsPDF	Exportación de reportes y boletines en PDF.
Hosting	Vercel / Firebase Hosting	Despliegue rápido con soporte para PWA.
PWA	Service Worker + Cache API	Modo offline y experiencia nativa en móvil.

6.2 Estructura de Google Sheets
El sistema generará automáticamente un Google Spreadsheet con la siguiente estructura de hojas:

Nombre de Hoja	Columnas Principales	Descripción
Docentes	ID_Docente, Nombre, Email	Registro de docentes del sistema.
Cursos	ID_Curso, Año, División, Materia, Docente	Cursos y comisiones activos.
Alumnos	ID, Nombre, Apellido, DNI, Fecha Nac., Teléfono, Email Tutor, Curso	Padrón completo de alumnos.
Asistencia	Fecha, ID_Alumno, Nombre, Estado (P/A/T), Observación	Registro diario de asistencia.
Resumen_Asistencia	ID_Alumno, Total_Presentes, Total_Ausentes, Tardanzas, Porcentaje	Totales calculados por alumno.
Notas	ID_Alumno, Materia, Parcial_1, Parcial_2, Parcial_N, Nota_Final	Registro de evaluaciones.
Materias	ID_Materia, Nombre, Año, Sección, Ponderaciones	Materias configuradas.
LibroTemas	Fecha, Curso, Materia, Tema, Actividad, Tareas	Registro del libro de temas digital.
Agenda	ID, Tipo, Título, Fecha, Hora, Lugar, Notas, Alumnos_Convocados	Eventos del ciclo lectivo.
Reportes	Fecha_Generación, Tipo, Período, URL_PDF, Resumen	Log de reportes generados.
 
7. Interfaces del Sistema
7.1 Pantallas Principales
Pantalla	Descripción
Dashboard / Panel Principal	Vista resumen con métricas del día: asistencia, próximos eventos, alertas de notas pendientes y accesos rápidos.
Gestión de Cursos	ABM de cursos y comisiones con asignación de materias y docentes.
Lista de Alumnos	Tabla paginada con búsqueda, filtros y acceso rápido al perfil.
Perfil de Alumno	Ficha completa con datos personales, historial de asistencia, notas y seguimiento.
Registro de Asistencia	Vista de lista rápida para marcar presentes/ausentes con indicador de progreso.
Gestión de Notas	Grilla por materia y alumno para carga rápida de notas parciales y visualización de nota final.
Libro de Temas	Registro cronológico de temas y actividades por clase.
Planificador	Vista semanal y anual para organizar la planificación de clases.
Calendario / Agenda	Vista mensual/anual interactiva con colores por tipo de evento.
Generador de Reportes	Formulario para seleccionar período y tipo, con previsualización antes de exportar.
Configuración	Gestión de materias, ponderaciones, vinculación Google, umbrales y preferencias.

7.2 Paleta de Colores y Diseño
Elemento	Color / Descripción
Color Primario	#1A56A0 — Azul institucional, uso en headers, botones principales y acentos.
Color Secundario	#2E7D32 — Verde, uso en estados positivos (presente, aprobado).
Advertencia	#E65100 — Naranja, para alertas de asistencia o notas límite.
Error / Reprobado	#C62828 — Rojo, ausencias excesivas, notas reprobatorias.
Fondo General	#F8FAFD — Gris muy claro para el fondo de la app.
Tarjetas / Cards	#FFFFFF con sombra sutil para módulos y paneles.
Tipografía	Inter o Roboto, jerarquía clara H1-H3, texto cuerpo 14-16px.
 
8. Flujos de Trabajo Principales
8.1 Flujo de Sincronización con Google Sheets
1.	El docente realiza una acción en la app (crear alumno, registrar asistencia, cargar nota, etc.).
2.	La aplicación valida los datos localmente y actualiza el estado interno.
3.	La app genera la llamada correspondiente a la Google Sheets API v4.
4.	Google Sheets actualiza la hoja correspondiente en el Spreadsheet del docente.
5.	La app confirma visualmente el éxito de la operación con un indicador de sincronización.
6.	En caso de error de red, la app almacena la operación en cola y la reintenta al recuperar la conexión.

8.2 Flujo de Cálculo Automático de Asistencia
7.	El docente marca la asistencia diaria (Presente / Ausente / Tarde) para cada alumno.
8.	Al confirmar, el sistema incrementa los contadores correspondientes en el estado local.
9.	Se recalcula el porcentaje: % Asistencia = (Total Presentes / Total Días Hábiles) × 100.
10.	Si el porcentaje cae por debajo del umbral configurado, se activa la alerta visual.
11.	Los datos actualizados se sincronizan con las hojas 'Asistencia' y 'Resumen_Asistencia' en Google Sheets.

8.3 Flujo de Cálculo de Nota Final
12.	El docente carga las notas parciales de un alumno para una materia.
13.	El sistema aplica la fórmula de promedio ponderado: Nota Final = Σ (Nota_i × Peso_i) / Σ Peso_i.
14.	La nota final calculada se muestra al instante con indicador de aprobado (verde) o reprobado (rojo).
15.	Los datos se sincronizan automáticamente con la hoja 'Notas' en Google Sheets.
 
9. Reglas de Negocio y Validaciones
ID	Regla	Descripción
RN-01	DNI único	No se pueden registrar dos alumnos con el mismo DNI/ID dentro del mismo curso.
RN-02	Nota en rango	Las notas parciales deben estar en el rango 1-10 (configurable por el docente).
RN-03	Asistencia por día	Solo se puede registrar un estado de asistencia por alumno por día hábil.
RN-04	Días hábiles	Los feriados cargados en la agenda se excluyen automáticamente del conteo de días hábiles.
RN-05	Ponderaciones	La suma de pesos de los parciales debe ser igual a 100% para calcular la nota final.
RN-06	Alumno activo	Solo se registra asistencia y notas para alumnos en estado 'Activo'.
RN-07	Sesión Google	Sin sesión de Google activa, las operaciones de escritura se encolan para sincronizar al reconectar.
RN-08	Umbral inasistencia	El umbral de alerta de inasistencia predeterminado es del 25%, modificable por el docente.
RN-09	Importación CSV	El formato del CSV de importación debe respetar las columnas definidas; errores se reportan fila a fila.
RN-10	Libro de Temas	Solo se permite un registro por fecha, curso y materia en el Libro de Temas.
 
10. Plan de Desarrollo — Roadmap
Fase	Módulos Incluidos	Duración Est.	Entregable
MVP	Autenticación Google, CRUD Alumnos (+ importación CSV), integración básica Sheets.	3-4 semanas	MVP: Gestión de alumnos sincronizada.
v1.0	Asistencia con cálculo automático. Dashboard básico.	2-3 semanas	Registro de asistencia operativo.
v1.1	Materias y Notas con cálculo de nota final. Boletín PDF.	2-3 semanas	Gestión de notas completa.
v2.0	Agenda Docente + sincronización Google Calendar. Libro de Temas.	2 semanas	Calendario interactivo y libro de temas.
v2.1	Planificación anual y semanal. Seguimiento individual de alumnos.	2 semanas	Planificación y seguimiento operativos.
v3.0	Reportes automáticos, gráficos de evolución, backup automático Drive.	2 semanas	Reportes generables y guardados en Drive.
v4.0	Dashboard inteligente, alertas automáticas, analítica educativa. PWA offline.	2 semanas	Versión 1.0 en producción con SaaS activo.
 
11. Modelo SaaS
El sistema se ofrece como SaaS para docentes. Cada usuario inicia sesión con Google, la aplicación crea automáticamente su base de datos en Drive y se cobra una suscripción mensual por el uso de la plataforma.

11.1 Planes Propuestos
Plan	Características	Modalidad
Free	Hasta 1 curso activo. Funcionalidades básicas de asistencia y notas.	Gratuito
Pro	Cursos ilimitados, reportes avanzados, boletines PDF, planificación y libro de temas.	Suscripción mensual
Institucional	Acceso multi-docente para escuelas. Administración centralizada. Analítica institucional.	Suscripción anual
 
12. Criterios de Aceptación
12.1 Criterios Generales
•	Todos los requerimientos funcionales de prioridad Alta deben estar implementados y probados antes del lanzamiento.
•	La sincronización con Google Sheets debe operar correctamente en el 99% de las pruebas de integración.
•	La aplicación debe pasar las pruebas de compatibilidad en Chrome, Firefox, Safari y Edge.
•	El tiempo de respuesta de la UI no debe superar 3 segundos en las operaciones más frecuentes.
•	La aplicación debe obtener una puntuación mínima de 80/100 en Google Lighthouse para rendimiento y accesibilidad.

12.2 Criterios de Calidad de Datos
•	Todos los datos volcados en Google Sheets deben ser íntegros, sin duplicados y con el formato correcto.
•	Las fórmulas de asistencia y nota final deben producir resultados idénticos a los calculados manualmente.
•	Los reportes generados deben incluir todos los registros del período seleccionado sin omisiones.
•	La importación CSV debe procesar correctamente el 100% de los registros válidos e informar los inválidos.
 
13. Supuestos y Dependencias
13.1 Supuestos
•	El docente dispone de una cuenta de Google (Gmail) activa.
•	El docente cuenta con conexión a Internet estable para la sincronización en tiempo real.
•	Los feriados nacionales base serán cargados por el equipo de desarrollo para el año lectivo correspondiente.
•	El navegador del usuario tiene habilitado JavaScript.

13.2 Dependencias Externas
•	Google Sheets API v4: disponibilidad y cuotas de uso.
•	Google Drive API v3: disponibilidad y cuotas de uso.
•	Google Calendar API v3: disponibilidad y cuotas de uso. (Nuevo en v3)
•	Google OAuth 2.0: disponibilidad del servicio de autenticación.
•	Hosting de la aplicación (Vercel / Firebase): disponibilidad del servicio.
 
14. Glosario
Término	Definición
Nota Parcial	Calificación obtenida en una evaluación específica dentro del período lectivo.
Nota Final	Calificación calculada automáticamente como promedio ponderado de las notas parciales.
Día Hábil	Día lectivo que no corresponde a fin de semana ni feriado cargado en la agenda.
Porcentaje de Asistencia	Razón entre días presentes y total de días hábiles, expresada en porcentaje.
Umbral de Inasistencia	Porcentaje máximo de ausencias permitido antes de generar una alerta.
Ponderación	Peso relativo asignado a cada nota parcial en el cálculo de la nota final.
Reunión de Plenaria	Reunión institucional entre docentes y/o directivos.
Reunión de Padres	Reunión entre el docente y los tutores/padres de los alumnos.
Sincronización	Proceso de envío y actualización de datos entre la app y Google Workspace.
Libro de Temas	Registro digital cronológico de los temas y actividades desarrollados por clase.
OAuth 2.0	Protocolo de autorización que permite a la app acceder a Google en nombre del docente.
CRUD	Operaciones básicas sobre datos: Crear, Leer, Actualizar, Eliminar.
PWA	Progressive Web App — aplicación web instalable con capacidades nativas.
SaaS	Software as a Service — modelo de distribución donde el software se accede por suscripción.
ABM	Alta, Baja y Modificación — operaciones sobre el padrón de datos.


Fin del Documento SRS — Agenda Docente Inteligente v3.0
Para consultas o revisiones, contactar al equipo de desarrollo.
