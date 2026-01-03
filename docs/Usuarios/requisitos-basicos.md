
# Documentación de implementación — Requisitos de microservicio básico

Este documento justifica y explica cómo se ha implementado cada uno de los requisitos solicitados en la sección de microservicio básico para el **Servicio de Usuarios y Autenticación**, señalando exactamente en qué parte del código se ha realizado cada implementación.

---

## 1) Backend REST (GET, POST, PUT, DELETE)

- **Implementación**: Se han desarrollado **tres controladores principales** bajo la estrategia de versionado URI (`/api/v1`), separando claramente las responsabilidades de identidad, gestión de clientes y administración interna. La arquitectura sigue el patrón **CQRS**, delegando la lógica compleja a un bus de comandos y consultas.

- **Dónde**:

  ### Autenticación (Seguridad)
  *Archivo:* `src/user/interface/http/controllers/login.controller.ts`
  - `POST /login` → `login`: Validación de credenciales y generación de JWT para **clientes**.
  - `POST /login/staff` → `loginStaff`: Validación y JWT específico para **empleados/admins** con roles de organización.

  ### Gestión de Usuarios (Clientes)
  *Archivo:* `src/user/interface/http/controllers/users.controller.ts`

  * **Público**
      - `POST /users` → `createUser`: Registro de nuevos clientes.

  * **Perfil y Datos**
      - `GET /users/profile` → `getProfile`: Obtención de datos del usuario logueado.
      - `GET /users/:id` → `getUser`: Consulta de detalle (público/admin).
      - `PUT /users/:id/address` → `updateAddress`: Reemplazo completo e idempotente de la dirección.
      - `PUT /users/:id/phone` → `updatePhone`: Reemplazo estricto del recurso teléfono.
      

  * **Lógica de Negocio (Suscripción y Tokens)**
      - `PATCH /users/:id/tier` → `updateTier`: Cambio de plan.
      - `POST /users/:id/tokens/purchase` → `purchaseTokens`: Recarga de saldo.
      - `POST /users/:id/tokens/consume` → `consumeTokens`: Gasto de saldo (interno).
      - `GET /users/:id/credits` → `checkBalance`: Consulta de saldo disponible.
      - `POST /users/:id/tokens/charge` y `/refund`: Operaciones de cobro y devolución.

  * **Administrativo**
      - `GET /users` → `getAllUsers`: Listado global de usuarios.
      - `DELETE /users/:id` → `deleteUser`: Eliminación/Baja de usuario.
      - `POST /users/:id/tokens/refill` → `refillTokens`: Bonificación manual de tokens.
      - `PATCH /users/:id/block` y `/unblock`: Gestión de bloqueos por seguridad.

  ### Gestión de Organización (Staff)
  *Archivo:* `src/org-user/interface/http/org-user.controller.ts`
  - `POST /org-users` → `create`: Alta de nuevos Empleados o Administradores (Solo Admin).
  - `GET /org-users` → `findAll`: Listado de la plantilla (Solo Admin).
  - `DELETE /org-users/:id` → `delete`: Baja de empleados (Solo Admin).

- **Códigos de estado**:
  Se respetan las convenciones HTTP y se documentan vía Swagger (`@ApiResponse`):
  - `201 Created`: Para creación de recursos y generación de tokens de sesión (Login).
  - `200 OK`: Para consultas y actualizaciones exitosas.
  - `400 Bad Request`: Fallos de validación en DTOs o datos inconsistentes.
  - `401 Unauthorized`: Credenciales inválidas en Login o falta de Token en rutas protegidas.
  - `403 Forbidden`: Token válido pero permisos insuficientes (ej: Empleado intentando borrar Staff).
  - `404 Not Found`: Recurso no encontrado.
---

## 2) Mecanismo de autenticación y autorización

- **Concepto General**: El microservicio implementa un sistema de seguridad **Stateless** (sin estado) basado en el estándar **JWT (JSON Web Tokens)**. Actúa como **Proveedor de Identidad (IdP)**, centralizando la validación de credenciales tanto para clientes finales (`Users`) como para el personal de la organización (`OrgUsers`).

