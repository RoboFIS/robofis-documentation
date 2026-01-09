---
title: Documentación de implementación — Microservicio de Stock
sidebar_position: 1
---

# Documentación de implementación — Microservicio de Stock

Este documento justifica y describe cómo se han implementado los distintos requisitos funcionales y técnicos del microservicio de Stock, indicando en cada caso la justificación del mismo y en qué parte del código se encuentra la implementación.

El objetivo de este documento es servir como referencia técnica para comprender el diseño, la arquitectura y las decisiones tomadas durante el desarrollo del microservicio.

### Nivel de acabado del microservicio

Nos presentamos al **nivel de acabado de 10 puntos**.

### Cobertura por nivel
- [x] Microservicio básico: cumplido.
- [x] Microservicio avanzado: cumplido (8/6).
- [x] Aplicación basada en microservicios básica: cumplida.
- [x] Aplicación basada en microservicios avanzada: cumplida (4/4).

### Funcionalidades avanzadas de la aplicación (4/4)

La justificación detallada de estas funcionalidades se encuentra en el apartado común.

- [x] Incorporación de add-ons al modelo de precios, permitiendo la adquisición de paquetes adicionales de tokens.
- [x] Implementación de un API Gateway con capacidades avanzadas, incluyendo autenticación JWT centralizada, gestión de roles y enrutado de peticiones.
- [x] Comunicación asíncrona entre todos los microservicios mediante un sistema de colas de mensajes basado en RabbitMQ.
- [x] Implementación de un mecanismo de compensación para transacciones distribuidas mediante el patrón SAGA, permitiendo la reversión controlada de operaciones.

Antes de pasar a una definición más extensa de la documentación, se definirá en este apartado los apartados relevantes para el nivel de acabado presentado por este microservicio:

**Microservicio básico**:
- Se ha implementado API rest con respuesta de códigos adecuada
- Se ha implementado un mecanismo de autenticación con jwt
- Existe un frontend que permite hacer las operaciones básicas
- El microservicio está desplegado y es accesible desde la nube
- La API está versionada
- Se ha usado MongoDB como base de datos
- Los datos son validados con DTOs antes de ser almacenados en la base de datos. También se hace uso de mongoose.
- Existe una imagen de docker del proyecto subida aquí: https://hub.docker.com/r/marsoldia/stock-microservice
- El código fuente está subido a este repositorio: https://github.com/RoboFIS/stock-microservice
- Existe un sistema de CICD usando GitHub Actions en este proyecto
- Se han realizado pruebas con Jest tanto In-process como out-of-process

**Microservicio avanzado**:
- Existe un frotend común creado con rutas y navegación para este microservicio.
- Se ha usado CQRS para poder optimizar más fácilmente las lecturas y las escrituras y tener una separación lógica de las mismas.
- Se ha consumido de una API externa: https://openrouteservice.org/
- Se ha implementado el patrón rate limit al hacer uso de servicios externos
- Se ha implementado el patrón circuit breaker en la comunicación con otro microservicio
- Se ha implementado un mecanismo de autenticación basado en JWT
- Se ha usado RabbitMQ para realizar una comunicación asíncrona con otros microservicios
- Se ha implementado el patrón Unit Of Work para garantizar la consistencia de transacciones en la base de datos

**Otros a tener en cuenta**:
- Se ha usado bullmq para la programación de jobs de gestión de las reservas

---

## 1) Responsabilidad del microservicio

- **Descripción**:  
  Este microservicio pertenece a un proyecto cuya temática es el alquiler de robots inteligentes. La división en microservicios del mismo es la siguiente:
  - **Usuarios**: Se encarga de la gestión de los usuarios clientes y empleados de la aplicación así como su acceso a la misma.
  - **Notificaciones**: Se encarga de los avisos al usuario de los eventos relevantes en la aplicación.
  - **Estado de robots**: Se encarga de la gestión de los propios robots, imitando los posibles eventos que podrían enviar los sensores de los mismos.
  - **Alquiler**: Se encarga de la gestión de las reservas de robots por parte del usuario.
  - **Stock** (nuestro microservicio): Es responsable de la gestión de la ubicación física de los robots, permitiendo a los empleados gestionar las diferentes zonas donde pueden operar los robots y las estaciones donde se encuentran en ese momento.  
    Actúa como fuente de la verdad sobre la ubicación de un robot en todo momento (si se encuentra en disposición de ser alquilado o está siendo usado por un cliente).

