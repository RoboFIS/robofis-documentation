# Documentación de implementación — Requisitos de microservicio avanzados

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados, abarcando tanto la funcionalidad base como las **extensiones arquitectónicas avanzadas** para el **Servicio de Usuarios y Autenticación**, señalando exactamente en qué parte del código se ha realizado cada implementación.

---

## 1) Un mínimo de 20 pruebas de componente implementadas incluyendo escenarios positivos y negativos

- **Implementación**:
  El sistema cuenta con una batería de más de **25 pruebas automatizadas** que cubren la lógica de dominio, la aplicación (CQRS) y la integración completa de infraestructura. Se ha utilizado **Jest** como motor de ejecución y **Supertest** para las pruebas HTTP, garantizando la robustez del sistema ante entradas válidas e inválidas.

- **Desglose de Escenarios Implementados**:

  ### A. Pruebas Unitarias de Componente (Domain & Application)
  Se ha aislado la lógica de negocio utilizando *Mocks* y *Spies* para validar el comportamiento de los componentes individuales sin depender de la base de datos.

  1.  **Entidades de Dominio (`User` Entity)**:
      * *(Positivo)* Creación de usuario con valores por defecto (Tokens iniciales, Tier `FREE_TRIAL`).
      * *(Positivo)* Actualización de Tier (`updateTier`) y cálculo correcto de fecha de renovación.
      * *(Positivo)* Recarga de tokens (`addTokens`).
      * *(Positivo)* Gestión de estado interno para alquileres activos (Materialized View).

  2.  **Servicios de Dominio (`PasswordHasher`, `AvatarService`, `AuthService`)**:
      * *(Positivo)* Hashing seguro de contraseñas y validación correcta (`compare`).
      * *(Negativo)* `AuthService` retorna `null` o lanza `UnauthorizedException` ante credenciales incorrectas o usuarios bloqueados.
      * *(Positivo)* `AvatarService` genera URLs de DiceBear (SVG) y valida la respuesta HTTP (mock de Axios).
      * *(Resiliencia)* `AvatarService` implementa un **Fallback** silencioso: si la API externa falla (Error 500/Timeout), el servicio devuelve la URL calculada sin romper el flujo.

  3.  **Manejadores CQRS (Handlers)**:
      * *(Positivo)* `CreateUserHandler` persiste la entidad y publica eventos (`EventPublisher`).
      * *(Negativo)* **Control de Duplicados**: Se valida que se lance `ConflictException` si se intenta registrar un email ya existente.
      * *(Negativo)* **Validación de Existencia**: `GetUserHandler` y `ConsumeUserTokensHandler` lanzan `NotFoundException` si el ID proporcionado no existe.
      * *(Positivo)* `ConsumeUserTokensHandler` decrementa saldo y confirma la transacción atómica.

  ### B. Pruebas Out-of-Process (Integración Estricta / E2E)
  Se ha implementado una suite de **Integración Real** que levanta la aplicación completa, conectándose a instancias reales de **MongoDB** y **RabbitMQ** (via Docker/TestContainers).

  1.  **Flujo HTTP & Persistencia**:
      * Registro de Usuario (`POST /users`) y verificación inmediata de persistencia en MongoDB.
      * Autenticación Real: Obtención de Token JWT válido vía `/auth/login` y uso del mismo para peticiones protegidas (Update Address/Phone).
  2.  **Event-Driven Testing (RabbitMQ)**:
      * **Verificación de Publicación (Spy Queue)**: Al actualizar datos del perfil, el test realiza *polling* a una cola espía en RabbitMQ para asegurar que el evento `user.address.updated` ha sido emitido correctamente al bus.
      * **Consumo de Eventos Externos**: Se simula la publicación de un evento `rental.reservation.created` en el Exchange y se verifica (consultando la DB) que el microservicio de Usuarios reacciona actualizando su array de `activeRentals`.

- **Dónde**:
  * **Unitarias**: `test/integration/*.spec.ts`.
  * **E2E**: `test/e2e/app.e2e.spec.ts` (Archivo único con setup/teardown de infraestructura MongoDB y RabbitMQ).
  * **Configuración**: `test/jest-e2e.json` y scripts de `package.json`.




