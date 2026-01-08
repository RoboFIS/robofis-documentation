# Declaración de Uso de Herramientas de Inteligencia Artificial

## **1. Política de Uso**

En el desarrollo del presente proyecto (**Microservicio de Alquiler y Orquestación del Sistema RoboFIS**), se han utilizado herramientas de Inteligencia Artificial Generativa (LLMs) siguiendo un principio de **asistencia técnica, apoyo cognitivo y optimización del tiempo**, siempre bajo la **supervisión, validación y criterio del autor**.

El uso de estas herramientas se ha limitado a tareas de soporte, consulta técnica, depuración y redacción, manteniendo en todo momento la **autoría humana** sobre las decisiones de arquitectura, diseño del sistema, lógica de negocio y elección tecnológica.  
La IA no ha sido empleada como sustituto del razonamiento técnico, sino como **herramienta de apoyo** comparable a documentación avanzada o foros especializados.

---

## **2. Herramientas de Inteligencia Artificial Utilizadas**

Durante el desarrollo del proyecto se han utilizado las siguientes herramientas:

- **ChatGPT (OpenAI)**  
  Asistencia general en programación, arquitectura, depuración y documentación técnica.

- **Gemini 3 (Google)**  
  Apoyo en la comprensión de conceptos complejos, validación cruzada de enfoques técnicos y análisis de despliegues.

- **Claude (Anthropic)**  
  Utilizado principalmente para revisión de textos técnicos, mejora de claridad en documentación y análisis de código.

Estas herramientas se han utilizado de forma complementaria, contrastando respuestas y aplicando siempre criterio humano antes de su adopción.

---

## **3. Ámbito de Aplicación**

La asistencia de la IA se ha focalizado en las siguientes áreas técnicas:

### **A. Refactorización y Estandarización de Código**

Se ha utilizado la IA para acelerar procesos mecánicos de mejora del código fuente, incluyendo:

- Traducción y unificación de la nomenclatura de variables, métodos y clases al inglés (_naming conventions_).
- Adaptación del código a reglas estrictas de **Linter**, **Prettier** y estándares de calidad.
- Eliminación de código muerto, imports innecesarios y simplificación de estructuras repetitivas.
- Sugerencias de mejora en legibilidad y mantenibilidad, siempre revisadas manualmente.

---

### **B. Generación de Código Base y Estructuras Iniciales**

Con el objetivo de reducir el tiempo dedicado a código repetitivo sin valor lógico directo, la IA se ha empleado en:

- Generación de estructuras base para **tests unitarios**, incluyendo:
  - Creación de _mocks_ (Jest).
  - Configuración de módulos de test en **NestJS**.
- Creación de archivos de configuración repetitivos:
  - `docker-compose.yml`
  - Workflows de **GitHub Actions**
- Generación inicial del esqueleto del archivo `openapi.yaml` a partir de DTOs previamente diseñados por el autor.

En todos los casos, el contenido generado ha sido posteriormente adaptado y validado manualmente.

---

### **C. Depuración y Resolución de Incidencias (Debugging)**

La IA ha sido utilizada como herramienta de consulta para acelerar la resolución de problemas técnicos, entre ellos:

- Análisis de conflictos de dependencias en npm (_Dependency Hell_).
- Interpretación de errores de red y comunicación entre contenedores Docker.
- Diagnóstico de errores de tipado estático en TypeScript.
- Comprensión de mensajes de error complejos en pipelines de integración continua (CI).

La IA ha servido como apoyo explicativo, no como sustituto del proceso de depuración.

---

### **D. Ayuda en Despliegues e Infraestructura**

Se ha empleado la IA como apoyo para:

- Comprensión de flujos de despliegue con **Docker** y **Docker Compose**.
- Revisión de configuraciones de entorno (`.env`) y buenas prácticas de despliegue.
- Análisis de errores en procesos de build y arranque de servicios.
- Validación conceptual de arquitecturas de despliegue previamente diseñadas por el autor.

Las decisiones finales de infraestructura han sido tomadas exclusivamente por el alumno.

---

### **E. Redacción Técnica y Documentación**

La IA se ha utilizado como apoyo en la mejora de la documentación técnica del proyecto:

- Redacción y mejora de descripciones de _Pull Requests_ siguiendo la convención de **Conventional Commits**.
- Revisión de estilo, claridad y coherencia en archivos `README.md`.
- Síntesis y estructuración de pasos de instalación y despliegue.
- Apoyo en la redacción de documentación técnica y explicativa incluida en la memoria.

En ningún caso la IA ha generado contenido conceptual sin revisión y adaptación humana.

---

## **4. Verificación, Control y Autoría Humana**

Se declara explícitamente que:

1. **Ningún código, configuración o texto ha sido incorporado al proyecto sin ser previamente revisado, comprendido y validado por el autor.**
2. La lógica de negocio compleja —incluyendo **Patrón Saga, CQRS, Máquina de Estados de la Reserva y Arquitectura Hexagonal**— ha sido diseñada íntegramente por el autor, utilizando la IA únicamente como apoyo sintáctico o explicativo.
3. La responsabilidad final sobre la funcionalidad, seguridad, rendimiento y calidad del software recae exclusivamente sobre el alumno.
4. El uso de Inteligencia Artificial no ha sustituido el proceso de aprendizaje, análisis ni toma de decisiones técnicas.
