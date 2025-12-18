# **Declaración de Uso de Herramientas de Inteligencia Artificial**

## **1\. Política de Uso**

En el desarrollo del presente proyecto (**Microservicio de Alquiler y Orquestación del Sistema RoboFIS**), se han utilizado herramientas de Inteligencia Artificial Generativa (LLMs) siguiendo un principio de **asistencia técnica y optimización**, bajo la estricta supervisión y validación del autor.  
El uso de estas herramientas se ha limitado a funciones de soporte, depuración y automatización de tareas mecánicas, manteniendo la autoría humana en las decisiones de arquitectura, lógica de negocio y diseño del sistema.

## **2\. Herramientas Utilizadas**

* **Asistentes de Código:** Para sugerencias de sintaxis y autocompletado inteligente.  
* **Motores de Análisis:** Para la interpretación de trazas de error complejas en entornos de integración continua (CI).

## **3\. Ámbito de Aplicación**

La asistencia de la IA se ha focalizado en las siguientes áreas técnicas:

### **A. Refactorización y Estandarización de Código**

Se ha utilizado la IA para acelerar el proceso de "limpieza" y estandarización del código fuente, específicamente:

* Traducción y unificación de la nomenclatura de variables y métodos al inglés (*naming conventions*).  
* Adaptación de clases para cumplir con reglas estrictas de *Linter* y *Prettier*.  
* Eliminación de código muerto y optimización de importaciones.

### **B. Generación de "Boilerplate" y Scaffolding**

Para reducir el tiempo dedicado a escribir código repetitivo que no aporta valor lógico directo, se ha empleado la IA en:

* Generación de estructuras base para **Tests Unitarios** (creación de Mocks para Jest y configuración de TestModules de NestJS).  
* Creación de archivos de configuración YAML repetitivos para **Docker Compose** y **GitHub Actions**, basándose en los requisitos de infraestructura definidos por el alumno.  
* Generación del esqueleto del archivo openapi.yaml a partir de los DTOs ya programados.

### **C. Depuración y Resolución de Incidencias (Debugging)**

La IA ha actuado como herramienta de consulta para acelerar la resolución de errores, tales como:

* Análisis de conflictos de versiones en npm (Dependency Hell).  
* Interpretación de errores de red en la comunicación entre contenedores Docker.  
* Identificación de errores de tipado estático en TypeScript.

### **D. Redacción Técnica y Documentación**

Se ha utilizado para mejorar la claridad y el tono profesional de la documentación técnica:

* Redacción de descripciones para *Pull Requests* siguiendo la convención de *Conventional Commits*.  
* Sintetización de los pasos de despliegue en los archivos README.md.

## **4\. Verificación y Autoría Humana**

Se declara explícitamente que:

1. **Ningún código ha sido introducido en el proyecto sin ser previamente revisado, entendido y validado.**  
2. La lógica de negocio compleja (Patrón Saga, CQRS, Máquina de Estados de la Reserva, Arquitectura Hexagonal) ha sido diseñada por el autor, utilizando la IA solo para la implementación sintáctica de dichos patrones.  
3. La responsabilidad final sobre la funcionalidad, seguridad y rendimiento del software recae exclusivamente sobre el alumno.

Firma:  
\[Jesús Solís Ortega / Microservicio de Alquiler\]  
Fecha: 18 Diciembre 2025