## 2) Implementar un frontend con rutas y navegación

- **Enfoque de Integración (Frontend como Cliente API)**:
  Se ha desarrollado una interfaz de usuario (SPA) usando `react-router-dom` cuya función principal es actuar como **cliente consumidor de la API REST** del microservicio. La arquitectura de navegación no es arbitraria, sino que se ha diseñado específicamente para reflejar y validar los **Casos de Uso** definidos en el Backend (Identidad, Gestión de Perfil, Economía y Administración).

- **Arquitectura de Navegación**:
  Para gestionar los flujos de usuario y administrador de forma segura, se ha implementado un **Orquestador de Estado Centralizado** en el componente raíz (`App.tsx`).
  * **Funcionamiento**: Una máquina de estados (`currentPage`) determina qué vista se renderiza. Esto permite proteger las rutas administrativas (`admin-*`) y gestionar las redirecciones post-login sin exponer URLs vulnerables.

- **Mapeo de Vistas y Endpoints (Traza Completa)**:
  A continuación se relaciona cada pantalla del frontend con los endpoints reales definidos en `user.service.ts` que consumen el microservicio:

| Pantalla / Estado (Frontend) | Funcionalidad de Negocio | Endpoint Consumido (Backend) |
| :--- | :--- | :--- |
| **Login / Register** | Autenticación y Registro de clientes | `POST /auth/login` <br /> `POST /users` |
| **Admin Login** | Acceso al Backoffice (Staff) | `POST /auth/login/staff` |
| **Dashboard / Perfil** | Consulta de datos del usuario logueado | `GET /users/profile` |
| **My Profile (Edición)** | Modificación de datos y Baja de cuenta | `PUT /users/:id/address` <br /> `PUT /users/:id/phone` <br /> `DELETE /users/:id` |
| **Pricing Page** | Cambio de Plan (Tier) y Compra de Tokens | `PATCH /users/:id/tier` <br /> `POST /users/:id/tokens/purchase` |
| **Admin Users** | Listado global de usuarios (Backoffice) | `GET /users` |
| **Admin Staff** | Gestión de empleados (Listado, Creación y Despidos) | `GET /org-users` <br /> `POST /org-users` <br /> `DELETE /org-users/:id` |
| **Admin User Details** | Gestión de bloqueos y recargas manuales | `PATCH /users/:id/block` <br /> `POST /users/:id/tokens/refill` |

- **Implementación Técnica**:
  * **Cliente HTTP y Seguridad (`user.service.ts`)**: Se utiliza la librería **Axios** para la comunicación asíncrona. Se ha configurado un **Interceptor de Peticiones** que inyecta automáticamente el Token JWT (`Bearer ${token}`) en la cabecera `Authorization` de cada llamada, garantizando que el frontend respete la seguridad *stateless* del backend.
  * **Orquestador (`App.tsx`)**: Actúa como controlador frontal. Utiliza un `switch` exhaustivo para renderizar los componentes de negocio (`<ClientAuth>`, `<UserDetailsPage>`, `<StaffListPage>`) según el estado de la navegación.
  * **Protección de Rutas**: Al iniciar la aplicación, un efecto (`useEffect`) valida la existencia del token. Si el usuario intenta acceder a vistas privadas sin credenciales, el sistema fuerza la redirección al estado `login`.

- **Dónde**:
  * **Lógica de Rutas**: `frontend/src/App.tsx` (Configuración del orquestador de vistas).
  * **Cliente HTTP**: `frontend/src/services/user.service.ts` (Configuración de Axios, Interceptores y métodos del API).



## 3) Patrón Materialized View (Estado de otros microservicios)

- **Implementación**:
  Se ha utilizado el patrón **Materialized View** (Vista Materializada) para mantener internamente una referencia parcial del estado del *Microservicio de Alquileres*. En lugar de almacenar la información completa de la reserva, el Servicio de Usuarios guarda únicamente una lista de **IDs de reservas activas** dentro de la propia entidad `User`. Esto permite conocer el estado de disponibilidad del usuario sin realizar peticiones HTTP síncronas a otros servicios.

