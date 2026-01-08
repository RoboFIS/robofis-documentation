# Justificación de requisitos — Microservicio de Estado del Robot

- **Nivel de acabado:** 7

Este documento justifica, **requisito por requisito**, cómo se han ido cumpliendo los puntos solicitados para el microservicio, e incluye referencias a ubicaciones del código donde se puede verificar la implementación.

---

# Requisitos Básicos

## 1. Backend como API REST con métodos GET/POST/PUT/DELETE y códigos de estado adecuados

**Estado:** Cumplido.

**Justificación y evidencias:**

- Controladores REST:
  - Robots: `src/robot/interface/http/controllers/robots.controller.ts`
    - `GET /robots`
    - `GET /robots/:id`
    - `POST /robots/inject` (201)
    - `PUT /robots/:id` (200)
    - `DELETE /robots/:id` (200)
    - `POST /robots/:id/decommission` (200)
  - Logs: `src/robot-log/interface/http/controllers/robot-log.controller.ts`
    - `POST /robot-logs` (201)
    - `GET /robot-logs`
    - `GET /robot-logs/:id`
    - `GET /robots/:robotId/logs`

- Códigos de estado:
  - Se usan `@HttpCode(HttpStatus.CREATED)` para creaciones y `HttpStatus.OK` en operaciones de actualización/borrado.
  - Los errores 404/400 se lanzan desde servicios de aplicación con `NotFoundException`/`BadRequestException`.
    - `src/robot/application/services/robot.application.service.ts`
    - `src/robot-log/application/services/robot-log.application.service.ts`

---

## 2. La API debe tener un mecanismo de autenticación

**Estado:** Implementado por el API Gateway.

**Justificación y evidencias:**

El API Gateway compartido por todos los micros requiere autenticación con un JWT token. No hay llamadas HTTP directas a nuestro micro. En nuestro micro se usa el JWT para identificar el usuario y mostrar los robots que ha alquilado en este momento. Aunque no hay una verificación del token, sin JWT no se muestran los robots.

En `api-gateway\src\gateway\gateway.controller.ts` no tenemos el decorador `@Public()` en ninguna de nuestras funciones.

---

## 3. Debe tener un frontend que permita hacer todas las operaciones de la API

**Estado:** Implementado.

**Justificación y evidencias:**

Las operaciones de nuestra API se comparten entre el frontend de nuestro micro (Estado), y el de Stock.

| Operación (endpoint) | Stock | Estado | Ubicación Código |
|---|---|---|---|
| `GET /robots` | x | x | `src\pages\RobotStatus.tsx` |
| `GET /robots/:id` | x | x | `src\pages\RobotStatus.tsx` |
| `POST /robots/inject` | x |  | `src\stock\application\services\stock-demand.execution.service.ts line 149` |
| `PUT /robots/:id` | x |  | `src\stock\application\services\stock-demand.execution.service.ts line  94` |
| `DELETE /robots/:id` | x |  | `src\stock\application\commands\robots\decommission-robot.command.handler.ts` |
| `POST /robots/:id/decommission` | x |  | `src\stock\application\commands\robots\decommission-robot.command.handler.ts line 27` |
| `POST /robot-logs` |  | x | `src/pages/RobotLogsPage.tsx` |
| `GET /robot-logs` |  | x | `src/pages/RobotLogsPage.tsx` |
| `GET /robot-logs/:id` |  | x | `src/pages/RobotLogsPage.tsx` |
| `GET /robots/:robotId/logs` |  | x | `src/pages/RobotLogsPage.tsx` |


---

## 4. Debe estar desplegado y accesible desde la nube

**Estado:** Implementado.

**Justificación y evidencias:**

- Hay definición de imagen Docker y arranque en contenedores:
  - `Dockerfile`
  - `docker-compose.yml`

- Accesible desde el frontend desplegado

---

## 5. La API debe estar accesible en una dirección bien versionada

**Estado:** Cumplido.

**Justificación y evidencias:**

- Prefijo global de versionado:
  - `src/main.ts` → `app.setGlobalPrefix('api/v1');`

Esto hace que las rutas REST queden bajo `/api/v1/...`.

---

## 6. Documentación de todas las operaciones de la API (peticiones y respuestas)

**Estado:** Cumplido.

**Justificación y evidencias:**

- Documento llamado "2_Descripción-API-REST": https://robofis.github.io/robofis-documentation/docs/category/estado-de-robots

Incluye endpoints, ejemplos de request/response, códigos de error y variables de entorno relacionadas.

---

## 7. Persistencia usando MongoDB u otra base de datos NoSQL

**Estado:** Cumplido.

**Justificación y evidencias:**

