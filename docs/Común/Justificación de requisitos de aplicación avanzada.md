# Justificación de requisitos de aplicación avanzada

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de aplicación avanzada y señala exactamente en qué parte del código se ha realizado cada implementación (en caso de que sea necesario).

---

## 1) Implementación de Add-ons (Paquetes de Tokens)

- *Implementación*:
  Se ha desarrollado una funcionalidad de *Compra de tokens* mediante la adquisición de Paquetes. Estos tokens actúan como la moneda interna de la plataforma para realizar transacciones.
  - *Lógica de Negocio*: La compra se modela como una operación atómica que incrementa el saldo del usuario.
  - *Validación de Paquetes*: El sistema predefine los tipos de Add-ons disponibles (ej. "Pack pequeño 2500 Tokens", "Pack mediano 10000 Tokens") evitando la inyección de valores arbitrarios desde el cliente.

- *Dónde*:
  - *Repositorio*: ([RoboFIS/microservicio-gestionusuario](https://github.com/RoboFIS/microservicio-gestionusuario/))
  - *Controlador*: src/user/interface/http/controllers/users.controller.ts (Endpoint POST /users/:id/tokens/purchase).
  - *Comando y Manejador*:
    - src/users/application/commands/buy-user-tokens.command.ts
    - src/users/application/commands/buy-user-tokens.handler.ts (Contiene la lógica de incremento de saldo).
  - *Dominio*: src/user/domain/entities/user.entity.ts (Propiedad tokens).
  - *Frontend*: src\apps\users\pages\PricingPage.tsx

## 2) Mecanismo de Deshacer Transacciones Distribuidas (Patrón SAGA)

- *Implementación*:
  Para garantizar la *Consistencia Eventual* entre microservicios, se ha implementado el *Patrón SAGA* basado en coreografía (eventos). Este mecanismo permite "deshacer" (compensar) operaciones cuando una parte del proceso distribuido falla.
  - *Escenario de Alquiler*: El flujo de alquiler implica a los servicios de *Rental, Stock y Usuarios. Si la reserva se crea en Rental pero el pago falla en Usuarios, el sistema debe revertir la reserva.
  - *Transacción Compensatoria*:
    1. *Evento de Fallo*: Si el cobro de tokens falla, el servicio de Rental publica un evento de dominio payment.reservation.refund_required.
    2. *Reacción (Compensación)*: El microservicio de *Usuario escucha este evento específico.
    3. *Ejecución*: Al recibir la notificación de fallo en el pago, el *User Service ejecuta automáticamente una lógica de compensación: busca la reserva asociada, la  elimina de las reservas del usuario y devuelve los tokens al usuario.
  - *Idempotencia*: Los handlers de compensación están diseñados para ser idempotentes, asegurando que si el evento de fallo llega duplicado, no cause inconsistencias.

- *Dónde*:
  - *Escucha del Evento de Fallo ([Rental Service](https://github.com/RoboFIS/robofis-reserva/))*: /src/user/interface/messaging/event_listeners/rental-event.listener.ts. (Listener de 'payment.reservation.refund_required').
  - *Lógica de Compensación*: src/rental/application/commands/refund-tokens.handler.ts (Lógica que revierte la reserva).
  - *Emisión del Fallo ([User Service](https://github.com/RoboFIS/microservicio-gestionusuario/))*: src/rental/application/commands/handlers/cancel-rental.handler.ts (Publica el evento si falla la operación).

## 3) Hacer uso de un API Gateway con autenticación

- **Implementación**: Se ha desarrollado una **API Gateway** utilizando el framework NestJS y la librería `http-proxy` para actuar como punto de entrada único (Reverse Proxy) y barrera de seguridad del sistema.
  - **Autenticación Centralizada**: La gateway implementa un mecanismo de **Autenticación Global**. Se utiliza un `JwtAuthGuard` configurado como `APP_GUARD` en el módulo principal, lo que garantiza que **todas** las peticiones entrantes sean interceptadas y validadas contra la estrategia JWT (`JwtStrategy`) antes de ser procesadas o redirigidas. **Excepto aquellas gestionadas por controladores marcados como @Public**.
  - **Mecanismo de Proxy**: El `GatewayController` gestiona el enrutamiento. Utiliza una instancia de `http-proxy` (`this.proxy`) para redirigir las peticiones a los microservicios correspondientes (Usuarios, Rental, Stock, Notificaciones, Robots), manteniendo la transparencia para el cliente (`changeOrigin: true`).

- **Dónde**:
  - Repositorio: ([RoboFIS/robofis-api-gateway](https://github.com/RoboFIS/robofis-api-gateway))
  - Controlador principal y lógica de proxy: `api-gateway/src/gateway/gateway.controller.ts`
  - Configuración de Autenticación Global: `api-gateway/src/app.module.ts`
  - Estrategia de validación JWT: `api-gateway/src/auth/jwt.strategy.ts`
  
---

## 4) Hacer uso de un sistema de comunicación asíncrono mediante un sistema de cola de mensajes para todos los microservicios

- **Implementación**: Se utiliza **RabbitMQ** como broker de mensajería, configurado mediante el módulo de microservicios de **NestJS** (`@nestjs/microservices`).
  - **Tecnología**: El microservicio utiliza un **Topic Exchange** (`robofis.events`) y una cola durable por cada microservicio. Se han implementado bindings manuales en el arranque de los servicios (`main.ts`) para garantizar que la cola reciba eventos de routing keys como `rental.#`, `users.#`, `stock.#` y `status.#`.

- **Dónde**:
  - Configuración de conexión a rabbitmq:
    - ([RoboFIS/Notifications](https://github.com/RoboFIS/Notifications/blob/main/notifications/src/main.ts))
    - ([RoboFIS/stock-microservice](https://github.com/RoboFIS/stock-microservice/blob/main/micro_template/src/main.ts))
    - ([RoboFIS/robofis-reserva](https://github.com/RoboFIS/robofis-reserva/blob/main/micro_alquiler/src/main.ts))
    - ([RoboFIS/microservicio-estado](https://github.com/RoboFIS/microservicio-estado/blob/develop/micro_template/src/main.ts))
    - ([RoboFIS/microservicio-gestionusuario](https://github.com/RoboFIS/microservicio-gestionusuario/blob/main/micro_template/src/main.ts))
