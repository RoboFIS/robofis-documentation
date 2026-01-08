# Documentación de implementación — Requisitos avanzados del microservicio

Este documento justifica y explica cómo se han implementado las características avanzadas del microservicio de alquiler de robots, incluyendo patrones de resiliencia, control de tráfico y arquitectura de software.

---

## 1) Rate Limiting (Limitación de Tasa)

### ¿Qué es?

El **Rate Limiting** es un mecanismo de control que limita el número de peticiones que un cliente puede realizar a la API en un período de tiempo determinado. Esto previene abusos, ataques DDoS y garantiza un uso justo de los recursos del servidor.

### Implementación en el proyecto

Se ha implementado rate limiting en **dos niveles**:

#### A) Rate Limiting a nivel de API (Endpoints HTTP)

- **Tecnología**: `@nestjs/throttler` - Módulo oficial de NestJS para throttling
- **Configuración global**:

  - `micro_alquiler/src/rental/infraestructure/rate-limiting/rate-limiting.config.ts`
    - **Default**: 100 peticiones por minuto (60000ms)
    - **Stock Service**: 50 peticiones/min
    - **Payment Service**: 30 peticiones/min
    - **Geo Service**: 20 peticiones/min

- **Módulo**: `micro_alquiler/src/rental/infraestructure/rate-limiting/rate-limiting.module.ts`

  - Configuración con `ThrottlerModule.forRoot()` (líneas 12-18)
  - Exporta guards personalizados para servicios externos

- **Aplicación en controladores**: `micro_alquiler/src/rental/interface/http/controllers/rental.controller.ts`
  - Guard global: `@UseGuards(ThrottlerGuard)` (línea 29)
  - Límites específicos por endpoint con decorador `@Throttle`:
    - POST `/rentals`: 10 req/min (línea 43)
    - GET `/rentals/:id`: 30 req/min (línea 75)
    - GET `/rentals/user/:userId`: 20 req/min (línea 88)
    - DELETE `/rentals/:id`: 15 req/min (línea 103)
    - PUT `/rentals/:id`: 15 req/min (línea 115)

#### B) Rate Limiting para servicios externos

- **Guards personalizados**: `micro_alquiler/src/rental/infraestructure/rate-limiting/rate-limiting.guard.ts`
  - `StockServiceRateLimitGuard`
  - `PaymentServiceRateLimitGuard`
  - `GeoServiceRateLimitGuard`

### Beneficios

- ✅ Protección contra ataques de denegación de servicio (DoS)
- ✅ Distribución equitativa de recursos entre usuarios
- ✅ Prevención de sobrecarga del servidor
- ✅ Límites diferenciados según criticidad del endpoint

---

## 2) Circuit Breaker (Interruptor de Circuito)

### ¿Qué es?

El **Circuit Breaker** es un patrón de resiliencia que previene que fallos en cascada afecten a todo el sistema. Cuando un servicio externo falla repetidamente, el circuit breaker "abre el circuito" y deja de intentar llamadas, devolviendo respuestas fallback inmediatamente.

### Estados del Circuit Breaker

1. **CLOSED** (Cerrado): Funcionamiento normal, las peticiones pasan
2. **OPEN** (Abierto): Servicio fallando, peticiones bloqueadas, se usa fallback
3. **HALF_OPEN** (Semi-abierto): Periodo de prueba para verificar si el servicio se recuperó

### Implementación en el proyecto

- **Tecnología**: `opossum` - Librería robusta de circuit breaker para Node.js

#### Servicio centralizado

- **Archivo**: `micro_alquiler/src/rental/infraestructure/circuit-breaker/circuit-breaker.service.ts`
  - Método `createCircuitBreaker()` (líneas 10-38): Crea y configura breakers
  - Gestión de eventos: `open`, `close`, `failure` con logging (líneas 24-34)
  - Método `getAllStats()` (líneas 43-59): Obtiene métricas de todos los breakers

#### Configuración

- **Archivo**: `micro_alquiler/src/rental/infraestructure/circuit-breaker/circuit-breaker.config.ts`
  - **timeout**: 5000ms - Tiempo máximo de espera por petición
  - **errorThresholdPercentage**: 50% - Porcentaje de errores para abrir circuito
  - **resetTimeout**: 30000ms - Tiempo antes de intentar cerrar circuito (HALF_OPEN)

#### Uso en adaptadores HTTP