- **Principales responsabilidades**:
    - Permitir a los empleados la creación de zonas donde pueden operar los robots.
    - Permitir a los empleados la creación de estaciones dentro de estas zonas donde los robots se encontrarán físicamente hasta ser requeridos por un cliente y necesitar un desplazamiento.
    - Permitir a los empleados la creación de demandas de stock, las cuales consisten en peticiones para la inyección de una cantidad de robots dentro de una estación o para el movimiento de un robot entre estaciones. Estas demandas sirven para popular la población de robots, por lo que es el medio que se ha decidido tanto para popular este microservicio como el microservicio de estados de robots.
    - Gestionar la disponibilidad de un robot para su alquiler (un robot se considera disponible cuando no está alquilado ni roto, su batería está cargada y se ecuentra en ese momento dentro de una estación dentro de la zona en la que un cliente ha pedido dicho robot)
    - Reaccionar a eventos de otros microservicios para cumplir estas responsabilidades así como publicar eventos para la comunicación síncrona entre los microservicios necesarios.

- **Microservicios con los que mantiene comunicación**:
  - Alquiler: Alquiler pregunta de forma síncrona a Stock acerca de la disponibilidad de robots para un cliente. También se comunica de forma asíncrona para realizar reservas sobre stock.
  - Estado de robots: Se comunica de forma asíncrona con Stock para informar de la ubicación del robot o sus posibles fallos: Ha llegado a casa del cliente, se ha salido de su zona destinada, ha sufrido una avería... Stock también se comunica de forma síncrona con este microservicio para popularlo con robots (imitando la llegada a las estaciones de robots del almacén), para indicar que un robot ha sido archivado (decommission) o para indicarle el movimiento de robots entre estaciones.
  - Notifications: Se comunica de forma asíncrona con Stock para comunicar a un usuario cuando se ha dado una orden de salida de un robot de la estación (dispatch)

---

## 2) Arquitectura general

- **Estilo arquitectónico**:
    - Clean Architecture.
    - Arquitectura basada en eventos.
    - CQRS para separación de lectura y escritura.
    - Domain-Driven Design (DDD).
    - Repository pattern.
    - SOLID.
    - **Resumen del flujo**: Los controllers se harán cargo de las llamadas http entrantes y mandarán commands a través del command bus siguiendo la arquitectura CQRS. Los command handlers se encargarán de procesar la lógica y hacer las validaciones oportunas. Entonces se usará los repositorios pertinentes para persistir las entidades en base de datos. Los repositorios siempre devolverán entidades de dominio.

- **Capas principales**:
    - **Domain**: entidades, enums, interfaces y reglas de negocio.
    - **Application**: commands, command handlers y orquestación.
    - **Infrastructure**: persistencia MongoDB, mensajería RabbitMQ y comunicación con servicios externos.
    - **Interface**: listeners de eventos, controllers para peticiones http.

---

## 3) Backend REST

- **Implementación**:  
  El microservicio expone endpoints REST para las operaciones administrativas de los empleados. Pese a que están expuestos a una APIGateway se ha implementado validación JWT para una doble validación.

- **Dónde**:
    - Controladores en: `src/stock/interface/http/*`
    - Activación de versionado en `main.ts`

- **Convenciones**:
    - Uso de DTOs con validación. Uso de `@ApiProperty` para documentación en Swagger.
    - Excepciones de NestJS para códigos HTTP estándar.
    - Versionado de API haciendo uso del decorador `@Controller` de nest.