- **Mecanismo de Sincronización**:
  La actualización de esta vista local se realiza mediante **Eventos de Dominio** asíncronos a través de RabbitMQ:
  1.  **Recepción de Eventos**: El microservicio escucha eventos como `rental.reservation.created` o `rental.reservation.returned`.
  2.  **Actualización Local**:
      * Al iniciarse un alquiler, se añade el ID de la reserva al array `activeRentals` del usuario.
      * Al finalizarse, se elimina dicho ID del array.
  3.  **Consulta**: El endpoint `GET /users` devuelve el usuario con esta lista ya actualizada, permitiendo al frontend saber si el usuario tiene reservas vigentes simplemente verificando si el array contiene elementos.

- **Dónde**:
  * **Escucha de Eventos (Infrastructure)**: Archivo `src/user/infrastructure/messaging/event_listeners/rental-event.listener.ts`.
      * Contiene los métodos decorados con `@EventPattern` que se suscriben a los tópicos de RabbitMQ .
      * Su responsabilidad es transformar el payload del evento y despachar el comando correspondiente al Bus.
  * **Comandos y Manejadores (Application)**:
      * **Commands**: Archivos `add-rental-to-user.command.ts` y `remove-rental-from-user.command.ts`. Encapsulan la intención de modificar el estado (añadir o quitar un ID).
      * **Handlers**: Archivos `add-rental-to-user.handler.ts` y `remove-rental-from-user.handler.ts`. Ejecutan la lógica de negocio: recuperar el usuario, actualizar el array `activeRentals` y persistir los cambios.
  * **Persistencia**: Archivo `src/user/infrastructure/repositories/user.schema.ts`.
      * Se ha añadido la propiedad `activeRentals` (Array de Strings) al esquema de la base de datos.
  * **Uso en Frontend**: Archivo `frontend/src/apps/users/pages/UserListPage.tsx`.
      * Se utiliza la longitud del array (`activeRentals.length`) para mostrar visualmente el estado (ej. indicador de "Usuario con reservas activas").


## 4) Consumo de API externa a través del backend

- **Implementación**:
  Cumpliendo con el requisito de integración de servicios de terceros, se ha implementado la comunicación con la **API de DiceBear** para la generación procedural de avatares. Esta integración se realiza estrictamente desde el backend utilizando un cliente HTTP (`Axios`), asegurando que la lógica de generación, verificación y asignación de recursos externos esté centralizada en el servidor y no dependa del cliente.

- **Estrategia de Consumo**:
  La integración se encapsula en un servicio de dominio especializado que garantiza la robustez del proceso:
  1.  **Construcción Determinista**: Se genera una URL única utilizando el email del usuario como "semilla" (seed), lo que garantiza que el mismo usuario siempre obtenga la misma identidad visual.
  2.  **Verificación de Disponibilidad**: Antes de asignar el avatar, el backend realiza una petición **GET real** al servicio externo. Solo si la API responde con un estado `200 OK`, se procede a utilizar la URL; en caso contrario, el sistema maneja el fallo de forma controlada.
  3.  **Persistencia en Alta (CQRS)**: La URL validada se inyecta en la entidad `User` durante el proceso de creación (Command Handler), quedando almacenada permanentemente en la base de datos.

- **Dónde**:

  * **Servicio de Integración (Cliente HTTP)**
  *Archivo:* `src/user/domain/services/avatar-service.ts`
  - Contiene la lógica de conexión con `api.dicebear.com`. Utiliza `axios.get(url)` para validar la respuesta del servidor externo antes de devolver la cadena de texto.

  * **Orquestación (Command Handler)**
  *Archivo:* `src/user/application/commands/create-user.handler.ts`
  - Dentro del flujo transaccional `execute`, se invoca al servicio de avatares para obtener la URL justo antes de fabricar la entidad `User` y persistirla, asegurando que ningún usuario se cree sin imagen de perfil.


## 5) Implementar un mecanismo de autenticación basado en JWT

- **Implementación**:
  Se ha implementado un sistema de autenticación *stateless* (sin estado) basado en el estándar **JSON Web Token (JWT)** utilizando la librería `Passport`. Este mecanismo garantiza que el backend no necesite almacenar sesiones en memoria, delegando la validación de identidad en la criptografía del token. Adicionalmente, se ha integrado un servicio de **Hashing** (`bcrypt`) para asegurar que las contraseñas nunca se almacenen ni transiten en texto plano.

