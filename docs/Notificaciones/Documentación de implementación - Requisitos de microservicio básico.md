# Documentación de implementación — Requisitos de microservicio básico

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de microservicio básico y señala exactamente en qué parte del código se ha realizado cada implementación (en caso de que sea necesario).

---

## 1) Backend REST (GET, POST, PUT, DELETE)

- **Implementación**: Controlador REST con endpoints para CRUD de notificaciones, endpoints administrativos y operaciones auxiliares (marcar como leída, historial por usuario, envío de email).
- **Dónde**:
  - `*/notifications/src/notification/notification.controller.ts`
    - POST `/notifications` → `create`
    - GET `/notifications` → `findAll`
    - GET `/notifications/:id` → `findOne`
    - PATCH `/notifications/:id` → `update`
    - DELETE `/notifications/:id` → `remove`
    - PUT `/notifications/:id/read` → `markAsRead`
    - Rutas admin para empleados: `/notifications/admin/demands`, `/notifications/admin/incidents`
- **Códigos de estado**: Se usan excepciones de Nest (por ejemplo `NotFoundException`) que generan 404. Además, los errores de Mongoose se capturan y traducen a 400 mediante un filtro específico (`MongooseExceptionFilter`). Las respuestas 200/201 siguen la convención de Nest/HTTP.

---

## 2) Mecanismo de autenticación

- **Estado actual**:
  - El frontend dispone de pantallas y utilidades para autenticación (login, registro, JWT decoding), sin embargo el microservicio de Notifications **no** aplica un guard de autenticación JWT actualmente. Esto se debe a que, tras una conversación con el profesor, consideramos adecuado que solo un microservicio/la API Gateway implementara este tipo de autenticación.

---

## 3) Frontend con operaciones completas

- **Implementación**: Interfaz para crear, editar, borrar, consultar, enviar emails y notificaciones manuales.
- **Dónde**:
  - Página principal de notificaciones: `*/frontend/src/pages/Notifications.tsx`
  - Formularios y componentes: `*/frontend/src/components/notifications/` (`CreateNotificationForm.tsx`, `UpdateNotificationForm.tsx`, `ManualNotificationForm.tsx`, `SendUrgentEmailForm.tsx`)
  - Cliente API: `*/frontend/src/services/notifications.ts` (funciones `getNotifications`, `createNotification`, `updateNotification`, `deleteNotification`, `markNotificationAsRead`, etc.)
- **Comportamiento**: La UI realiza llamadas a la API REST y actualiza la vista (optimistic updates y refetch según necesidad).

---

## 4) Despliegue y accesibilidad en la nube

- **Implementación**: Configuración lista para construir y publicar imagen Docker, y manifiesto Kubernetes para despliegue.
- **Dónde**:
  - `*/notifications/Dockerfile`
  - `*/notifications/k8s/deployment.yaml`
  - Workflow CI/CD: `*/.github/workflows/ci-cd-pipeline.yml`
  - Guía y configuración: `*/notifications/CI-CD.md`

---

## 5) API versionada

- **Implementación**: Prefijo global de versión en el servidor. La API está accesible actualmente bajo `/api/v1`.
- **Dónde**: `*/notifications/src/main.ts` → `app.setGlobalPrefix('/api/v1')`
- **Swagger**: La documentación está disponible en `/api/v1/api-docs`.

---

## 6) Documentación de la API (OpenAPI / Swagger)

- **Implementación**: Uso de `@nestjs/swagger` y decoradores `@Api*` en controladores y DTOs para generar OpenAPI.
- **Dónde**:
  - Setup: `*/notifications/src/main.ts` (DocumentBuilder + SwaggerModule)
  - Decoradores en controlador: `*/notifications/src/notification/notification.controller.ts`
  - DTOs: `*/notifications/src/notification/dto/*.ts` (con `@ApiProperty`)
- **Acceso**: `/api/v1/api-docs` en la instancia del servicio.

---

## 7) Persistencia con MongoDB (NoSQL)

- **Implementación**: Mongoose para persistencia; schemas y modelos definidos con índices y enums.
- **Dónde**:
  - Schema / Entity: `*/notifications/src/notification/entities/notification.entity.ts` (definición con `@Schema`, índices y enums)
  - Configuración de Mongoose en módulo: `*/notifications/src/notification/notification.module.ts` (`MongooseModule.forFeature([...])`)
  - Repositorio: `*/notifications/src/notification/notification.repository.ts` (operaciones CRUD y queries especiales)

---

## 8) Validación de datos antes de persistir (class-validator)

- **Implementación**: DTOs con validaciones (`class-validator`) y `@ApiProperty` para documentación; filtro para mapear errores de Mongoose a respuestas 400.
- **Dónde**:
  - DTOs: `*/notifications/src/notification/dto/*.ts` (p. ej. `send-email.dto.ts`, `create-notification.dto.ts`, `create-manual-notification.dto.ts`)
  - Mongoose error handling: `*/notifications/src/notification/filters/mongoose-exception.filter.ts`

---

## 9) Imagen Docker del proyecto

- **Implementación**: Dockerfile multi-stage (builder + runner) para optimizar imagen final.
- **Dónde**: `*/notifications/Dockerfile`

---

## 10) Gestión del código fuente: GitHub Flow

- **Evidencia**: Presencia de workflows y documentación de CI/CD; instrucciones para ramas y despliegue continuo, además del enlace al repositorio donde se evidencia el trabajo con esta metodología.
- **Dónde**: 
  - `.github/workflows/ci-cd-pipeline.yml`, `Notifications/notifications/CI-CD.md`.
  - `https://github.com/RoboFIS/Notifications`

---

## 11) Integración continua (tests, build, imagen + sonar)

- **Implementación**: GitHub Actions que ejecuta lint, tests unitarios, build TypeScript y construye/pushea imagen Docker si procede.
- **Dónde**: `.github/workflows/ci-cd-pipeline.yml` y `*/notifications/CI-CD.md` (explica secretos y parámetros).

---

## 12) Pruebas de componente en Javascript (Jest) — unit / e2e 

- **Implementación**:
  - Tests unitarios con Jest para servicios y controladores (mocks para comportamiento en-process).
  - Tests e2e con `supertest` que arrancan la aplicación Nest y realizan peticiones HTTP (integration/out-of-process), requieren Mongo en CI o local.
- **Dónde**:
  - Unit tests: `*/notifications/src/notification/notification.service.spec.ts`, `notification.controller.spec.ts`, `src/notification/email/sendgrid.client.spec.ts`
  - E2E tests: `*/notifications/test/app.e2e-spec.ts`
  - Ejecutar: `npm test` (unit), `npm run test:e2e` (e2e — requiere Mongo)
