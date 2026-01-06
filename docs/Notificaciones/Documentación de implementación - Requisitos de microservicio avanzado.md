# Documentación de implementación — Requisitos de microservicio avanzado

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de microservicio avanzado y señala exactamente en qué parte del código se ha realizado cada implementación (en caso de que sea necesario).

---

## 1) Implementar un frontend con rutas y navegación

- **Implementación**:
  - **Enrutamiento**: Se ha utilizado `react-router-dom` para la gestión de la navegación. La configuración principal reside en `src/App.tsx`, donde se definen rutas públicas y privadas. Se implementan componentes de guarda (`AuthGuard`, `GuestGuard`) para proteger rutas según el estado de autenticación y el rol del usuario.
  - **Centro de Notificaciones**: Se ha desarrollado una página dedicada (`src/pages/Notifications.tsx`) que actúa como página principal de alertas.
    - **Gestión de Estado**: Utiliza `useState` y `useEffect` para cargar notificaciones e historial desde el backend. Implementa un listener de eventos `window.addEventListener('notifications:updated')` para refrescar la lista ante actualizaciones.
    - **Filtrado y Organización**: Las notificaciones se clasifican por origen (`RENTAL`, `ROBOTS`, `STOCK`, `USERS`, `MANUAL`) mediante pestañas.
    - **Interfaz de Usuario**: Se utilizan componentes visuales (`Card`, `Badge`) con códigos de color según la severidad (`INFO`, `SUCCESS`, `WARNING`, `CRITICAL`).
  - **Servicios Frontend**: La lógica de comunicación con la API se centraliza en `src/services/notifications.ts`, proporcionando métodos para obtener notificaciones (`getNotifications`), marcar como leídas (`markNotificationAsRead`) y consultar endpoints específicos de administración.
  - **Funcionalidades Administrativas**: Para usuarios con rol `ADMIN` o `EMPLOYEE`, se habilitan modales específicos para la gestión de incidentes de robots (`getRobotIncidents`) y demandas de stock (`getStockDemands`), así como formularios para el envío manual de notificaciones.

- **Dónde**:
  - Repositorio: ([RoboFIS/frontend](https://github.com/RoboFIS/frontend))
  - Configuración de rutas: `src/App.tsx`
  - Página principal: `src/pages/Notifications.tsx`
  - Servicio API: `src/services/notifications.ts`
  - Componentes de UI: `src/components/notifications/` (Formularios).

---

## 2) Integración con API externa (SendGrid)

- **Implementación**: Se ha utilizado la librería oficial `@sendgrid/mail` para la integración. Se configura la API Key a través de variables de entorno gestionadas por `ConfigService`. La lógica se encapsula en el servicio `SendGridClient`, permitiendo la inyección de dependencias y facilitando el testing.
- **Dónde**:
  - Repositorio: ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications))
  - Archivo: `notifications/src/notification/email/sendgrid.client.ts`
  - Código relevante: `constructor` (inicialización) y método `send` (envío).
  
---

## 3) Implementación de Rate Limit en el consumo de SendGrid

- **Implementación**: Se ha implementado un manejo explícito del error HTTP 429 (Too Many Requests) devuelto por SendGrid. El cliente intercepta este error y extrae las cabeceras `x-ratelimit-limit`, `x-ratelimit-remaining` y `x-ratelimit-reset` para lanzar una excepción personalizada `RateLimitError`. Esto permite al sistema reaccionar adecuadamente a la saturación del servicio externo.
- **Dónde**:
  - Repositorio: ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications))
  - Archivo: `notifications/src/notification/email/sendgrid.client.ts`
  - Código relevante: Bloque `catch` dentro del método `send`, donde se evalúa `if (resp && resp.statusCode === 429)`.
  
---

## 4) Implementar un mecanismo de autenticación basado en JWT o equivalente

- **Implementación**:
  - **Delegación de Autenticación**: Siguiendo un enfoque de arquitectura de microservicios eficiente, **no se ha implementado un mecanismo de autenticación interno** (como validación de tokens JWT o gestión de sesiones) dentro del código fuente del microservicio de notificaciones.
  - **Justificación**: Se ha optado por centralizar toda la lógica de seguridad en el **API Gateway** (ver apartado 7). Esto descarga al microservicio de la responsabilidad de validar credenciales, permitiéndole centrarse exclusivamente en su dominio. El microservicio asume que cualquier petición que recibe proviene de la pasarela y, por tanto, ya ha sido autenticada y autorizada.
  
- **Dónde**:
  - No aplica (ausencia intencional de código de autenticación en el microservicio).
  
---

## 5) Implementación del patrón Circuit Breaker

- **Implementación**: Se utiliza la librería `opossum` para envolver las llamadas a SendGrid. El circuit breaker monitoriza los fallos y abre el circuito temporalmente cuando se supera un umbral de errores o timeouts, previniendo la saturación del servicio externo y permitiendo una recuperación rápida. Se configuran parámetros como `timeout`, `errorThresholdPercentage` y `resetTimeout` mediante variables de entorno.
- **Dónde**:
  - Repositorio: ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications))
  - Archivo: `notifications/src/notification/email/sendgrid.client.ts`
  - Código relevante: Constructor (inicialización de `this.breaker`) y uso de `this.breaker.fire(mail)` en el método `send`.
  
---

## 6) Implementación de Sonarqube en CI

- **Implementación**: Se ha configurado un job específico en el pipeline de CI (GitHub Actions) que ejecuta el escáner de SonarQube tras los tests y la generación de cobertura. Se utiliza la acción `sonarsource/sonarqube-scan-action` y se definen propiedades como `sonar.projectKey` y `sonar.sources` tanto en el workflow como en el archivo de propiedades.
- **Dónde**:
  - Repositorio: ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications))
  - Archivo de Pipeline: `.github/workflows/ci-cd-pipeline.yml` (Job `sonarqube`)
  - Configuración: `sonar-project.properties`
  