- **Flujo y Estrategia**:

  ### Autenticación (AuthN) - "¿Quién eres?"
  * **Doble Estrategia de Validación**: El `AuthService` distingue entre dos tipos de actores al hacer login:
      1.  **Clientes**: Se verifica email y contraseña. Adicionalmente, se aplica una **regla de negocio de seguridad**: si el usuario tiene el flag `isBlocked: true`, el login se rechaza aunque la contraseña sea correcta.
      2.  **Staff**: Se verifica contra el repositorio de `OrgUsers` (Administradores/Empleados) para acceso al Backoffice.
  * **Seguridad de Contraseñas**: Se utiliza `PasswordHasher` con **`bcrypt`** (10 salt rounds), asegurando que las contraseñas nunca se almacenan ni comparan en texto plano.
  * **Generación de Token**: Se firma un JWT con expiración de 1 hora.
      > **Nota técnica sobre el Payload**: Para el Staff, el claim `role` contiene su rol administrativo (`ADMIN`, `EMPLOYEE`). Para los Clientes, el claim `role` contiene su **Nivel de Suscripción** (`FREE_TRIAL`, `INTERMEDIATE`, `PREMIUM`), permitiendo autorización basada en el plan contratado.

  ### Autorización (AuthZ) - "¿Qué puedes hacer?"
  * **Estrategia JWT**: `JwtStrategy` intercepta las peticiones con cabecera `Authorization: Bearer <token>`, verifica la firma criptográfica y extrae los datos (`sub`, `email`, `role`) sin impactar a la base de datos en cada petición.
  * **Control de Acceso (Guards)**:
      - `JwtAuthGuard`: Bloquea peticiones sin token válido (401).
      - `RolesGuard`: Implementa **RBAC**. Compara los metadatos del decorador `@Roles()` del endpoint con el rol/tier extraído del token (403 si no coincide).

- **Dónde (Estructura de Archivos)**:

  * **Lógica de Dominio**
      - `src/user/domain/services/auth-service.ts`: Orquestador principal. Valida credenciales, chequea bloqueos y decide el contenido del token.
      - `src/user/domain/services/password-hasher.service.ts`: Servicio agnóstico de hashing (`bcrypt`).

  * **Infraestructura y Configuración**
      - `src/user/infrastructure/auth/auth.module.ts`: Inyección de dependencias y configuración de `Passport` y `JwtModule`.
      - `src/user/infrastructure/auth/jwt.strategy.ts`: Extracción y validación del Bearer Token.
      - `src/user/infrastructure/auth/auth-config.ts`: Definición de constantes de seguridad (Secret Key, Expiración).

  * **Guardianes y Decoradores**
      - `src/user/infrastructure/auth/jwt-auth.guard.ts`: Guardián de autenticación.
      - `src/user/infrastructure/auth/roles.guard.ts`: Guardián de autorización por roles.
      - `src/user/infrastructure/auth/roles.decorator.ts`: Inyección de metadatos de roles permitidos.

## 3) Frontend con operaciones completas

- **Tecnología y Arquitectura**:
  Se ha desarrollado una **Single Page Application (SPA)** utilizando **React** y **TypeScript**. La arquitectura de navegación se gestiona mediante un controlador de estado centralizado (`onNavigate`), permitiendo transiciones instantáneas entre vistas sin recarga del navegador.