- **Lógica de Autenticación y Roles**:
  El servicio de autenticación implementa una lógica condicional robusta para manejar la seguridad:
  1.  **Validación Dual**: El sistema distingue entre **Clientes** (`User`) y **Staff** (`OrgUser`), verificando sus credenciales contra repositorios distintos según el origen de la petición.
  2.  **Seguridad de Acceso**: Antes de emitir el token, se verifica no solo la contraseña, sino también el estado de la cuenta. Si el usuario tiene el flag de bloqueo activo, el sistema deniega el acceso con una excepción de no autorizado, impidiendo el login aunque la contraseña sea correcta.
  3.  **Construcción del Payload**: El token incluye dinámicamente el rol en su carga útil. Para clientes se inscribe su nivel de suscripción (ej: `PREMIUM`) y para empleados su rol organizativo (ej: `ADMIN`), permitiendo a los Guards proteger rutas eficazmente basándose en estos datos.

- **Dónde**:

  * **Lógica de Negocio y Emisión de Tokens**
  *Archivo:* `src/user/domain/services/auth-service.ts`
  - Centraliza la validación. Detecta si el login es de un Cliente o un Empleado, verifica el hash de la contraseña y comprueba si el usuario está bloqueado antes de firmar el JWT.

  * **Estrategia de Verificación (Passport)**
  *Archivo:* `src/user/infrastructure/auth/jwt.strategy.ts`
  - Implementación de la estrategia que intercepta las peticiones entrantes, extrae el token de la cabecera `Authorization: Bearer` y decodifica el payload para inyectar el usuario en el contexto de la petición.

  * **Seguridad de Credenciales (Hashing)**
  *Archivo:* `src/user/domain/services/password-hasher.service.ts`
  - Servicio de dominio desacoplado que utiliza **bcrypt** (con 10 rondas de sal) para hashear contraseñas, asegurando que sean irreversibles en caso de brecha de seguridad.

  * **Guardia de Seguridad**
  *Archivo:* `src/user/infrastructure/auth/jwt-auth.guard.ts`
  - Clase que extiende el `AuthGuard` estándar de NestJS para proteger los endpoints privados en los controladores, rechazando cualquier petición que no lleve un token válido.

## 6) Implementar mecanismos de gestión de la capacidad como throttling

- **Implementación**:
  Para proteger la disponibilidad del microservicio y mitigar ataques de fuerza bruta o denegación de servicio (DoS), se ha implementado un mecanismo de **Rate Limiting** (limitación de tasa) utilizando el módulo nativo `@nestjs/throttler`. Esta capa de seguridad intercepta el tráfico entrante y restringe el número de peticiones que una misma dirección IP puede realizar en una ventana de tiempo determinada.

- **Configuración de la Política**:
  Se ha optado por una estrategia de **Protección Global** y restrictiva, aplicada por defecto a todos los endpoints de la API sin necesidad de configurar cada controlador individualmente. Los parámetros definidos son:
  1.  **Ventana de Tiempo (TTL)**: 60 segundos.
  2.  **Límite de Peticiones (Limit)**: 20 peticiones por IP.
  *Comportamiento:* Si un cliente supera este umbral, el servidor bloquea temporalmente el acceso respondiendo automáticamente con el código de estado `429 Too Many Requests` y la cabecera `Retry-After`.

- **Dónde**:

  * **Configuración Global del Módulo**
  *Archivo:* `src/app.module.ts`
  - Se importa y configura el módulo de throttling en la raíz de la aplicación definiendo los límites de tiempo y cantidad. Además, se utiliza el token de inyección `APP_GUARD` para aplicar el `ThrottlerGuard` a nivel global, asegurando que todas las rutas del sistema estén protegidas por defecto sin excepción.

## 7) Extensiones al microservicio: Arquitectura CQRS