- **Ejemplo**: `micro_alquiler/src/rental/infraestructure/adapters/http-stock.adapter.ts`
  - Creación del breaker en constructor (líneas 33-41):
    - Timeout personalizado: 6000ms para Stock Service
    - Nombre: `'stock-service-circuit-breaker'`
  - **Fallback** (líneas 43-46): Retorna `{ available: false }` cuando el circuito está abierto
  - Método protegido: `makeRequest()` (líneas 80-107)

#### Monitoreo

- **Controlador de métricas**: `micro_alquiler/src/rental/infraestructure/circuit-breaker/circuit-breaker.controller.ts`
  - Endpoint: `GET /health/circuit-breaker/stats` (líneas 10-17)
  - Retorna estado (OPEN/CLOSED/HALF_OPEN) y estadísticas de cada breaker

#### Módulo global

- **Archivo**: `micro_alquiler/src/rental/infraestructure/circuit-breaker/circuit-breaker.module.ts`
  - Decorador `@Global()` (línea 5): Disponible en toda la aplicación
  - Exporta `CircuitBreakerService` para uso en adaptadores

### Beneficios

- ✅ Previene fallos en cascada cuando servicios externos fallan
- ✅ Respuestas rápidas mediante fallback (sin esperar timeout)
- ✅ Auto-recuperación cuando el servicio externo se estabiliza
- ✅ Métricas en tiempo real del estado de servicios externos

---

## 3) Throttling (Control de Flujo)

### ¿Qué es?

**Throttling** es una técnica de control de flujo que limita la velocidad a la que se procesan peticiones. Mientras que Rate Limiting cuenta peticiones en ventanas de tiempo, Throttling controla la tasa de procesamiento.

### Implementación en el proyecto

En este proyecto, **Throttling y Rate Limiting se implementan juntos** usando `@nestjs/throttler`, que combina ambas técnicas:

#### Configuración por endpoint

- **Archivo**: `micro_alquiler/src/rental/interface/http/controllers/rental.controller.ts`
  - Cada endpoint tiene límites específicos según su carga esperada:
    - **Operaciones de escritura** (POST, PUT, DELETE): Límites más restrictivos (10-15 req/min)
    - **Operaciones de lectura** (GET): Límites más permisivos (20-30 req/min)

#### Parámetros de throttling

El decorador `@Throttle({ default: { limit: X, ttl: Y } })` define:

- **limit**: Número máximo de peticiones
- **ttl**: Ventana de tiempo en milisegundos (Time To Live)

