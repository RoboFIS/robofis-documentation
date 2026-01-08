# Documentación de implementación — Requisitos de microservicio básico

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de microservicio básico y señala exactamente en qué parte del código se ha realizado cada implementación (en caso de que sea necesario).

---

## 1) Backend REST (GET, POST, PUT, DELETE)

- **Implementación**: Controlador REST con endpoints para CRUD de reservas de alquiler de robots, incluyendo operaciones de creación, consulta, actualización y cancelación.
- **Dónde**:
  - `micro_alquiler/src/rental/interface/http/controllers/rental.controller.ts`
    - POST `/v1/rentals` → `createRental` (línea 42-67)
    - GET `/v1/rentals/:id` → `getRental` (línea 73-80)
    - GET `/v1/rentals/user/:userId` → `getUserRentals` (línea 86-93)
    - PUT `/v1/rentals/:id` → `updateRental` (línea 113-126)
    - DELETE `/v1/rentals/:id` → `cancelRental` (línea 100-107)
- **Códigos de estado**: Se utilizan decoradores `@HttpCode` para códigos específicos (201 para creación, 204 para cancelación). Las excepciones de NestJS generan automáticamente códigos apropiados (404 para recursos no encontrados, 400 para validaciones fallidas). Se implementa rate limiting con `@Throttle` para prevenir abuso.

---

## 2) Mecanismo de autenticación

- **Estado actual**:
  - El frontend dispone de pantallas y utilidades para autenticación (login, registro, JWT decoding), sin embargo el microservicio de reservas **no** aplica un guard de autenticación JWT actualmente. Esto se debe a que, tras una conversación con el profesor, consideramos adecuado que solo un microservicio/la API Gateway implementara este tipo de autenticación.

---

## 3) Frontend con operaciones completas

- **Implementación**: Interfaz para crear, editar, borrar(cancelar) y consultar reservas de alquiler de robots.
- **Donde**:
  - Página principal de creación de reservas: `*/frontend/src/pages/Payment.tsx`.
  - Página de consulta de reservas: `*/frontend/src/pages/Robots.tsx`.
  - Página de consulta individual, edición y cancelación de reservas: `*/frontend/src/pages/RentalDetailPage.tsx`.
- **Comportamiento**: La UI realiza llamadas a la API REST y actualiza la vista.

---

## 4) Despliegue y accesibilidad en la nube

- **Implementación**: Configuración completa para construcción y publicación de imagen Docker, con workflows automatizados para CI/CD.
- **Dónde**:
  - `micro_alquiler/Dockerfile` - Dockerfile multi-stage optimizado
  - Workflows CI/CD:
    - `.github/workflows/run-tests.yml` - Pipeline de tests, lint y build
    - `.github/workflows/docker-publish.yml` - Construcción y publicación de imagen Docker en Docker Hub
  - Configuración de despliegue: `micro_alquiler/docker-compose.yml` para entorno local/desarrollo

---

## 5) API versionada

- **Implementación**: Versionado URI habilitado globalmente. La API está accesible bajo `/api/v1`.
- **Dónde**:
  - `micro_alquiler/src/main.ts` → `app.setGlobalPrefix('api')` (línea 32)
  - `micro_alquiler/src/main.ts` → `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })` (líneas 34-37)
  - Todos los endpoints del controlador usan `@Version('1')` para especificar la versión
- **Swagger**: La documentación está disponible en `/api/v1/docs/rental`

---

## 6) Documentación de la API (OpenAPI / Swagger)

- **Implementación**: Uso de `@nestjs/swagger` y decoradores `@Api*` en controladores y DTOs para generar documentación OpenAPI automática.
- **Dónde**:
  - Setup: `micro_alquiler/src/main.ts` (líneas 55-66) - Configuración de DocumentBuilder y SwaggerModule
  - Decoradores en DTOs: `micro_alquiler/src/rental/application/dtos/create-rental.dto.ts` (decoradores `@ApiProperty` con ejemplos y descripciones)
  - Documentación adicional: `micro_alquiler/openapi.yaml` - Especificación OpenAPI exportada
- **Acceso**: `/api/v1/docs/rental` en la instancia del servicio

---

## 7) Persistencia con MongoDB (NoSQL)

- **Implementación**: Mongoose para persistencia; schemas definidos con decoradores `@Schema`, índices para optimización de consultas y enums para validación de estados.
- **Dónde**:
  - Schema: `micro_alquiler/src/rental/infraestructure/database/schemas/folder.schemas.ts`
    - Definición con `@Schema({ timestamps: true })` (línea 5)
    - Índices en `user_id`, `robot_id`, `status` y `created_at` (líneas 57-60)
    - Enum `RentalStatus` para estados válidos (líneas 41-47)
  - Repositorio: `micro_alquiler/src/rental/infraestructure/repositories/mongo-rental.repository.ts`
    - Implementa patrones de repositorio para lectura y escritura
    - Métodos: `save`, `findById`, `findByUserId` con mapeo entre dominio y persistencia

