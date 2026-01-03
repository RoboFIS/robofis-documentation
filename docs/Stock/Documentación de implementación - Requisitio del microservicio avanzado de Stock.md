# **Declaración sobre el Uso de Asistencia mediante Inteligencia Artificial**

## **1. Marco General**

Durante el desarrollo del presente proyecto (**Microservicio de Stock del sistema RoboFIS**), se ha recurrido a herramientas de Inteligencia Artificial de carácter generativo como **apoyo técnico puntual** dentro del proceso de ingeniería del software.

Dicho uso se ha realizado siempre bajo la **dirección consciente del autor**, empleando estas herramientas como un medio para mejorar la eficiencia, reducir las tareas repetitivas y facilitar el análisis técnico, sin delegar en ningún momento decisiones críticas de diseño, modelado del dominio o lógica de negocio.

---

## **2. Herramientas Empleadas**

Las soluciones de Inteligencia Artificial utilizadas durante el proyecto han tenido un rol estrictamente asistencial, incluyendo:

* **ChatGPT** como herramienta orientada a la sugerencia de estructuras de código, patrones habituales y mejoras sintácticas en el código, así como ayuda en la resolución de errores complejos.

Estas herramientas no han operado de forma autónoma ni han generado resultados incorporados directamente sin intervención humana. A continuación, definiremos su uso con más detalle.

---

## **3. Áreas de Uso Específicas**

La aplicación de asistencia basada en IA se ha limitado a los siguientes ámbitos técnicos:

### **A. Mejora Progresiva del Código Fuente**

La IA se ha empleado como catalizador para acelerar tareas de mejora continua del código, tales como:

* Simplificación de estructuras complejas sin alterar el comportamiento funcional.
* Optimización de código.

### **B. Automatización de Estructuras Repetitivas**

Con el fin de optimizar el tiempo de desarrollo, se ha utilizado la IA para generar borradores iniciales de:

* Casos base de pruebas automatizadas (unitarias, integración y E2E).
* Esqueletos de comandos, manejadores y DTOs dentro de una arquitectura CQRS.
* Configuraciones técnicas repetitivas relacionadas con Docker y pipelines de CI/CD.

En todos los casos, estos artefactos han sido posteriormente revisados, adaptados y validados manualmente.

### **C. Apoyo en la Resolución de Problemas Técnicos**

La IA ha servido como herramienta de consulta durante la investigación y resolución de incidencias, entre ellas:

* Problemas con el envío y subscripción de mensajes de rabbit tanto en la factoría de test como entre microservicios.
* Dificultades relacionadas con el mapeo entre modelos de dominio y persistencia.

### **D. Elaboración de Documentación Técnica**

Asimismo, se ha utilizado la asistencia de IA para mejorar la claridad y organización de la documentación, incluyendo:

* Creación de plantillas para la documentación.
* Ayuda con el lenguaje técnico.

Igualmente, toda la documentación ha sido revisada y pulida para ser más específica por el autor de esta.

---

## **4. Control, Validación y Responsabilidad**

Se deja constancia de que:

1. Todo el código incorporado al proyecto ha sido **analizado, comprendido y validado** por el autor antes de su inclusión.
2. Las decisiones relacionadas con la arquitectura del microservicio (modelado del dominio, gestión de estados del robot, eventos, consistencia y patrones aplicados) han sido diseñadas íntegramente por el autor.
3. La responsabilidad total sobre el funcionamiento, fiabilidad y calidad del software desarrollado recae exclusivamente en el autor del proyecto.