Ejemplo en POST `/rentals` (línea 43):

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })
```

Significa: Máximo 10 peticiones cada 60 segundos por cliente.

#### Guard global

- `@UseGuards(ThrottlerGuard)` (línea 29): Aplica throttling a todo el controlador
- Los decoradores `@Throttle` específicos sobrescriben la configuración global

### Diferencia con Rate Limiting

Aunque en NestJS se implementan juntos:

- **Rate Limiting**: Cuenta total de peticiones en ventana de tiempo
- **Throttling**: Controla la tasa/velocidad de procesamiento, puede incluir colas

### Beneficios

- ✅ Previene sobrecarga del servidor
- ✅ Garantiza calidad de servicio (QoS)
- ✅ Protección granular por tipo de operación
- ✅ Respuestas HTTP 429 (Too Many Requests) cuando se excede el límite

---

## 4) Patrón CQRS + DDD (Domain-Driven Design)

### ¿Qué es CQRS?

**CQRS** (Command Query Responsibility Segregation) es un patrón arquitectónico que **separa las operaciones de escritura (Commands) de las operaciones de lectura (Queries)**.

### ¿Qué es DDD?

**DDD** (Domain-Driven Design) es un enfoque de diseño de software que pone el **dominio del negocio** en el centro de la arquitectura, usando entidades, value objects, repositorios y servicios de dominio.

### Implementación CQRS en el proyecto

#### A) Separación Commands vs Queries

**Commands (Escritura)**:

- **Ubicación**: `micro_alquiler/src/rental/application/commands/`
- **Ejemplos**:
  - `create-rental.command.ts` (líneas 3-13): Comando inmutable con datos de creación
  - `cancel-rental.command.ts`
  - `update-rental.command.ts`
  - `assign-robot.command.ts`

**Queries (Lectura)**:

- **Ubicación**: `micro_alquiler/src/rental/application/queries/`
- **Ejemplos**:
  - `get-rental-by-id.query.ts` (líneas 1-3): Query simple con ID
  - `get-rentals-by-user.query.ts`

#### B) Command Handlers

- **Ubicación**: `micro_alquiler/src/rental/application/commands/handlers/`
- **Ejemplo**: `create-rental.handler.ts`
  - Decorador `@CommandHandler(CreateRentalCommand)` (línea 17)
  - Implementa `ICommandHandler<CreateRentalCommand>` (línea 18)
  - Método `execute()` (líneas 30-137): Lógica de negocio compleja
    - Validación de geocodificación (líneas 35-39)
    - Verificación de stock (líneas 45-57)
    - Cálculo de precio (líneas 62-64)
    - Validación de saldo (líneas 66-68)
    - Persistencia (línea 84)
    - Publicación de eventos (líneas 129-133)

#### C) Query Handlers

- **Ubicación**: `micro_alquiler/src/rental/application/queries/handlers/`
- **Ejemplo**: `get-rental-by-id.handler.ts`
  - Decorador `@QueryHandler(GetRentalByIdQuery)` (línea 6)
  - Implementa `IQueryHandler<GetRentalByIdQuery>` (línea 7)
  - Método `execute()` (líneas 10-19): Solo lectura, sin efectos secundarios
  - Usa `RentalReadRepository` (línea 8) - Repositorio de solo lectura

#### D) Integración con NestJS CQRS

- **Módulo**: `micro_alquiler/src/rental/infraestructure/nest_modules/app.module.ts`

  - Importa `CqrsModule` (línea 2, 53)
  - Registra todos los handlers como providers (líneas 90-102)

- **Controlador**: `micro_alquiler/src/rental/interface/http/controllers/rental.controller.ts`
  - Inyecta `CommandBus` y `QueryBus` (líneas 34-35)
  - Ejecuta comandos: `this.commandBus.execute(command)` (línea 61)
  - Ejecuta queries: `this.queryBus.execute(query)` (línea 79)

### Implementación DDD en el proyecto

#### A) Capas de la arquitectura

```
domain/          → Lógica de negocio pura (sin dependencias de infraestructura)
application/     → Casos de uso (Commands, Queries, DTOs)
infrastructure/  → Implementaciones técnicas (DB, HTTP, messaging)
interface/       → Puntos de entrada (Controllers, Event Listeners)
```

#### B) Entidades de Dominio

- **Ubicación**: `micro_alquiler/src/rental/domain/entities/`
- **Ejemplo**: `rental.entity.ts` (líneas 3-38)
  - Clase `Rental` con lógica de dominio
  - Método de negocio: `assignRobot()` (líneas 29-37)
    - Valida estado antes de asignar robot
    - Actualiza estado a `ASSIGNED`
    - Actualiza timestamp

#### C) Repositorios (Patrón Repository)

**Interfaces de dominio** (contratos):

- `micro_alquiler/src/rental/domain/repositories/rental-write.repository.ts`
- `micro_alquiler/src/rental/domain/repositories/rental-read.repository.ts`

**Implementación de infraestructura**:

- `micro_alquiler/src/rental/infraestructure/repositories/mongo-rental.repository.ts`
  - Implementa ambas interfaces (línea 10)
  - Mapeo dominio ↔ persistencia:
    - `toDomain()` (líneas 46-68): Convierte documento Mongo a entidad
    - `toPersistence()` (líneas 71-92): Convierte entidad a documento Mongo

**Binding en módulo** (`app.module.ts`, líneas 108-115):

```typescript
{
  provide: RentalWriteRepository,
  useClass: MongoRentalRepository,
}
```

Esto permite cambiar la implementación sin modificar la lógica de negocio.

#### D) Ports & Adapters (Arquitectura Hexagonal)

**Ports (Interfaces de dominio)**:

- `micro_alquiler/src/rental/domain/ports/`
  - `stock-service.port.ts` (líneas 1-7): Interface `IStockService`
  - `payment-service.port.ts`: Interface `IPaymentService`
  - `geo-service.port.ts`: Interface `IGeoService`

**Adapters (Implementaciones de infraestructura)**:

- `micro_alquiler/src/rental/infraestructure/adapters/`
  - `http-stock.adapter.ts`: Implementa `IStockService` con HTTP
  - `http-payment.adapter.ts`: Implementa `IPaymentService` con HTTP
  - `openstreetmap.adapter.ts`: Implementa `IGeoService` con API externa

**Binding en módulo** (`app.module.ts`, líneas 118-129):

```typescript
{
  provide: STOCK_SERVICE,
  useClass: HttpStockAdapter,
}
```

#### E) Schemas de Persistencia (separados del dominio)

- **Ubicación**: `micro_alquiler/src/rental/infraestructure/database/schemas/folder.schemas.ts`
- **Schema Mongoose** (líneas 5-52): Definición técnica de persistencia
  - Decoradores `@Prop`, `@Schema`
  - Timestamps automáticos (línea 5)
  - Índices para optimización (líneas 57-60)

**Separación clara**: Las entidades de dominio NO conocen Mongoose, solo el repositorio hace la traducción.

### Beneficios de CQRS + DDD

**CQRS**:

- ✅ Separación clara de responsabilidades (lectura vs escritura)
- ✅ Optimización independiente de queries y commands
- ✅ Escalabilidad: Diferentes bases de datos para lectura/escritura
- ✅ Código más mantenible y testeable

**DDD**:

- ✅ Lógica de negocio centralizada en el dominio
- ✅ Independencia de frameworks y tecnologías
- ✅ Facilita cambios de infraestructura sin afectar el negocio
- ✅ Lenguaje ubicuo entre desarrolladores y expertos del dominio
- ✅ Testing simplificado (dominio sin dependencias externas)

---

## 5) Implementar un mecanismo de autenticación basado en JWT o equivalente

- **Implementación**:
  - **Delegación de Autenticación**: Siguiendo un enfoque de arquitectura de microservicios eficiente, **no se ha implementado un mecanismo de autenticación interno** (como validación de tokens JWT o gestión de sesiones) dentro del código fuente del microservicio de reservas.
  - **Justificación**: Se ha optado por centralizar toda la lógica de seguridad en el **API Gateway** (ver apartado 7). Esto descarga al microservicio de la responsabilidad de validar credenciales, permitiéndole centrarse exclusivamente en su dominio. El microservicio asume que cualquier petición que recibe proviene de la pasarela y, por tanto, ya ha sido autenticada y autorizada.
- **Dónde**:
  - No aplica (ausencia intencional de código de autenticación en el microservicio).

---

## 6) Consumo de APIs Externas

### ¿Qué es?

El **consumo de APIs externas** permite que el microservicio se integre con servicios de terceros o con otros microservicios del sistema, extendiendo su funcionalidad sin tener que implementar toda la lógica internamente.

### APIs Externas Consumidas en el Proyecto

El microservicio de alquiler consume **3 tipos de APIs externas**:

#### A) OpenStreetMap API (Geocodificación)

**Propósito**: Convertir direcciones de texto en coordenadas geográficas (latitud/longitud) para validar zonas de cobertura.

**Implementación**: `micro_alquiler/src/rental/infraestructure/adapters/openstreetmap.adapter.ts`

**Características**:

- **API pública**: Nominatim de OpenStreetMap (línea 29)
  - URL: `https://nominatim.openstreetmap.org/search`