---

## 8) Validación de datos antes de persistir (class-validator)

- **Implementación**: DTOs con validaciones exhaustivas usando `class-validator` y `@ApiProperty` para documentación. Validaciones personalizadas para lógica de negocio compleja.
- **Dónde**:
  - DTOs con validaciones:
    - `micro_alquiler/src/rental/application/dtos/create-rental.dto.ts`
      - Validadores: `@IsString`, `@IsNotEmpty`, `@IsDateString`, `@IsEnum`, `@MinLength`, `@MaxLength`
      - Validador personalizado `IsAfterStartDateConstraint` (líneas 26-41) para verificar que `end_date` sea posterior a `start_date`
    - `micro_alquiler/src/rental/application/dtos/update-rental.dto.ts`
  - Configuración global: `micro_alquiler/src/main.ts` (líneas 12-18)
    - `ValidationPipe` con `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`

---

## 9) Imagen Docker del proyecto

- **Implementación**: Dockerfile multi-stage (builder + production) para optimizar el tamaño de la imagen final y mejorar la seguridad.
- **Dónde**: `micro_alquiler/Dockerfile`
  - Stage 1 (builder): Instalación de todas las dependencias y compilación TypeScript (líneas 1-16)
  - Stage 2 (production): Solo dependencias de producción y código compilado (líneas 18-35)
  - Expone puerto 3000 y ejecuta `node dist/main`

---

## 10) Gestión del código fuente: GitHub Flow

- **Evidencia**: Uso de ramas `main` y `develop`, workflows automatizados que se ejecutan en push y pull requests, y documentación del proceso.
- **Dónde**:
  - Workflows configurados para ramas: `.github/workflows/run-tests.yml` (líneas 3-6) - Se ejecuta en push/PR a `main` y `develop`
  - `.github/workflows/docker-publish.yml` (líneas 4-7) - Publicación automática en push a ramas principales
  - Repositorio: El proyecto sigue GitHub Flow con ramas de feature, pull requests y revisiones de código

---

## 11) Integración continua (tests, build, imagen + sonar)

- **Implementación**: GitHub Actions que ejecuta lint, tests unitarios, tests e2e, build TypeScript y construcción/publicación de imagen Docker.
- **Dónde**: `.github/workflows/run-tests.yml`
  - **Job 1 - Tests** (líneas 10-70):
    - Servicios MongoDB y RabbitMQ con health checks (líneas 18-37)
    - Lint con ESLint (líneas 52-53)
    - Tests unitarios con Jest (líneas 55-68)
  - **Job 2 - Build** (líneas 72-105):
    - Compilación TypeScript y verificación de artefactos
  - **Job 3 - Docker** (líneas 107-121):
    - Construcción de imagen Docker con tag basado en SHA del commit
- **Publicación**: `.github/workflows/docker-publish.yml` - Push automático a Docker Hub con tags por rama y SHA

---

## 12) Pruebas de componente en Javascript (Jest) — unit / e2e

- **Implementación**:
  - **Tests unitarios** con Jest para handlers de comandos, queries, entidades y adaptadores (mocks para comportamiento aislado)
  - **Tests e2e** con `supertest` y `@testcontainers` que arrancan la aplicación completa con MongoDB y RabbitMQ reales
- **Dónde**:
  - **Unit tests** (12 archivos):
    - `micro_alquiler/src/rental/application/commands/handlers/*.spec.ts` - Tests de command handlers (create, update, cancel, assign, confirm)
    - `micro_alquiler/src/rental/application/queries/handlers/*.spec.ts` - Tests de query handlers
    - `micro_alquiler/src/rental/domain/entities/rental.entity.spec.ts` - Tests de lógica de dominio
    - `micro_alquiler/src/rental/infraestructure/adapters/*.spec.ts` - Tests de adaptadores HTTP
  - **E2E tests**:
    - `micro_alquiler/test/app.e2e-spec.ts` - Tests de integración completos con Testcontainers
    - `micro_alquiler/test/events.e2e-spec.ts` - Tests de eventos asíncronos con RabbitMQ
  - **Ejecutar**:
    - `npm test` (unitarios)
    - `npm run test:e2e` (e2e - usa Testcontainers para MongoDB y RabbitMQ)
    - `npm run test:all` (todos los tests)

---