- **Estructura de Vistas y Componentes**:

  ### Área Pública (Autenticación)

  | Componente | Ruta Lógica Mapeada | Descripción Funcional |
  | :--- | :--- | :--- |
  | `ClientAuth.tsx` | `/login` <br /> `/register` | **Portal de Clientes**. Gestiona un formulario dual para inicio de sesión y registro. Implementa decodificación manual de JWT para asegurar la recuperación del `userId` y su almacenamiento seguro en `localStorage`. |
  | `StaffLoginPage.tsx` | `/login/staff` | **Portal Corporativo**. Acceso exclusivo para la organización (`ADMIN` / `EMPLOYEE`). Incluye validación visual de credenciales y redirección automática al panel de gestión. |

  ### Área Privada: Cliente (App Alquiler)

  | Componente | Ruta Lógica Mapeada | Descripción Funcional |
  | :--- | :--- | :--- |
  | `UserDetailsPage.tsx` | `/id` | **Perfil Personal**. Renderizado en modo `isOwnProfile={true}`. <br />• Implementa la lógica **PUT** para la edición atómica de **Teléfono** y **Dirección**.<br />• Visualización de estado de cuenta (Activo/Bloqueado) y fecha de renovación. |
  | `PricingPage.tsx` | `/pricing` | **Suscripciones y Economía**. <br />• Selección de Tiers (`BASIC`, `INTERMEDIATE`, `PREMIUM`) con llamada al backend para cambio de plan.<br />• Compra de paquetes de Tokens (Recargas puntuales). |

  ### Área Privada: Backoffice (Admin/Staff)

  | Componente | Ruta Lógica Mapeada | Descripción Funcional |
  | :--- | :--- | :--- |
  | `UserListPage.tsx` | `/users` | **Dashboard Principal**. <br />• Listado global de usuarios
    ### Seguridad, Gestión de Sesión y Roles

    El frontend implementa una capa de seguridad robusta para gestionar la identidad y los permisos de forma eficiente en el cliente.

    * **Inyección Automática de Credenciales (Axios Interceptors)**
    Se ha configurado un **interceptor global** en la instancia de `axios`. Este middleware intercepta cada petición saliente, verifica si existe un token en `localStorage` e inyecta automáticamente la cabecera `Authorization: Bearer <token>`, garantizando que todas las llamadas al backend estén autenticadas de forma transparente.

    * **Decodificación de JWT en Cliente (`jwt-decode`)**
    Para optimizar el rendimiento y la UX, la aplicación utiliza la librería `jwt-decode` para leer el *payload* del token directamente en el navegador sin realizar peticiones extra al backend:
    * **Extracción de Rol**: Se recupera el claim `role` (`ADMIN`, `EMPLOYEE`, `USER`) para determinar el nivel de privilegio.
    * **Extracción de Identidad (`sub`)**: Se recupera el ID del usuario para validaciones lógicas (ej: evitar que un admin se elimine a sí mismo).

    * **Renderizado Condicional (UI Adaptativa)**
    La interfaz reacciona dinámicamente al rol del usuario logueado:
    * **Ocultación de Elementos**: Botones sensibles (como *"Gestión Staff"* o *"Eliminar Usuario"*) no se renderizan en el DOM si el usuario no tiene el rol `ADMIN`.
    * **Protección de Rutas**: Componentes críticos como `StaffListPage` ejecutan una verificación de seguridad al montarse (`useEffect`). Si el token no contiene el rol adecuado, se fuerza una redirección inmediata.

    * **Gestión de Errores de Sesión**
    El servicio captura proactivamente los errores HTTP `401 Unauthorized` y `403 Forbidden`. En caso de token expirado o inválido, el sistema limpia el almacenamiento local y redirige al usuario a la pantalla de acceso correspondiente para forzar una re-autenticación.


## 4) Despliegue, DevOps y Accesibilidad

- **Estrategia de Contenerización (Docker)**:
  Para garantizar la consistencia entre los entornos de desarrollo, pruebas y producción, la aplicación ha sido completamente "dockerizada".
  - **Imagen del Microservicio**: Se utiliza un `Dockerfile` optimizado (basado en `Node.js 20`) que construye la aplicación NestJS y expone el puerto `3002`.
  - **Portabilidad**: La imagen generada contiene todas las dependencias necesarias, permitiendo desplegar el servicio en cualquier proveedor de nube (AWS, DigitalOcean, Azure) o entorno local que soporte Docker.

- **Pipeline CI/CD (GitHub Actions)**:
  Se ha implementado un flujo de trabajo de **Integración y Entrega Continua** (definido en `.github/workflows/CI-CD Pipeline.yml`) que automatiza el ciclo de vida del software:

  1.  **CI (Continuous Integration)**:
      Cada vez que se realiza un *Push* o *Pull Request* a la rama `main`:
      - Se levanta un entorno virtual (`ubuntu-latest`).
      - Se instalan dependencias y se ejecuta el **Linter** para asegurar la calidad del código.
      - **Testing Automatizado**: El pipeline utiliza **Docker Compose** para levantar un entorno efímero completo (Microservicio + MongoDB + RabbitMQ). Sobre esta infraestructura real se ejecutan tanto los **tests E2E** como los de **integración** (`npm run test:e2e` y `test:int`), garantizando que los cambios no rompen la lógica de negocio ni la conectividad.

  2.  **CD (Continuous Delivery)**:
      Solo si los tests pasan correctamente y el evento es un *Push* a `main`:
      - Se construye la imagen Docker de producción.
      - Se etiqueta (`tag`) con la versión `latest` y el hash del commit (`SHA`).
      - Se publica automáticamente en el registro público **Docker Hub** bajo el repositorio: `fran703/robot-rental-users`.