- **Implementación**:
  Como mejora arquitectónica avanzada extra, se ha implementado el patrón **CQRS (Command Query Responsibility Segregation)** a nivel de infraestructura. A diferencia de un diseño clásico donde un único repositorio gestiona todas las operaciones (CRUD), el sistema define **dos canales de acceso a datos totalmente segregados** para todas las entidades del sistema (`User` y `OrgUser`). Esta separación se hace explícita desde las interfaces base compartidas hasta la implementación concreta en MongoDB.

- **Mecanismo de Segregación**:
  La arquitectura se basa en contratos estrictos definidos en el núcleo compartido que obligan a separar las responsabilidades en dos vías:
  1.  **Write Side (Comandos)**: Gestionado por implementaciones de `ICommandRepository`. Estos repositorios se encargan exclusivamente de la persistencia transaccional (crear, actualizar, eliminar). Trabajan con Agregados de Dominio completos y utilizan mappers complejos para garantizar la integridad de las reglas de negocio.
  2.  **Read Side (Queries)**: Gestionado por implementaciones de `IQueryRepository`. Estos repositorios están optimizados únicamente para la recuperación de datos. Permiten realizar búsquedas rápidas y proyecciones directas, evitando la sobrecarga de reconstruir todo el grafo de objetos del dominio cuando solo se necesita leer información.

- **Dónde**:

  * **Definición de Contratos (Interfaces Base y de Dominio)**
  *Rutas:* `src/shared/domain`, `src/user/domain/repositories` y `src/org-user/domain/repositories`
  - La arquitectura nace en el módulo compartido (`Shared`), donde se definen las interfaces genéricas de Comando y Consulta. Posteriormente, los dominios de Usuario y Staff extienden estos contratos para definir sus operaciones específicas.

  * **Implementación de Infraestructura (Mongo)**
  *Rutas:* `src/user/infrastructure/repositories` y `src/org-user/infrastructure/repositories`
  - Existen clases físicas separadas para implementar estos contratos tanto para usuarios como para empleados.

  * **Inyección de Dependencias (IoC)**
  *Ruta:* `src/user/infrastructure/nest_modules/user.module.ts`
  - La segregación se materializa en el módulo principal mediante la definición de proveedores distintos. Se utiliza la inyección de dependencias para vincular la interfaz abstracta con su implementación concreta, asegurando que los manejadores de comandos reciban el repositorio de escritura y los servicios de vista reciban el de lectura.
  

--- 

## 7) Hacer uso de un API Gateway con autenticación. (Requisito de aplicación avanzada)


- **Implementación**: Se ha desarrollado una **API Gateway** utilizando el framework NestJS y la librería `http-proxy` para actuar como punto de entrada único (Reverse Proxy) y barrera de seguridad del sistema.
  - **Autenticación Centralizada**: La gateway implementa un mecanismo de **Autenticación Global**. Se utiliza un `JwtAuthGuard` configurado como `APP_GUARD` en el módulo principal, lo que garantiza que **todas** las peticiones entrantes sean interceptadas y validadas contra la estrategia JWT (`JwtStrategy`) antes de ser procesadas o redirigidas. **Excepto aquellas gestionadas por controladores marcados como @Public**.
  - **Mecanismo de Proxy**: El `GatewayController` gestiona el enrutamiento. Utiliza una instancia de `http-proxy` (`this.proxy`) para redirigir las peticiones a los microservicios correspondientes (Usuarios, Rental, Stock, Notificaciones, Robots), manteniendo la transparencia para el cliente (`changeOrigin: true`).