- **Endpoints expuestos**:
  Los endpoints están documentados con swagger y, desde local, se pueden visualizar en http://localhost:3001/api/v1/docs/stock, pero se indicarán también a continuación:
  - **Zonas**:
    - POST `/zones` -> Creación de una nueva zona
    - GET `/zones` -> Muestra todas las zonas creadas
    - GET `/zones/{id}` -> Muestra el detalle de una zona
    - PUT `/zones/{id}` -> Edita una zona existente
    - DELETE `/zones/{id}` -> Borra una zona existente
  - **Estaciones**:
    - GET `/zones/{zoneId}/stations` -> Muestra todas las estaciones de una zona
    - POST `/stations` -> Crea una nueva estación
    - GET `/stations` -> Muestra todas las estaciones creadas
    - GET `/stations/{id}` -> Muestra el detalle de una estación
    - PUT `/stations/{id}` -> Edita una estación existente
    - DELETE `/stations/{id}` -> Borra una estación existente
  - **Demandas de stock**:
    - POST `/stock-demands` -> Crea una nueva demanda de stock
    - GET `/stock-demands` -> Muestra todas las demandas de stock (con filtros)
    - PATCH `/stock-demands/{id}` -> Actualiza el estado de una demanda de stock (PENDING, IN_PROGRESS, COMPLETED o CANCELLED). Cuando una demanda de stock pasa a completed es cuando se crean o mueven los robots.
    - DELETE `/stock-demands/{id}` -> Borra una demanda de stock existente
  - **Disponibilidad**:
    - GET `/availability` -> Indica los robots disponibles en una zona
  - **Robots**:
  - - GET `/robots` -> Muestra todos los robots creados
    - GET `/robots/{id}` -> Muestra el detalle de un robot
    - GET `/robots/station/{stationId}` -> Muestra un robot dada una estación
    - POST `/robots/{id}/decommission` -> Los robots no se borran, sino que se archivan. Este es el endpoint dedicado a ello

---

## 4) Comunicación entre microservicios (RabbitMQ)

- **Implementación**:  
  El microservicio consume eventos publicados por otros servicios a través de RabbitMQ. También publica eventos haciendo uso de un event-bus para la publicación de eventos de dominio, tratando de seguir una correcta arquitectura basada en eventos y DDD.

- **Exchange**:
    - `robofis.events`

- **Eventos consumidos**:
    - `status.robot.change.station`
    - `status.robot.change.battery`
    - `status.robot.mode.maintentance`
    - `status.robot.change.zone`
    - `status.robot.delivered`
    - `rental.reservation.created`
    - `rental.reservation.cancelled`

-  **Eventos publicados**:
  - `stock.reservation.confirmed`
  - `stock.reservation.rejected`
  - `stock.robot.dispatch.authorized`
  - `stock.robot.dispatched`

- **Dónde**:
    - Listener principal:  
      `src/stock/interface/messaging/event_listeneres/stock-events.listener.ts`
    - Publisher, domain event bus y rabbit service:
      - `src/common/messaging/internal-event-publisher.service.ts`
      - `src/common/messaging/domain-event-bus.ts`
      - `src/common/services/rabbitmq.service.ts`
    - Configuración del módulo de rabbitmq (configuración de bindings, retry y dlq):
      - `src/stock/infrastructure/rabbitmq`
    - Eventos de dominio:
      - `src/stock/domain/events`

- **Convenciones**:
    - Validación estricta de DTOs.
    - Mensajes inválidos producen error y pueden ir a DLQ.
    - El listener no contiene lógica de negocio, solo delega en commands.

---

## 5) Domain Driven Design
En este a partado se explicarán las diferentes entidades y reglas de negocio que se han seguido para la creación de este microservicio.
Nota: Los validadores están puestos en la capa de aplicación porque no son validaciones sobre el dominio.


### Zone

- **Entidad principal**: `ZoneEntity`

- **Reglas clave**:
    - Una zona está conformada por un conjunto de puntos que crean un polígono y dentro de ella pueden existir stations
    - Una zona solo puede ser borrada si las estaciones que contiene no tienen robots asignados

- **Dónde**:
    - Entidad: `src/stock/domain/entities/zone.entity.ts`
    - Enums: `src/stock/domain/enums/*`

### Station

- **Entidad principal**: `StationEntity`

- **Reglas clave**:
  - Una station pertenece a una zona, ergo en su creación su coordenada tiene que pertenecer al interior del polígono que conforma la zona
  - Una station solo puede ser borrada si no tiene robots asignados

- **Dónde**:
  - Entidad: `src/stock/domain/entities/station.entity.ts`
  - Enums: `src/stock/domain/enums/*`