- **Orquestación de Servicios (Docker Compose)**:
  El despliegue del ecosistema completo se gestiona mediante un archivo `docker-compose.yml`, que orquesta la comunicación entre los tres pilares fundamentales del sistema:
  * **User Service**: La aplicación NestJS (API).
  * **MongoDB**: Base de datos documental persistente.
  * **RabbitMQ**: Broker de mensajería para comunicación asíncrona.
  S.

- **Variables de Entorno (.env)**:
  La configuración sensible (credenciales de base de datos, secretos JWT, URLs de RabbitMQ) se ha desacoplado del código fuente siguiendo la metodología **Twelve-Factor App**, inyectándose en el contenedor en tiempo de ejecución mediante archivos `.env`.


## 5) API Versionada

- **Estrategia de Versionado**:
  Se ha implementado una estrategia de **URI Versioning** (Versionado por ruta), considerada la práctica estándar y más explícita para APIs RESTful modernas. 

- **Configuración Global (`main.ts`)**:
  En el punto de entrada de la aplicación NestJS, se ha configurado un prefijo global y el sistema de versiones para que aplique a todos los controladores por defecto:
  * **Prefijo Global**: `/api`
  * **Versión por Defecto**: `v1`

- **Estructura de los Endpoints**:
  Todas las rutas expuestas siguen estrictamente el siguiente patrón semántico:
  
  `{HOST}:{PORT}/{GLOBAL_PREFIX}/{VERSION}/{RESOURCE}/{ACTION?}`

  **Ejemplos Reales:**
  * `http://localhost:3002/api/v1/users/profile` (Consultar perfil)
  * `http://localhost:3002/api/v1/auth/login` (Login de usuarios)
  * `http://localhost:3002/api/v1/org-users` (Gestión de staff)



## 6) Documentación de la API (Swagger / OpenAPI)

- **Estrategia de Documentación Viva**:
  Para cumplir con el requisito de documentar todas las operaciones, peticiones y respuestas, se ha implementado **Swagger UI (basado en la especificación OpenAPI 3.0)**. Esta solución genera una documentación interactiva que se mantiene siempre sincronizada con el código fuente y respeta la estrategia de versionado (`v1`).

- **Implementación Técnica (`@nestjs/swagger`)**:
  La documentación se genera automáticamente mediante el uso exhaustivo de decoradores en los Controladores y DTOs.
  * **Configuración Base**: En `main.ts`, se utiliza `DocumentBuilder` para definir el título, la descripción y la versión de la API.
  * **Decoradores Utilizados**:
      - `@ApiTags(...)`: Categoriza los endpoints (Ej: "Users", "Auth", "Org-Users").
      - `@ApiOperation({ summary: '...' })`: Describe qué hace cada endpoint en lenguaje natural.
      - `@ApiResponse({ status: 200, ... })`: Documenta los posibles códigos de respuesta HTTP y el formato de los datos devueltos.
      - `@ApiBearerAuth()`: Indica visualmente qué rutas requieren un token JWT y habilita el botón de login en la interfaz.

- **Detalle de Peticiones y Respuestas (Schemas)**:
  Swagger no solo documenta las URLs, sino también la estructura de los datos:
  * **Input (DTOs)**: Se documentan los Data Transfer Objects (ej: `CreateUserDto`) mostrando qué campos son obligatorios y sus validaciones.
  * **Output (Entidades)**: Se muestran los modelos de respuesta, permitiendo al consumidor saber exactamente qué JSON recibirá.

- **Interactividad y Pruebas ("Try it out")**:
  La interfaz permite ejecutar peticiones reales contra el backend directamente desde el navegador, respetando el prefijo de versión:
  1.  El usuario se autentica pulsando el botón **"Authorize"** e introduciendo su Token.
  2.  Rellena los parámetros requeridos.
  3.  Al ejecutar, visualiza la llamada real a `.../api/v1/...`, el cuerpo de la respuesta y las cabeceras.

- **Accesibilidad**:
  * **URL de Documentación**: `http://localhost:3002/api/v1/docs`

## 7) Persistencia con MongoDB (NoSQL)

### 7.1. Elección Tecnológica y Justificación
* **Tecnología**: Se utiliza **MongoDB** gestionado mediante **Mongoose (ODM)**. Esta elección combina la flexibilidad del modelo documental (ideal para persistir objetos anidados complejos como `address` sin JOINS costosos) con la seguridad de esquemas estrictos definidos a nivel de aplicación (tipos, validaciones y valores por defecto).
* **Patrón Arquitectónico**: El sistema sigue una **Arquitectura Hexagonal** combinada con **CQRS**. La capa de persistencia está totalmente desacoplada: el dominio define los contratos (Interfaces/Clases Abstractas) y la infraestructura provee la implementación, permitiendo la inyección de dependencias sin acoplarse al motor de base de datos.