- **Dónde**:
  - Repositorio: ([RoboFIS/robofis-api-gateway](https://github.com/RoboFIS/robofis-api-gateway))
  - Controlador principal y lógica de proxy: `api-gateway/src/gateway/gateway.controller.ts`
  - Configuración de Autenticación Global: `api-gateway/src/app.module.ts`
  - Estrategia de validación JWT: `api-gateway/src/auth/jwt.strategy.ts`


---


## 8) Hacer uso de un sistema de comunicación asíncrono mediante un sistema de cola de mensajes para todos los microservicios. (Requisito de aplicación avanzada)


- **Implementación**: Se utiliza **RabbitMQ** como broker de mensajería, configurado mediante el módulo de microservicios de **NestJS** (`@nestjs/microservices`).
  - **Tecnología**: El microservicio utiliza un **Topic Exchange** (`robofis.events`) y una cola durable (`user_events`). Se han implementado bindings para garantizar que la cola reciba eventos de routing keys de `rental.#` y `payment.#` .
  - **Resiliencia**: Los listeners implementan un mecanismo de `safeAck` (Acknowledgement manual seguro) para evitar la pérdida de mensajes en caso de fallo en el procesamiento.


- **Listeners Implementados**:

   **Rental Domain** (`rental-microservice-listener.ts`):
      - `rental.reservation.created`: Añade la ID de la reserva a las reservas activas del usuario.
      - `rental.reservation.cancelled`: Cancela la reserva y elimina la ID de la reserva de las reservas activas del usuario.
      - `rental.reservation.returned`: Se da por acabada la reserva y se elimina la ID de las reservas activas del usuario. 
      - `payment.reservation.refund_required`: Este evento es lanzado cuando hay un error en la transacción devolviendo los tokens al usuario.



- **Dónde**:
  - Repositorio: ([RoboFIS/microservicio-gestionusuario](https://github.com/RoboFIS/microservicio-gestionusuario))
  - Configuración: `src/main.ts`.
  - Listeners: Directorio `/src/user/interface/messaging/event_listeners/rental-event.listener.ts.`

## 15) Implementación de Add-ons (Paquetes de Tokens)

- **Implementación**:
  Se ha desarrollado una funcionalidad de **Compra de tokens** mediante la adquisición de Paquetes. Estos tokens actúan como la moneda interna de la plataforma para realizar transacciones.
  - **Lógica de Negocio**: La compra se modela como una operación atómica que incrementa el saldo del usuario. 
  - **Validación de Paquetes**: El sistema predefine los tipos de Add-ons disponibles (ej. "Pack pequeño 2500 Tokens", "Pack mediano 10000 Tokens") evitando la inyección de valores arbitrarios desde el cliente.

- **Dónde**:
  - **Controlador**: `src/user/interface/http/controllers/users.controller.ts` (Endpoint `POST /users/:id/tokens/purchase`).
  - **Comando y Manejador**:
    - `src/users/application/commands/buy-user-tokens.command.ts`
    - `src/users/application/commands/buy-user-tokens.handler.ts` (Contiene la lógica de incremento de saldo).
  - **Dominio**: `src/user/domain/entities/user.entity.ts` (Propiedad `tokens`).
  - **Frontend**: `src\apps\users\pages\PricingPage.tsx`


## 16) Mecanismo de Deshacer Transacciones Distribuidas (Patrón SAGA)

- **Implementación**:
  Para garantizar la **Consistencia Eventual** entre microservicios, se ha implementado el **Patrón SAGA** basado en coreografía (eventos). Este mecanismo permite "deshacer" (compensar) operaciones cuando una parte del proceso distribuido falla.
  - **Escenario de Alquiler**: El flujo de alquiler implica a los servicios de *Rental*, *Stock* y *Usuarios*. Si la reserva se crea en *Rental* pero el pago falla en *Usuarios*, el sistema debe revertir la reserva.
  - **Transacción Compensatoria**:
    1.  **Evento de Fallo**: Si el cobro de tokens falla, el servicio de Rental publica un evento de dominio `payment.reservation.refund_required`.
    2.  **Reacción (Compensación)**: El microservicio de *Usuario* escucha este evento específico.
    3.  **Ejecución**: Al recibir la notificación de fallo en el pago, el *User Service* ejecuta automáticamente una lógica de compensación: busca la reserva asociada, la  elimina de las reservas del usuario y devuelve los tokens al usuario.
  - **Idempotencia**: Los handlers de compensación están diseñados para ser idempotentes, asegurando que si el evento de fallo llega duplicado, no cause inconsistencias.

- **Dónde**:
  - **Escucha del Evento de Fallo (Rental Service)**: `/src/user/interface/messaging/event_listeners/rental-event.listener.ts.` (Listener de `'payment.reservation.refund_required'`).
  - **Lógica de Compensación**: `src/rental/application/commands/refund-tokens.handler.ts` (Lógica que revierte la reserva).
  - **Emisión del Fallo (User Service)**: `src/rental/application/commands/handlers/cancel-rental.handler.ts` (Publica el evento si falla la operación).