- **Headers personalizados** (líneas 58-60):
  ```typescript
  'User-Agent': 'RoboFIS Rental Service/1.0 (Academic Project)'
  ```
  Requerido por la política de uso de OpenStreetMap

**Parámetros de la petición** (líneas 61-65):

- `q`: Dirección a geocodificar
- `format`: 'json' para respuesta estructurada
- `limit`: 1 para obtener solo el mejor resultado

**Respuesta procesada** (líneas 76-80):

```typescript
{
  lat: parseFloat(result.lat),
  lng: parseFloat(result.lon),
  formattedAddress: result.display_name
}
```

**Protección con Circuit Breaker** (líneas 34-47):

- Timeout: 5000ms
- Fallback: Retorna `null` si el servicio falla
- Logging de errores para monitoreo

**Uso en el flujo de negocio**:

- `create-rental.handler.ts` (línea 36): Valida la dirección antes de crear la reserva
- Si la geocodificación falla, la reserva se rechaza con error 400

---

#### B) Stock Service API (Microservicio Interno)

**Propósito**: Verificar disponibilidad de robots en una zona geográfica específica.

**Implementación**: `micro_alquiler/src/rental/infraestructure/adapters/http-stock.adapter.ts`

**Endpoint consumido**:

- `GET ${STOCK_SERVICE_URL}/stock/availability` (línea 55)

**Parámetros** (líneas 60-64):

- `robotType`: Categoría del robot (CLEANING, KITCHEN, SHOPPING)
- `lat`: Latitud de entrega
- `lng`: Longitud de entrega

**Respuesta esperada** (líneas 70-73):

```typescript
{
  available: boolean,
  zoneId: string
}
```

**Circuit Breaker configurado** (líneas 33-46):