### 7.2. Componentes y Estructura de Archivos

La implementación se distribuye en capas estrictas para garantizar la separación de responsabilidades:

#### A. Contratos del Dominio (Puertos)
*Ubicación: `src/user/domain/repositories/`*
Definen las reglas de negocio para el acceso a datos.
* **`UserRepository.ts` (Clase Abstracta)**: Define el CRUD completo.
* **`IUserCommandRepository.ts`**: Interfaz segregada para operaciones de escritura.
* **`IUserQueryRepository.ts`**: Interfaz segregada para operaciones de lectura pura, utilizada por los Query Handlers.

#### B. Implementación de Infraestructura (Adaptadores)
*Ubicación: `src/user/infrastructure/repositories/`*
Son las clases concretas que interactúan con la librería Mongoose.
* **`MongoUserCommandRepository.ts`**: Implementa la persistencia transaccional. 
* **`MongoUserQueryRepository.ts`**: Implementa la lectura optimizada.

#### C. Definición de Datos y Transformación
*Ubicación: `src/user/infrastructure/repositories/`*
* **`user.schema.ts`**: Definición física de la colección en MongoDB. Configura índices únicos (`email`), enums (`tier`) y sub-documentos.
* **`user.mapper.ts`**: Componente crítico de aislamiento. Traduce bidireccionalmente entre:
    * **Infraestructura**: Documento Mongo con `_id` (ObjectId).
    * **Dominio**: Entidad User con `id` (UUID) y reglas de negocio encapsuladas.

### 7.3. Flujo de Datos

El flujo garantiza que la lógica de negocio nunca dependa de la base de datos:

1.  El **Handler** (CQRS) solicita una operación a través de la abstracción (`UserRepository` o `IUserCommandRepository`).
2.  NestJS inyecta la implementación concreta (**MongoUser...Repository**).
3.  El repositorio usa el **Mapper** para transformar la entidad y delega la operación al modelo de Mongoose.
4.  Los datos se persisten o recuperan de **MongoDB**.


## 8) Validación de Datos (DTOs y Pipes)

- **Estrategia Declarativa**:
  La validación de los datos de entrada se realiza de forma automática y declarativa antes de que la petición llegue siquiera al controlador. Para ello, utilizamos la librería `class-validator` junto con **DTOs (Data Transfer Objects)**, que actúan como contrato estricto de entrada.
    - DTOs: `src/user/application/dtos/*` (p. ej. `create-user.dto.ts`, `update-user-phone.dto.ts`, `update-user-address.dto.ts`)


- **Configuración Global (`ValidationPipe`)**:
  En el archivo `main.ts`, se ha configurado un `ValidationPipe` global que intercepta todas las peticiones HTTP. Esta configuración incluye opciones de seguridad y transformación críticas:

  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 🛡️ Seguridad: Elimina automáticamente propiedades no definidas en el DTO (evita inyección de campos)
      forbidNonWhitelisted: true, // Lanza error si envían datos extra
      transform: true, // Convierte el payload JSON a instancias de las clases DTO
    }),
  );


## 9) Imagen Docker del proyecto

- **Definición (`Dockerfile`)**:
  Toda la configuración se encuentra en el archivo `Dockerfile` ubicado en la raíz del proyecto. Este fichero automatiza la creación del entorno, asegurando que la aplicación funcione igual en local que en producción.

- **Puerto y Acceso**:
  El contenedor está configurado para exponer el puerto **3002**, permitiendo la comunicación externa con la API del microservicio una vez desplegado.

- **Optimización (Multi-Stage Build)**:
  Utilizamos la técnica de construcción en dos etapas: primero se compila el código (TypeScript) y luego se genera una imagen final limpia que solo contiene lo necesario para ejecutarse. Esto reduce el peso y mejora la seguridad.



## 10) Gestión del código fuente: GitHub Flow

- **Metodología y Evidencia**:
  El proyecto sigue la estrategia **GitHub Flow**, un modelo de ramificación ligero ideal para CI/CD.
  * **Funcionamiento**: Se evidencia mediante el uso de **ramas de funcionalidad** efímeras para cada tarea y **Pull Requests** obligatorias para integrar cambios en la rama `main` (que siempre se mantiene desplegable).
  * **Integración**: Cada Pull Request dispara automáticamente las validaciones definidas en los workflows, asegurando que ningún código rompa el build antes de ser fusionado.