---

## 7) Hacer uso de un API Gateway con autenticación. (Requisito de aplicación avanzada)

- **Implementación**: Se ha desarrollado una **API Gateway** utilizando el framework NestJS y la librería `http-proxy` para actuar como punto de entrada único (Reverse Proxy) y barrera de seguridad del sistema.
  - **Autenticación Centralizada**: La gateway implementa un mecanismo de **Autenticación Global**. Se utiliza un `JwtAuthGuard` configurado como `APP_GUARD` en el módulo principal, lo que garantiza que **todas** las peticiones entrantes sean interceptadas y validadas contra la estrategia JWT (`JwtStrategy`) antes de ser procesadas o redirigidas. **Excepto aquellas gestionadas por controladores marcados como @Public**.
  - **Mecanismo de Proxy**: El `GatewayController` gestiona el enrutamiento. Utiliza una instancia de `http-proxy` (`this.proxy`) para redirigir las peticiones a los microservicios correspondientes (Usuarios, Rental, Stock, Notificaciones, Robots), manteniendo la transparencia para el cliente (`changeOrigin: true`).
  - **Endpoints de Notificaciones**: La gateway expone y protege rutas específicas para el microservicio de notificaciones, añadiendo lógica de autorización granular:
    - `GET /notifications/user/:userId`: Permite obtener el historial de notificaciones. Incluye validación para asegurar que un usuario estándar solo vea *sus* propias notificaciones.
    - `DELETE /notifications/:id`: Elimina una notificación. Antes de hacer proxy, la gateway verifica la propiedad de la notificación consultando al microservicio.
    - `PUT /notifications/:id/read`: Marca una notificación como leída (también con validación de propiedad).
    - `ALL /notifications/*`: Redirige cualquier otra petición genérica al servicio de notificaciones.

- **Dónde**:
  - Repositorio: ([RoboFIS/robofis-api-gateway](https://github.com/RoboFIS/robofis-api-gateway))
  - Controlador principal y lógica de proxy: `api-gateway/src/gateway/gateway.controller.ts`
  - Configuración de Autenticación Global: `api-gateway/src/app.module.ts`
  - Estrategia de validación JWT: `api-gateway/src/auth/jwt.strategy.ts`
  
---

## 8) Hacer uso de un sistema de comunicación asíncrono mediante un sistema de cola de mensajes para todos los microservicios. (Requisito de aplicación avanzada)

- **Implementación**: Se utiliza **RabbitMQ** como broker de mensajería, configurado mediante el módulo de microservicios de **NestJS** (`@nestjs/microservices`).
  - **Tecnología**: El microservicio utiliza un **Topic Exchange** (`robofis.events`) y una cola durable (`notification_events`). Se han implementado bindings manuales en el arranque (`main.ts`) para garantizar que la cola reciba eventos de routing keys como `rental.#`, `users.#`, `stock.#` y `status.#`.
  - **Patrón**: Se utiliza el patrón **Event-Driven Architecture**. El microservicio de notificaciones actúa como un consumidor pasivo que reacciona a eventos de dominio emitidos por otros servicios.
  - **Resiliencia**: Los listeners implementan un mecanismo de `safeAck` (Acknowledgement manual seguro) para evitar la pérdida de mensajes en caso de fallo en el procesamiento.

- **Listeners Implementados**:

  1. **Stock Domain** (`stock-microservice-listener.ts`):
      - `stock.station.demand.required`: Alerta a empleados cuando una estación requiere reabastecimiento (Severidad: WARNING).
      - `stock.robot.dispatched`: Informa cuando un robot es despachado para tareas de stock (Severidad: INFO).
      - `stock.item.low`: Alerta crítica de stock bajo en estaciones (Severidad: CRITICAL).

  2. **Rental Domain** (`rental-microservice-listener.ts`):
      - `rental.reservation.created`: Notifica al cliente la creación de su reserva.
      - `rental.reservation.confirmed`: Confirma la reserva, incluyendo detalles de precio y dirección.
      - `rental.reservation.canceled`: Informa de cancelaciones (Severidad: WARNING).
      - `rental.reservation.delivered` / `returned`: Notifica cambios de estado en el ciclo de vida del alquiler.
      - `rental.reservation.updated`: Informa sobre cambios en los datos de la reserva.

  3. **Status/Robots Domain** (`status-microservice-listener.ts`):
      - `status.robot.change.operative`: Monitoriza la salud de los robots (Operativo/Averiado). Genera alertas CRÍTICAS si un robot se avería.
      - `status.robot.change.zone`: Rastrea movimientos de robots entre zonas (Entrada/Salida).
      - `status.robot.mode.maintenance`: Avisa cuando un robot entra en modo mantenimiento.
      - `status.robot.change.battery`: Alerta si la batería baja de niveles aceptables (LOW -> WARNING).
      - `status.robot.change.station`: Registra llegadas y salidas de estaciones de carga.

  4. **User Domain** (`user-microservice-listener.ts`):
      - `user.tier.changed`: Informa cambios en el nivel de suscripción del usuario.
      - `user.address.updated` / `user.phone.updated`: Confirmaciones de seguridad al actualizar datos sensibles.
      - `user.created`: Bienvenida al usuario. Además de la notificación in-app, este evento manda un **correo electrónico de bienvenida** a través de SendGrid.

- **Dónde**:
  - Repositorio: ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications))
  - Configuración: `notifications/src/main.ts` (conexión a RabbitMQ, bindings).
  - Listeners: Directorio `notifications/src/notification/listeners/`.
