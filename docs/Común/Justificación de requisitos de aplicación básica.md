# Justificación de requisitos de aplicación básica

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de aplicación básica y señala exactamente en qué parte del código se ha realizado cada implementación (en caso de que sea necesario).

---

## 1) Interacción completa entre todos los microservicios de la aplicación integrando información. La integración debe realizarse a través del backend

### Notificaciones

- *Interacciones*:
  - **Recepción de eventos**: El servicio de notificaciones actúa como consumidor de eventos de RabbitMQ emitidos por otros microservicios, permitiendo una integración asíncrona y desacoplada.
  - **RabbitMQ**: Se conecta al exchange `robofis.events` (tipo topic) y utiliza la cola `notification_events` para procesar mensajes.
- *Detalle por Servicio*:
  - **Usuarios (User Service)**: Escucha eventos relacionados con usuarios a través de `UserMicroserviceListener`.
  - **Alquileres (Rental Service)**: Escucha eventos de alquileres a través de `RentalMicroserviceListener`.
  - **Estado (Status Service)**: Escucha eventos de cambios de estado a través de `StatusMicroserviceListener`.
  - **Stock (Stock Service)**: Escucha eventos de inventario a través de `StockMicroserviceListener`.
- *Dónde*:
  - *Repositorio*: [RoboFIS/Notifications](https://github.com/RoboFIS/Notifications)
  - *Configuración*: `src/main.ts` (Configuración de conexión a RabbitMQ).
  - *Listeners*: `src/notification/listeners/` (Contiene las clases de escucha para cada microservicio).

### Gestion de usuarios

- *Interacciones*:
  - **Recepción de eventos**: Consumidor de eventos de RabbitMQ para mantener la consistencia de datos entre alquileres y usuarios, gestionando reservas y reembolsos.
  - **Emisión de eventos**: Publica eventos de dominio cuando ocurren cambios significativos en el usuario (creación, cambio de plan, actualización de datos) para notificar a otros servicios.
- *Detalle por Servicio*:
  - **Alquileres (Rental Service)**: Se integra escuchando eventos `rental.reservation.created`, `rental.reservation.cancelled` y `rental.reservation.returned` para actualizar el historial de alquileres del usuario en tiempo real.
  - **Pagos (Payment Service)**: Escucha el evento `payment.reservation.refund_required` para ejecutar la lógica de reembolso de tokens (Saga).
  - **Difusión Global**: Emite eventos como `UserCreatedEvent`, `UserTierChangedEvent`, `UserAddressUpdatedEvent` y `UserPhoneUpdatedEvent` al exchange `robofis.events`.
- *Dónde*:
  - *Repositorio*: [RoboFIS/microservicio-gestionusuario](https://github.com/RoboFIS/microservicio-gestionusuario/)
  - *Consumer (Listener)*: `src/user/interface/messaging/event_listeners/rental-event.listener.ts`
  - *Publisher*: `src/user/infrastructure/messaging/event-publisher.ts`
  - *Handler de Eventos*: `src/user/infrastructure/messaging/user-events.handler.ts.ts`

### Reserva

- *Interacciones*:
  - **Clientes HTTP (Síncrono)**: El servicio de alquiler actúa como orquestador de transacciones, comunicándose síncronamente con otros servicios para validaciones críticas antes de aceptar una solicitud.
    - **Stock**: Consulta disponibilidad de robots (`/stock/availability`) antes de crear la reserva.
    - **Pagos**: Verifica saldo y ejecuta cobros/reembolsos directos contra el servicio de Usuarios.
    - **Geolocalización**: Consulta API externa (OpenStreetMap) para validar direcciones.
  - **Recepción de eventos (Asíncrono)**: Escucha eventos para avanzar el estado de la reserva una vez creada.
    - `stock.reservation.confirmed`: Confirma la reserva cuando el robot ha sido asignado físicamente.
    - `robot.delivered` / `robot.returned`: Actualiza el ciclo de vida del alquiler (Activo -> Completado).
  - **Emisión de eventos**:
    - `rental.reservation.created`: Notifica que una reserva "lógica" ha sido creada y pagada, solicitando a Stock que proceda con la asignación física.
- *Detalle por Servicio*:
  - **Stock Service**: Comunicación híbrida. HTTP para consulta rápida de disponibilidad ("¿Hay robots?") y Eventos para la reserva física ("Guárdame este robot").
  - **Usuarios (Payment)**: Comunicación HTTP directa protegida por Circuit Breakers para asegurar que el cobro se realice atómicamente antes de confirmar nada.
  - **Robots/Estado**: Comunicación puramente por eventos para desacoplar el ciclo de vida operativa del robot del ciclo de vida financiero del alquiler.
- *Dónde*:
  - *Repositorio*: [RoboFIS/robofis-reserva](https://github.com/RoboFIS/robofis-reserva/)
  - *Adaptadores HTTP*: `src/rental/infraestructure/adapters/` (`http-stock.adapter.ts`, `http-payment.adapter.ts`, `openstreetmap.adapter.ts`).
  - *Listener RabbitMQ*: `src/rental/interface/messaging/event_listeners/robot-events.listener.ts`.
  - *Emisor*: `src/rental/application/commands/handlers/create-rental.handler.ts` (Publica el evento inicial).
  - *Configuración*: `src/main.ts` (Conexión a RabbitMQ exchange `robofis_events`).

### Stock

- *Interacciones*:
  - **Clientes HTTP (Síncrono)**:
    - **OpenRouteService**: Consume el API externo de OpenRouteService para calcular estimaciones de tiempo de caminata y distancia para la navegación de los robots (`OpenRouteRoutingService`).
    - **RobotState Service**: Interactúa con el servicio de estado de los robots (`HttpRobotStateClient`) para inyección, actualizaciones y retirada de robots. Utiliza **Circuit Breakers** (Opossum) para manejar fallos y latencia.
  - **Recepción de eventos (Asíncrono)**: Consumer de RabbitMQ que reacciona a cambios en alquileres y estado físico de los robots.
    - `rental.reservation.created`: Inicia el proceso de asignación de stock.
    - `rental.reservation.cancelled`: Libera stock reservado.
    - `status.robot.*`: Actualiza la posición y estado del inventario (batería, zona, mantenimiento, entrega).
  - **Emisión de eventos**:
    - `StockRobotDispatchedNotificationEvent`: Notifica que un robot ha sido despachado.
    - `ReservationConfirmedEvent`: Confirma la reserva al servicio de alquileres.
- *Dónde*:
  - *Repositorio*: [RoboFIS/stock-microservice](https://github.com/RoboFIS/stock-microservice)
  - *Clientes HTTP*:
    - `src/stock/infrastructure/services/open-route.routing.service.ts`
    - `src/stock/infrastructure/services/robot-state.client.ts`
  - *Listener RabbitMQ*: `src/stock/interface/messaging/event_listeners/stock.events.listener.ts`
  - *Configuración*: `src/stock/infrastructure/rabbitmq/rmq.config.ts`

### Estado del robot

- *Interacciones*:
  - **Recepción de eventos**:
    - `stock.robot.dispatch.authorized`: Escucha este evento para recibir órdenes de misión y despachar robots a ubicaciones específicas.
  - **Emisión de eventos**: El servicio publica eventos para informar sobre cambios en el ciclo de vida y estado físico de los robots.
    - `status.robot.change.station`: Notifica cuando un robot sale o llega a una estación.
    - `status.robot.change.zone`: Notifica cuando un robot entra o sale de una zona autorizada.
    - `status.robot.mode.maintenance`: Alerta cuando un robot entra en modo mantenimiento por batería baja o fallos.
    - `status.robot.change.operative`: Informa cambios en la operatividad del robot (ej. si deja de estar operativo por mantenimiento).
- *Dónde*:
  - *Repositorio*: [RoboFIS/microservicio-estado](https://github.com/RoboFIS/microservicio-estado)
  - *Listener*: `src/robot/interface/messaging/dispatch-listener.controller.ts` (Manejo de `stock.robot.dispatch.authorized`).
  - *Publisher*: `src/robot/infrastructure/messaging/event-publisher.ts` (Clase `EventPublisher` para emitir eventos).
  - *Definición de Eventos*: `src/robot/domain/events/event-types.ts` (Constantes de tipos de eventos).
  - *Orígenes de Eventos*:
    - `src/robot/application/services/mission.service.ts` (Emite cambios de estación).
    - `src/robot/application/simulation/detectors/zone.detector.ts` (Emite cambios de zona).
    - `src/robot/application/simulation/detectors/maintenance.detector.ts` (Emite alertas de mantenimiento).

## 2) Tener un frontend común que integre los frontends de cada uno de los microservicios

- *Implementación*:
  Se ha desarrollado una única **Single Page Application (SPA)** utilizando **React** que actúa como contenedor global. Esta aplicación integra las funcionalidades de todos los microservicios, presentándolas al usuario como una experiencia unificada.
  - *Arquitectura de Vistas*: Las vistas principales de la aplicación se encuentran centralizadas en `src/pages`. Cada componente de página (Page) actúa como punto de entrada para las funcionalidades de los distintos servicios (Usuarios, Stock, Rental, Robots).
  - *Enrutamiento*: `App.tsx` orquestra la navegación mapeando rutas específicas a estas páginas unificadas.

- *Dónde*:
  - *Repositorio*: ([RoboFIS/frontend](https://github.com/RoboFIS/frontend/))
  - *Enrutador Principal*: `src/App.tsx`
  - *Páginas por Servicio (en `src/pages/`)*:
    - *Gestión de Usuarios*: `PricingPage.tsx`, `UserDetailsPage.tsx`, `UserListPage.tsx`
    - *Gestión de Stock*: `StockDashboard.tsx`, `StationsPage.tsx`, `ZonesPage.tsx`, `StockRobotsPage.tsx`
    - *Gestión de Robots*: `Robots.tsx`, `RobotStatus.tsx`
    - *Rental (Alquiler)*: `RentalDetailPage.tsx`, `Payment.tsx` (Gestión del proceso de alquiler y pago).
    - *Notificaciones*: `Notifications.tsx`

## 3) Permitir la suscripción del usuario a un plan de precios y adaptar automáticamente la funcionalidad de la aplicación según el plan de precios seleccionado

- *Implementación*:
  Se ha implementado un sistema de **Feature Toggling** basado en el plan de suscripción del usuario.
  - *Gestión de Suscripciones*: El usuario puede seleccionar entre diferentes planes (FREE, INTERMEDIATE, PREMIUM) desde la página de precios.
  - *Feature Toggling*: Se ha creado un hook personalizado `usePricingPlan` que centraliza la lógica de permisos. Este hook devuelve flags (booleanos) que habilitan o deshabilitan funcionalidades en la UI según el plan actual del usuario.

- *Dónde*:
  - *Repositorio*: ([RoboFIS/frontend](https://github.com/RoboFIS/frontend/))
  - *Hook de Lógica (Feature Flags)*: `src/pricing/usePricingPlan.ts` (Calcula permisos como `canCancelRentals`, `canAccessCategory`).
  - *Gestión de Planes*: `src/apps/users/pages/PricingPage.tsx` (Vista para upgrade/downgrade de plan).
  - *Ejemplo de Feature Toggle (Cancelación)*: `src/pages/RentalDetailPage.tsx`
    - Bloqueo visual: Si `!canCancelRentals`, se oculta el botón de cancelar o se muestra deshabilitado con un mensaje de upgrade.
  - *Ejemplo de Feature Toggle (Catálogo de Robots)*: `src/pages/Robots.tsx`
    - Restricción de acceso: Validación de `canAccessCategory(robot.category)` para impedir reservas de robots exclusivos de planes superiores.