- Conexión a MongoDB con Mongoose:
  - Robots: `src/robot/infrastructure/nest_modules/robot-persistence.module.ts` (usa `MongooseModule.forRoot(process.env.MONGO_URI ...)`)
  - Esquema de robots: `src/robot/infrastructure/database/schemas/robot.schema.ts`
  - Esquema de logs: `src/robot-log/infrastructure/database/schemas/robot-log.schema.ts`

- Configuración local con contenedor MongoDB:
  - `docker-compose.yml` incluye servicio `mongodb`.

---

## 8. Validación de datos antes de almacenarlos (ej. usando Mongoose)

**Estado:** Cumplido.

**Justificación y evidencias:**

- Validación de entrada (DTOs) con `class-validator`:
  - Inyección: `src/robot/application/dtos/inject-robot.dto.ts`
  - Update: `src/robot/application/dtos/update-robot.dto.ts`
  - Crear log: `src/robot-log/application/dtos/create-robot-log.dto.ts`
  - Query logs: `src/robot-log/application/dtos/query-robot-log.dto.ts`

- Validación global automática (whitelist/transform) con `ValidationPipe`:
  - `src/main.ts`

- Validaciones de dominio adicionales (reglas de negocio y rangos):
  - Robot: `src/robot/domain/entities/robot.entity.ts`
  - RobotLog: `src/robot-log/domain/entities/robot-log.entity.ts`

- Validaciones a nivel de esquema Mongoose (mínimos/máximos, enum, required):
  - `src/robot/infrastructure/database/schemas/robot.schema.ts`
  - `src/robot-log/infrastructure/database/schemas/robot-log.schema.ts`

---

## 9. Debe haber definida una imagen Docker del proyecto

**Estado:** Cumplido.

**Justificación y evidencias:**

- Dockerfile multi-stage (build + runtime): `Dockerfile`
- Orquestación local con dependencias (MongoDB y RabbitMQ): `docker-compose.yml`

---

## 10. Gestión del código fuente en GitHub siguiendo GitHub Flow

**Estado:** Cumplido.

**Justificación:**

- Pull Requests en GitHub: https://github.com/RoboFIS/microservicio-estado/pulls?q=is%3Apr+is%3Aclosed
- Historial de merges a `develop`: https://github.com/RoboFIS/microservicio-estado/tree/develop

---

## 11. Integración continua: compilar, probar y generar imagen Docker automáticamente en cada commit

**Estado:** Cumplido.

**Justificación y evidencias:**

- Existe un workflow de GitHub Actions en [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) a nivel de repositorio (fuera de `micro_template/`), que orquesta CI/CD para esta carpeta usando `working-directory: ./micro_template`.
- Disparadores: `push` y `pull_request` a ramas `main` y `develop`, filtrando cambios bajo `micro_template/**`.
- Jobs del pipeline:
  - Test: levanta servicios `mongodb` y `rabbitmq`; instala dependencias con Node 20 (`npm ci`); ejecuta `npm run lint` (sin fallar el job por errores), `npm test` y `npm run test:e2e` con variables de entorno (`MONGO_URI`, `RABBITMQ_URL`, `PORT`, etc.).
  - Build: ejecuta `npm run build` y verifica la existencia de `dist/`.
  - Docker (validación): construye la imagen `microservicio-estado:${{ github.sha }}`.
  - Deploy (solo en `push` a `develop` o `main`): usa Buildx, hace login en Docker Hub y publica con etiquetas `latest`, `develop-<sha>` y `develop-YYYYMMDD-HHmmss`.
- Los scripts utilizados residen en [micro_template/package.json](micro_template/package.json).

---

## 12. Pruebas de componente con Jest (escenarios positivos y negativos; in-process y out-of-process)

**Estado:** Cumplido.

**Justificación y evidencias:**

- Pruebas in-process (unidad/componentes) bajo [test/in_process](test/in_process):
  - [test/in_process/robot.entity.spec.ts](test/in_process/robot.entity.spec.ts): valida reglas de dominio del `Robot` (rangos de `battery` y `speed`, cardinalidad de `zoneCoordinates`, `mode` válido, `stationId` no vacío) con escenarios negativos y positivos; además prueba getters `isOnMission` e `isAtStation`.
  - [test/in_process/defect-history.spec.ts](test/in_process/defect-history.spec.ts): verifica creación/validación de `DefectHistory` (fechas válidas, resolved/resolvedAt/resolvedBy), mutaciones inmutables `addDefect()` y `resolveDefect()`, y consultas `getUnresolvedDefects()` y `hasCriticalDefects()` con casos positivos y negativos.
  - [test/in_process/point-in-polygon.spec.ts](test/in_process/point-in-polygon.spec.ts): comprueba utilidades geométricas con puntos dentro/fuera y polígonos inválidos.
  - [test/in_process/simulation.config.spec.ts](test/in_process/simulation.config.spec.ts): cubre utilidades de simulación (`calculateDistance`, `calculateTravelTime`, `interpolatePosition`) y constantes de `SIMULATION_CONFIG`.