### Robot

- **Entidad principal**: `RobotEntity`

- **Reglas clave**:
  - La entidad de robot representa a los robots con atributos útiles para stock: su localización, su nivel de batería, su disponibilidad...etc
  - Un robot pertenece a una estación que, a su vez, pertenece a una zona
  - Un robot puede estar disponible, en uso, reservado o no disponible por diferentes motivos
  - Un robot puede ser movido entre estaciones a través de demandas de stock de tipo movement
  - Un robot solo puede operar dentro de su zona
  - Un robot no puede ser borrado, ya que lo estamos tratando como una entidad física que posee nuestra empresa ficticia. En cambio, puede ser archivado (decommission)

- **Dónde**:
  - Entidad: `src/stock/domain/entities/robot.entity.ts`
  - Enums: `src/stock/domain/enums/*`

### Stock Demand

- **Entidad principal**: `StockDemandEntity`

- **Reglas clave**:
  - Una demanda de stock es un mecanismo que imita la llegada a una station de robots de nuestra fábrica ficticia o el movimiento de los mismos entre estaciones
  - Una demanda puede servir tanto para hacer inyecciones de inventario o mover robots entre estaciones
  - Las demandas pueden tener diferentes estados (PENDING, IN_PROGRESS, COMPLETED o CANCELLED). Cuando pasan a estado COMPLETED es cuando se crean robots en el sistema.

- **Dónde**:
  - Entidad: `src/stock/domain/entities/stock-reservation.entity.ts`
  - Enums: `src/stock/domain/enums/*`

### Stock Reservation

- **Entidad principal**: `StockReservationEntity`

- **Reglas clave**:
  - Una reserva en stock hace referencia a cómo gestiona stocks las reservas de inventario por parte de los clientes (en este caso, el microservicio de alquiler)
  - Debe guardar toda la información necesaria sobre esa reserva, cuándo y dónde debe realizarse
  - Permite al sistema controlar la lógica de reservas de un robot.
  - Una reserva puede ser instantánea, a futuro o periódica. Las instáneas tratarán de dar una reserva de robot al momento y las reservas a futuros y periódicas, tratarán de hacer una reserva de robot más adelante.
  - Las reservas pueden ser canceladas. Una reserva ya confirmada no es cancelable, puesto que el robot ya se ha puesto en marcha.

- **Dónde**:
  - Entidad: `src/stock/domain/entities/stock-reservation.entity.ts`
  - Enums: `src/stock/domain/enums/*`

---

## 6) Commands y Command Handlers (CQRS)

- **Implementación**:
    - Cada evento externo se traduce en un `Command`.
    - La lógica de negocio vive exclusivamente en los `CommandHandler`.
    - Los comandos siguen una estructura similar al dominio, por lo tanto están divididos en reservations, robots, stations, stock-demands y zones

- **Dónde**:
    - Commands: `src/stock/application/commands/*`

---

## 7) Persistencia de datos (MongoDB)

- **Base de datos**: MongoDB (NoSQL)

- **Implementación**:
    - Uso de Mongoose para el mapeo objeto-documento.
    - Repositorios como adaptadores de infraestructura.
    - Uso de repositorios de lectura y escritura para correcta implementación de CQRS.
    - Creación de migraciones para inicialización de schemas.

- **Dónde**:
    - Schema: `src/stock/infrastructure/mongo/schemas/*`
    - Repositorio: `src/stock/infrastructure/repositories/*`

---

## 8) Validación de datos

- **Implementación**:
    - Validación de payloads entrantes antes de ejecutar lógica de dominio
    - Validaciones de reglas de negocio usando reglas

- **Dónde**:
    - DTOs de eventos: `src/stock/application/dtos/*`
    - Validación en listeners y controladores.
    - Validación de reglas de negocio: `src/stock/application/validators`

---

## 9) Gestión de errores y consistencia

- **Estrategia**:
    - Los errores de dominio o errores de reglas de negocio lanzan excepciones, que son capturadas en los controladores y convertidas en errores estándar.
    - Los mensajes inválidos no se procesan.
- **Unit of work**:
  - Se ha decidido usar el patrón Unit of work para evitar inconsistencia en las transacciones hacia la base de datos. Así, cuando varias entidades son simultáneamente guardadas, se asegura su atomicidad.

