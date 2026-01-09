# Uso de Inteligencia Artificial (IA) — Declaración de transparencia

Este documento describe de forma clara y honesta cómo se han utilizado herramientas de IA generativa durante el desarrollo de este microservicio.

## 1. Enfoque y límites de uso

Se han utilizado herramientas de **IA generativa (LLMs)** como apoyo para mejorar productividad, acelerar el aprendizaje y desbloquear tareas técnicas complejas.

- La IA se ha empleado como **asistente** (consultoría técnica y ayuda de implementación).
- La **autoría y responsabilidad final** del resultado (código, configuración y documentación) recae en el equipo.
- Las decisiones de diseño y los cambios finales se han aplicado tras revisión humana.

## 2. Herramientas utilizadas (tipo)

- **Asistentes de programación / LLMs**: apoyo para redactar, proponer soluciones, generar estructura inicial, localizar causas de errores y sugerir correcciones. Se han utilizado LLMs tanto dentro del IDE como desde el navegador. Antonio ha usado el plan gratuito para estudiantes de la US, mientras que Tim ha usado una prueba gratuita de GitHub Copilot.

Modelos (LLMs) usados:

- GPT-5
- GPT-5.2
- Claude Sonnet 4.5
- Claude Opus 4.5


## 3. Principales usos dentro del proyecto

El apoyo de IA se ha concentrado especialmente en:

- **Documentación técnica**
  - Redacción y normalización de documentos (por ejemplo, descripción del API REST y guías de ejecución).
  - Mejora del tono, claridad y estructura.

- **Código repetitivo y configuración (auto-complete)**
  - Propuestas de estructura de módulos/servicios y pequeñas piezas repetitivas.
  - Apoyo en configuración de entorno local (Docker/Docker Compose) y scripts de ejecución.

- **Resolución de bloqueos técnicos (uso intensivo en momentos puntuales)**
  - Aclaración de dudas y propuestas de refactor relacionadas con patrones de arquitectura (capas, estructura, validación).
  - Apoyo para diagnosticar errores de runtime/validación.
  - Orientación para integrar componentes externos (por ejemplo, colas/eventos y componentes de infraestructura).

## Declaración final

La IA se ha utilizado como **acelerador de aprendizaje y productividad**, especialmente en tareas de documentación, generación de base técnica y resolución de bloqueos. Aun así, el equipo asume la responsabilidad total del software entregado, usando la IA como apoyo y no como sustitución del criterio técnico.