- Pruebas out-of-process (E2E HTTP) bajo [test/out_process](test/out_process):
  - [test/out_process/api.e2e-spec.ts](test/out_process/api.e2e-spec.ts): arranca la app con `@nestjs/testing` y usa `supertest` para cubrir el ciclo de vida completo:
    - Robots: `POST /robots/inject` (201), `GET /robots` (200), `GET /robots/:id` (200), `PUT /robots/:id` (200), `POST /robots/:id/decommission` (200), `DELETE /robots/:id` (200), y verificación de `404` tras borrado.
    - Logs: `POST /robot-logs` (201), `GET /robot-logs` (200), `GET /robot-logs/:id` (200), `GET /robots/:robotId/logs` (200).
    - Incluye escenarios positivos y un escenario negativo representativo (`404` al consultar robot eliminado).

Estos tests se ejecutan en CI mediante el job "Lint & Tests" del workflow descrito en el punto 11.

---

# Requisitos Avanzados

## 13. Materialized view del estado de otros microservicios

**Estado:** Parcial.

**Justificación y evidencias:**

- Este micro mantiene una proyección local (materializada) de ciertos eventos del microservicio de Stock para orquestar misiones:
  - Listener de eventos RMQ: `src/robot/interface/messaging/dispatch-listener.controller.ts` (evento `stock.robot.dispatch.authorized`).
  - Servicio de misiones: `src/robot/application/services/mission.service.ts` actualiza el `Robot` (Mongo) y persiste estado de la misión/routeo en caché.
  - Persistencia/Repositorio de `Robot`: `src/robot/infrastructure/repositories/mongo-robot.repository.ts`.
  - Caché de simulación (estado de misión, waypoints, progreso): `src/robot/application/simulation/cache/simulation-state.cache.ts`.

Esta proyección local refleja “autorizaciones de dispatch” externas y se usa para simular/seguir la misión y exponer el estado vía API.

**Limitaciones:** No replica de forma completa el estado de otro micro (p.ej., inventario/stock), solo una parte relevante (misiones autorizadas y routeo). No hay rehidratación histórica completa ni reconciliación periódica.

---

## 14. Cachés para optimizar acceso a recursos

**Estado:** Cumplido.

**Justificación y evidencias:**

- Uso de caché de aplicación con `@nestjs/cache-manager` para el estado de simulación y routeo:
  - Registro de caché: `src/robot/infrastructure/nest_modules/robot-core.module.ts` ( `CacheModule.register()` ).
  - Servicio de caché: `src/robot/application/simulation/cache/simulation-state.cache.ts` (almacena `missionPhase`, `routeWaypoints`, `currentWaypointIndex`, etc.).
  - Uso en misiones: `src/robot/application/services/mission.service.ts` (guarda la ruta calculada en caché para evitar recomputar/calls repetidas durante la misma misión).

---

## 15. Consumo de API externa o cloud storage

**Estado:** Cumplido.

**Justificación y evidencias:**

- Integración con Mapbox Directions API para cálculo de rutas:
  - Servicio: `src/robot/application/services/route.service.ts` (construye URL, hace `fetch`, decodifica `polyline6`).
  - Variables de entorno: `MAPBOX_ACCESS_TOKEN` (documentadas en API-REST).

---

## 16. Rate limit en el uso de servicios externos

**Estado:** Cumplido.

**Justificación y evidencias:**

- Implementación de token bucket con cola de espera:
  - Servicio: `src/robot/application/services/rate-limiter.service.ts` (`maxTokens`, `refillRate` configurables por env).
  - Uso directo antes de llamar a Mapbox: `src/robot/application/services/route.service.ts` → `await this.rateLimiter.acquire()`.

---

## 17. Autenticación basada en JWT o equivalente

**Estado:** Implementado solo a nivel de API Gateway.

**Justificación y evidencias:**

- Tal y como se detalla en el punto 2, la autenticación se realiza en el API Gateway compartido (uso de JWT). Este micro no expone rutas públicas directas y asume tráfico autenticado a través del gateway.

---

## 18. Circuit breaker en comunicaciones con otros servicios

**Estado:** No implementado.

---

## 19. Microservicio adicional en arquitectura serverless (FaaS)

**Estado:** No implementado.

---

## 20. Gestión de capacidad: throttling o feature toggles

**Estado:** No implementado.