- **Dónde**:
  - `stock/infrastructure/mongo/mongo-session-context.ts`
  - `stock/infrastructure/mongo/mongo-unit-of-work.ts`


## 10) Tests

- **Tipos de tests**:
    - Unitarios: dominio y command handlers.
    - E2E: listeners con RabbitMQ real y MongoDB en memoria (out of process).
    - Integración: Jobs y, en general, servicios que se integran con otros.
    - Se ha creado una factoría para los tests que genera una app usando MongoMemoryServer, el rabbit real usando una cola exclusiva para tests y un servicio con express que imita el comportamiento del microservicio de estado de robots a la hora de hacer peticiones síncronas para realizar correctamente los test out of process de una forma segura.

- **Dónde**:
    - Unit tests: `test/stock/unit/*.spec.ts`
    - E2E tests (out of process): `test/stock/e2e/*`
    - Integration tests: `test/stock/integration/*`
    - Generación de MongoMemoryServer para los tests: `test/jest.global-setup.ts`, `test/jest.global-teardown.ts`
    - Factoría de app para tests con RabbitMQ y MongoDB en memoria: `test/utils/test-app.factory.ts`
    - Servicio express imitando el comportamiento del micro de estados de robots: `test/utils/fake-robot-state.service.ts`
    - Módulo para el uso del MongoMemoryServer en la factoría: `test/utils/fake_modules/fake.mongo.module.ts`

- **Qué validan**:
    - Flujos completos de eventos.
    - Persistencia real.
    - Cambios de estado esperados.

---

## 11) Docker, despliegue y git

- **Implementación**:
    - Se ha creado un workflow para GitHub Flow y documentación asociada al mismo, para seguir la metodología de CICD
    - Existe un dockerfile preparado para ser usado en entornos de producción
    - Existe un repositorio donde se ha seguido el flujo de git standard para este proyecto https://github.com/RoboFIS/stock-microservice

- **CI/CD**:
  - Lint
  - Tests
  - Build
  - Imagen Docker

- **Dónde**:
    - `Dockerfile` para entornos de producción
    - `Dockerfile.dev` para local
    - Workflow: `.github/workflows/cicd.yml`. Con documentación en `ci-cd.md`

---

## 12) Servicios externos

- **Implementación**:
  - Se ha usado un servicio externo https://api.openrouteservice.org/ para enviar al microservicio de alquiler el tiempo medio que tardará un robot en llegar a casa del cliente. Este servicio está compuesto de un wrap que implementa el patrón rate limit
  - La aplicación también tiene comunicación síncrona con el servicio de estado de robots, para lo cual se ha implementado el patrón de circuitBreaker junto a rate_limit para evitar el colapso del microservicio en caso de caída

- **Patrones usados**:
  - Circuit Breaker
  - Rate Limit

- **Dónde**:
  - OpenRoute: `stock/application/services/rate-limited-routing.service.ts`, `stock/infrastructure/services/open-route.routing.service.ts`
  - Servicio para llamadas síncronas a estado de robot: `stock/services/robot-state.client.ts`, para implementar el patrón se ha hecho uso de la librería opossum.

---

## 12) Autenticación

- **Implementación**:
  - Aunque la ApiGateway es la encargada de la autenticación, se ha implementado (aunque no usado) una posible doble validación que podría añadirse a los endpoints, para asegurar de que solamente los usuarios administradores o empleados son los que están realizando peticiones. No se ha usado porque se ha considerado que no era necesario ya que los endpoints solo están expuestos a la ApiGateway. Se ha decidido implementar la funcionalidad debido a los requisitos básicos del proyecto.

- **Dónde**:
  - `common/infrastructure/auth/*`, `common/infrastructure/decorators`, `common/infrastructure/guards`

## 13) Jobs

- **Implementación**:
  - Para gestionar las reservas, se han implementado una serie de jobs haciendo uso de bullmq que se lanzan diariamente y se programan para los momentos de realización de las reservas. Es importantes tenerlos en cuenta a la hora del flujo.

- **Dónde**:
  - `stock/infrastructure/jobs/*`