- Timeout: **6000ms** (más alto que otros servicios por mayor complejidad)
- Nombre: `'stock-service-circuit-breaker'`
- **Fallback crítico**: Retorna `{ available: false }` (línea 45)
  - Política conservadora: Si no podemos verificar stock, no permitimos la reserva

**Método protegido** (líneas 80-107):

- `makeRequest()`: Lógica real de HTTP envuelta por el circuit breaker
- Manejo de errores con logging detallado

**Uso en el flujo de negocio**:

- `create-rental.handler.ts` (líneas 46-57): Validación crítica antes de confirmar reserva
- Si no hay stock disponible, se lanza `BadRequestException`

---

#### C) Payment/Users Service API (Microservicio Interno)

**Propósito**: Gestionar el saldo de tokens de los usuarios (verificar, cobrar, reembolsar).

**Implementación**: `micro_alquiler/src/rental/infraestructure/adapters/http-payment.adapter.ts`

**Endpoints consumidos**:

1. **Verificar saldo** (línea 134):

   - `GET ${USER_SERVICE_URL}/users/{userId}/credits`
   - Respuesta: `{ available_credits: number }`

2. **Cobrar tokens** (línea 159):

   - `POST ${USER_SERVICE_URL}/users/{userId}/credits/charge`
   - Body (líneas 163-172):
     ```typescript
     {
       amount: number,
       concept: string,
       reservation_id: string,
       metadata: {
         source: 'rental_microservice',
         charge_type: 'robot_rental',
         transaction_date: string
       }
     }
     ```

3. **Reembolsar tokens** (línea 189):
   - `POST ${USER_SERVICE_URL}/users/{userId}/credits/refund`
   - Body (líneas 193-197):
     ```typescript
     {
       amount: number,
       reason: string,
       reservation_id: string
     }
     ```

**Circuit Breakers múltiples** (uno por operación):

1. **Check Balance Breaker** (líneas 32-45):

   - Timeout: 4000ms
   - Fallback: Retorna `false` (sin saldo)

2. **Charge Breaker** (líneas 56-69):

   - Timeout: 5000ms
   - Fallback: Retorna `false` + log CRITICAL
   - Operación crítica: Fallo aquí cancela la reserva

3. **Refund Breaker** (líneas 79-92):
   - Timeout: 5000ms
   - Fallback: Retorna `false` + log CRITICAL
   - Importante para compensaciones

**Uso en el flujo de negocio**:

- `create-rental.handler.ts`:
  - Línea 67: Verifica saldo antes de crear reserva
  - Líneas 88-99: Cobra tokens después de guardar en BD
  - Si el cobro falla, cancela la reserva y lanza excepción

---

### Tecnología Utilizada

**Cliente HTTP**: `@nestjs/axios` (wrapper de Axios para NestJS)

- Importado en `app.module.ts` (línea 57): `HttpModule`
- Inyectado en adaptadores: `HttpService` (línea 2 de cada adapter)

**Conversión de Observables a Promises**:

```typescript
import { firstValueFrom } from "rxjs";

const response = await firstValueFrom(this.httpService.get(url, { params }));
```

Esto convierte el Observable de Axios a una Promise para usar async/await.

---

### Configuración de URLs

**Variables de entorno** (`.env`):

```env
STOCK_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GEO_SERVICE_URL=https://nominatim.openstreetmap.org/search
```

**Inyección de configuración**:

- Todos los adaptadores usan `ConfigService` de `@nestjs/config`
- Ejemplo (líneas 27-29 de `openstreetmap.adapter.ts`):
  ```typescript
  this.apiUrl =
    this.configService.get<string>("GEO_SERVICE_URL") ||
    "https://nominatim.openstreetmap.org/search";
  ```

---

### Patrón de Diseño: Ports & Adapters

**Separación de responsabilidades**:

1. **Ports (Interfaces de dominio)**:

   - `domain/ports/stock-service.port.ts`: Define `IStockService`
   - `domain/ports/payment-service.port.ts`: Define `IPaymentService`
   - `domain/ports/geo-service.port.ts`: Define `IGeoService`

2. **Adapters (Implementaciones HTTP)**:
   - `infrastructure/adapters/http-stock.adapter.ts`: Implementa `IStockService`
   - `infrastructure/adapters/http-payment.adapter.ts`: Implementa `IPaymentService`
   - `infrastructure/adapters/openstreetmap.adapter.ts`: Implementa `IGeoService`