- **Dónde (Recursos)**:
  * **Definición del Pipeline**: `.github/workflows/ci-cd-pipeline.yml`
  * **Repositorio del Proyecto**: [https://github.com/RoboFIS/microservicio-gestionusuario]

## 11) Integración Continua (Lint, Tests E2E y Docker)

- **Estrategia de Automatización**:
  Se ha configurado un pipeline en **GitHub Actions** . El flujo se divide en dos trabajos dependientes (`jobs`): uno de verificación exhaustiva y otro de publicación.

- **Fase 1: Verificación y Testing (`build-test-docker`)**:
  Se ejecuta en cada *Push* o *Pull Request* hacia la rama `main`.
  1.  **Instalación Determinista**: Uso de `npm ci` (con caché) para asegurar que las dependencias sean exactas a las del `package-lock.json`.
  2.  **Análisis Estático**: Ejecución de `npm run lint` para validar la calidad sintáctica y el estilo del código.
  3.  **Entorno Efímero (Docker Compose)**: El pipeline no solo corre tests unitarios; **levanta la infraestructura completa** (Microservicio + MongoDB + RabbitMQ) usando `docker compose up -d`.
  4.  **Espera Activa**: Implementa `npx wait-on` para garantizar que el puerto 3002 esté respondiendo antes de lanzar las pruebas.
  5.  **Batería de Tests**:
      * **E2E (Out of Process)**: Peticiones HTTP reales contra el contenedor levantado.
      * **Integración/Unitarios**: Pruebas de lógica interna.
  6.  **Diagnóstico y Limpieza**: Si falla, vuelca los logs del contenedor para depuración (`docker compose logs`) y siempre asegura el apagado de los servicios (`docker compose down`).

- **Fase 2: Entrega Continua (`publish-image`)**:
  Esta etapa es **condicional**: solo se ejecuta si la Fase 1 pasó exitosamente y estamos en la rama `main`.
  1.  **Autenticación**: Login seguro en Docker Hub usando secretos de repositorio.
  2.  **Versionado y Publicación**: Construye la imagen optimizada y la sube al registro con dos etiquetas (tags):
      * `:latest`: Para la última versión estable.
      * `:sha`: (Hash del commit) Para trazabilidad histórica exacta.

- **Dónde**:
  * **Archivo de configuración**: `.github/workflows/ci-cd-pipeline.yml`


## 12) Estrategia de Testing (Pruebas Automatizadas)

- **Enfoque: Pirámide de Testing**:
  Para garantizar la robustez del microservicio, se sigue una estrategia de "Pirámide de Testing" implementada con **Jest**.

- **Niveles de Prueba Implementados**:

  1.  **Pruebas End-to-End (E2E)** (`npm run test:e2e`):
      * **Objetivo**: Validar el sistema completo como una "caja negra".
      * **Estrategia**: Se levanta un entorno real con Docker (App + MongoDB + RabbitMQ). Las pruebas lanzan peticiones HTTP reales (POST, GET) contra el puerto `3002` utilizando **Supertest** y verifican que la respuesta y los códigos de estado (201, 400, 404) sean correctos.
      * **Valor**: Garantiza que el flujo completo, desde el controlador hasta la base de datos, funciona correctamente en un entorno idéntico a producción.

  2.  **Pruebas de Integración** (`npm run test:int`):
      * **Objetivo**: Verificar la comunicación entre capas (ej: Handler -> Repositorio -> Base de Datos).
      * **Estrategia**: Validan que los repositorios escriben y leen correctamente de MongoDB y que las reglas de negocio complejas (como la validación de duplicados) funcionan al interactuar con la infraestructura.

  3.  **Pruebas Unitarias** (implícitas en desarrollo):
      * **Objetivo**: Probar componentes aislados (Value Objects, utilidades, lógica pura).
      * **Estrategia**: Uso de mocks para aislar dependencias externas y ejecución ultrarrápida.

- **Infraestructura de Testing (Entornos Efímeros)**:
  Como se evidencia en el Pipeline de CI/CD, **no se utilizan bases de datos en memoria** ni simulaciones frágiles para los tests críticos.
  * **Flujo**: Antes de los tests, se ejecuta `docker compose up`. Esto crea un entorno limpio y desechable.
  * **Beneficio**: Asegura que si los tests pasan, el código funcionará en producción, eliminando falsos positivos por diferencias entre entornos.