**Ventaja**: Se puede cambiar la implementación (ej: de HTTP a gRPC) sin modificar la lógica de negocio.

---

### Manejo de Errores

**Estrategia de 3 capas**:

1. **Try-Catch en adaptadores** (líneas 81-84 de `openstreetmap.adapter.ts`):

   - Captura errores de red/timeout
   - Logging detallado con stack trace
   - Retorna valores seguros (`null` o `false`)

2. **Circuit Breaker**:

   - Previene reintentos innecesarios cuando el servicio está caído
   - Fallback automático después de threshold de errores

3. **Validación en handlers** (líneas 37-39 de `create-rental.handler.ts`):
   - Verifica respuestas nulas/inválidas
   - Lanza excepciones HTTP apropiadas (400, 503)

---

### Testing de APIs Externas

**Mocking en tests unitarios**:

- `http-stock.adapter.spec.ts`: Mock de `HttpService`
- `http-payment.adapter.spec.ts`: Mock de respuestas de API
- `openstreetmap.adapter.spec.ts`: Mock de Nominatim

**Tests E2E**:

- `test/app.e2e-spec.ts` (líneas 57-78): Override de servicios externos
  ```typescript
  .overrideProvider(STOCK_SERVICE)
  .useValue({
    checkAvailability: jest.fn().mockResolvedValue({
      available: true,
      zoneId: 'ZONE_A'
    })
  })
  ```

---

### Beneficios del Consumo de APIs Externas

- ✅ **Reutilización**: No reinventar la rueda (geocodificación, pagos)
- ✅ **Separación de responsabilidades**: Cada microservicio tiene su dominio
- ✅ **Escalabilidad**: Servicios independientes pueden escalar por separado
- ✅ **Resiliencia**: Circuit breakers previenen fallos en cascada
- ✅ **Flexibilidad**: Fácil cambiar proveedores mediante patrón Adapter
- ✅ **Testabilidad**: Mocking sencillo gracias a interfaces

---

## 7) Implementar un frontend con rutas y navegación

- **Implementación**:

  - **Enrutamiento**: Se ha utilizado `react-router-dom` para la gestión de la navegación. La configuración principal reside en `src/App.tsx`, donde se definen rutas públicas y privadas. Se implementan componentes de guarda (`AuthGuard`, `GuestGuard`) para proteger rutas según el estado de autenticación y el rol del usuario.
  - **Centro de Gestión de Reservas**: Se ha desarrollado una página dedicada (`src/pages/Robots.tsx`) que actúa como página principal de gestión de alquileres.
    - **Gestión de Estado**: Utiliza `useState` y `useEffect` para cargar reservas e historial desde el backend. Implementa carga automática mediante `rentalService.getUserRentals(userId)` con ordenación por fecha de creación.
    - **Filtrado y Organización**: Las reservas se organizan mediante pestañas (`Buscar Robots`, `Mis Reservas`). Filtros por categoría (`CLEANING`, `KITCHEN`, `SHOPPING`), zona geográfica, y búsqueda por nombre.
    - **Interfaz de Usuario**: Se utilizan componentes visuales (`Card`, `Badge`, `Tabs`) con códigos de color según el estado de la reserva (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ACTIVE`, `IN_TRANSIT`).
  - **Servicios Frontend**: La lógica de comunicación con la API se centraliza en `src/services/rentalService.ts`, proporcionando métodos para obtener reservas (`getUserRentals`), obtener detalle (`getRentalById`), crear (`createRental`), actualizar dirección (`updateRental`) y cancelar (`deleteRental`).
  - **Funcionalidades de Usuario**: Para usuarios autenticados, se habilita página de detalle de reserva (`src/pages/RentalDetailPage.tsx`) con visualización completa, edición de dirección (si estado `PENDING` o `CONFIRMED`), y cancelación de reservas con feature toggle basado en pricing plans (solo planes `Intermediate` y `Premium` pueden cancelar).

- **Dónde**:
  - Repositorio: ([RoboFIS/frontend](https://github.com/RoboFIS/frontend))
  - Configuración de rutas: `src/App.tsx`
  - Página principal: `src/pages/Robots.tsx` (búsqueda y listado)
  - Página de detalle: `src/pages/RentalDetailPage.tsx`
  - Página de pago: `src/pages/Payment.tsx`
  - Servicio API: `src/services/rentalService.ts`
  - Componentes de UI: `src/shared/ui/` (Card, Badge, Tabs, Button, Input, Select)
  - Hooks: `src/pricing/usePricingPlan.ts` (control de acceso por plan)
