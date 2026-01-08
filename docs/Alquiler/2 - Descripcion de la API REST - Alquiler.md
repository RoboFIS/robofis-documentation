# Descripción de la API REST - Microservicio de Alquiler

## Descripción General

El Microservicio de Alquiler es una API REST basada en NestJS que gestiona las reservas de robots en la plataforma RoboFIS. Implementa arquitectura CQRS (Command Query Responsibility Segregation) y DDD (Domain-Driven Design), se comunica con otros microservicios mediante HTTP y RabbitMQ, y almacena las reservas en MongoDB.

**URL Base:** `/api/v1`  
**Documentación API:** `/api/v1/docs/rental` (Swagger)  
**Puerto del Servicio:** 3000 (predeterminado)

---

## Características Principales

- **Arquitectura CQRS + DDD**: Separación clara entre comandos (escritura) y queries (lectura), con lógica de dominio encapsulada en entidades

- **Integración con Microservicios**:
  - **Stock Service**: Validación de disponibilidad de robots por zona
  - **Payment/Users Service**: Gestión de saldo de tokens (verificar, cobrar, reembolsar)
  - **Geo Service (OpenStreetMap)**: Geocodificación de direcciones de entrega

- **Mensajería Asíncrona**: Publica eventos de dominio a RabbitMQ (`robofis.events`) para notificar a otros servicios:
  - `rental.reservation.created` - Nueva reserva creada
  - `rental.reservation.confirmed` - Reserva confirmada con robot asignado
  - `rental.reservation.cancelled` - Reserva cancelada

- **Resiliencia**:
  - **Circuit Breakers**: Protección contra fallos de servicios externos (Opossum)
  - **Rate Limiting**: Control de tráfico por endpoint (@nestjs/throttler)
  - **Throttling**: Límites diferenciados según tipo de operación

- **Almacenamiento Persistente**: MongoDB con Mongoose, schemas optimizados con índices

- **Validación de Datos**: DTOs con class-validator, validaciones personalizadas de lógica de negocio

---

## Endpoints de la API REST

### 1. **Crear Reserva de Alquiler**

```
POST /api/v1/rentals
Content-Type: application/json
```

**Rate Limit:** 10 peticiones/minuto

**Cuerpo de la Solicitud:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "delivery_address": "Calle Gran Vía 28, Madrid",
  "delivery_zone": "Madrid Central",
  "start_date": "2026-01-20T10:00:00.000Z",
  "end_date": "2026-01-22T18:00:00.000Z",
  "robot_type": "BASIC|INTERMEDIATE|PREMIUM",
  "category": "CLEANING|KITCHEN|SHOPPING"
}
```

**Validaciones:**
- `user_id`: String no vacío
- `delivery_address`: Mínimo 5 caracteres, máximo 255
- `delivery_zone`: Mínimo 3 caracteres, máximo 100
- `start_date`: Formato ISO 8601
- `end_date`: Debe ser posterior a `start_date`
- `robot_type`: Enum válido
- `category`: Enum válido

**Proceso interno:**
1. Geocodifica la dirección con OpenStreetMap
2. Verifica disponibilidad de robots en Stock Service
3. Calcula precio (10 tokens/hora)
4. Verifica saldo del usuario en Payment Service
5. Crea la reserva en estado `PENDING`
6. Cobra tokens al usuario
7. Publica evento `rental.reservation.created` a RabbitMQ

**Respuesta:** `201 Created`

```json
{
  "message": "Rental created successfully",
  "rental_id": "67890abc12345def67890abc"
}
```

**Respuestas de Error:**

- `400 Bad Request` - Validación fallida, dirección inválida, sin stock, saldo insuficiente
- `503 Service Unavailable` - Servicio externo no disponible (circuit breaker abierto)

---

### 2. **Obtener Reserva por ID**

```
GET /api/v1/rentals/{id}
```

**Rate Limit:** 30 peticiones/minuto

**Parámetros de Ruta:**

- `id` (string, requerido): ID de MongoDB de la reserva

**Respuesta:** `200 OK`

```json
{
  "id": "67890abc12345def67890abc",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "robot_id": "robot-123",
  "status": "PENDING|ASSIGNED|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED",
  "delivery_zone": "Madrid Central",
  "delivery_address": "Calle Gran Vía, 28, Madrid, España",
  "delivery_lat": 40.4168,
  "delivery_lng": -3.7038,
  "price_per_day": 240,
  "total_price": 580,
  "start_date": "2026-01-20T10:00:00.000Z",
  "end_date": "2026-01-22T18:00:00.000Z",
  "created_at": "2026-01-15T12:30:00.000Z",
  "updated_at": "2026-01-15T12:30:00.000Z"
}
```

**Respuestas de Error:**

- `404 Not Found` - Reserva con el ID dado no existe

---

### 3. **Obtener Historial de Reservas de un Usuario**

```
GET /api/v1/rentals/user/{userId}
```

**Rate Limit:** 20 peticiones/minuto

**Parámetros de Ruta:**

- `userId` (string, requerido): ID del usuario

**Respuesta:** `200 OK`

```json
[
  {
    "id": "67890abc12345def67890abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "robot_id": "robot-123",
    "status": "COMPLETED",
    "delivery_address": "Calle Gran Vía, 28, Madrid, España",
    "total_price": 580,
    "start_date": "2026-01-20T10:00:00.000Z",
    "end_date": "2026-01-22T18:00:00.000Z",
    "created_at": "2026-01-15T12:30:00.000Z"
  },
  {
    "id": "12345abc67890def12345abc",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "delivery_address": "Avenida de la Constitución, 1, Sevilla, España",
    "total_price": 720,
    "start_date": "2026-02-01T09:00:00.000Z",
    "end_date": "2026-02-04T20:00:00.000Z",
    "created_at": "2026-01-18T10:15:00.000Z"
  }
]
```

---

### 4. **Actualizar Dirección de Entrega**

```
PUT /api/v1/rentals/{id}
Content-Type: application/json
```

**Rate Limit:** 15 peticiones/minuto

**Parámetros de Ruta:**

- `id` (string, requerido): ID de la reserva

**Cuerpo de la Solicitud:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "delivery_address": "Nueva Calle Mayor 10, Madrid"
}
```

**Restricciones:**
- Solo se puede actualizar si el estado es `PENDING` o `ASSIGNED`
- No se puede actualizar si el robot ya está en camino (`IN_PROGRESS`)

**Proceso interno:**
1. Verifica que la reserva pertenece al usuario
2. Valida que el estado permite modificación
3. Geocodifica la nueva dirección
4. Actualiza la reserva

**Respuesta:** `200 OK`

```json
{
  "message": "Rental updated successfully"
}
```

**Respuestas de Error:**

- `400 Bad Request` - Dirección requerida, estado no permite modificación
- `403 Forbidden` - Usuario no autorizado para modificar esta reserva
- `404 Not Found` - Reserva no encontrada

---

### 5. **Cancelar Reserva**

```
DELETE /api/v1/rentals/{id}
Content-Type: application/json
```

**Rate Limit:** 15 peticiones/minuto

**Parámetros de Ruta:**

- `id` (string, requerido): ID de la reserva

**Cuerpo de la Solicitud:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Proceso interno:**
1. Verifica que la reserva pertenece al usuario
2. Valida que el estado permite cancelación
3. Cambia estado a `CANCELLED`
4. Reembolsa tokens al usuario (si aplica)
5. Publica evento `rental.reservation.cancelled`

**Respuesta:** `204 No Content`

**Respuestas de Error:**

- `400 Bad Request` - Estado no permite cancelación
- `403 Forbidden` - Usuario no autorizado
- `404 Not Found` - Reserva no encontrada

---

## Endpoints Internos (Consumidos por otros microservicios)

### 6. **Asignar Robot a Reserva** (Llamado por Stock Service)

```
POST /api/v1/rentals/{id}/assign
Content-Type: application/json
```

**Cuerpo de la Solicitud:**

```json
{
  "robot_id": "robot-123",
  "zone_id": "ZONE_A"
}
```

**Respuesta:** `200 OK`

**Proceso:**
- Actualiza `robot_id` en la reserva
- Cambia estado a `ASSIGNED`
- Publica evento `rental.reservation.confirmed`

---

### 7. **Confirmar Entrega del Robot** (Llamado por Stock Service)

```
POST /api/v1/rentals/{id}/confirm
```

**Respuesta:** `200 OK`

**Proceso:**
- Cambia estado a `CONFIRMED`
- Actualiza timestamp

---

### 8. **Rechazar Reserva** (Llamado por Stock Service)

```
POST /api/v1/rentals/{id}/reject
Content-Type: application/json
```

**Cuerpo de la Solicitud:**

```json
{
  "reason": "No hay robots disponibles en la zona"
}
```

**Respuesta:** `200 OK`

**Proceso:**
- Cambia estado a `CANCELLED`
- Reembolsa tokens al usuario
- Publica evento de cancelación

---

## Modelos de Datos

### Entidad de Reserva (Rental)

```typescript
interface Rental {
  id: string;                    // MongoDB ObjectId
  user_id: string;               // UUID del usuario
  robot_id?: string;             // ID del robot asignado (opcional hasta asignación)
  status: RentalStatus;          // Estado de la reserva
  
  // Ubicación y detalles
  delivery_zone: string;         // Zona de entrega
  delivery_address: string;      // Dirección formateada por geocodificación
  delivery_lat: number;          // Latitud
  delivery_lng: number;          // Longitud
  
  // Precios (en tokens)
  price_per_day: number;         // Precio por día (240 tokens = 10 tokens/hora * 24h)
  total_price: number;           // Precio total calculado
  
  // Fechas
  start_date: Date;              // Inicio del alquiler
  end_date: Date;                // Fin del alquiler
  created_at: Date;              // Fecha de creación
  updated_at: Date;              // Última actualización
}
```

### Estados de Reserva (RentalStatus)

```typescript
enum RentalStatus {
  PENDING = 'pending',           // Creada, esperando asignación de robot
  ASSIGNED = 'assigned',         // Robot asignado por Stock Service
  CONFIRMED = 'confirmed',       // Confirmada, robot en preparación
  IN_PROGRESS = 'in_progress',   // Robot entregado, alquiler activo
  COMPLETED = 'completed',       // Alquiler finalizado, robot devuelto
  CANCELLED = 'cancelled'        // Cancelada por usuario o sistema
}
```

### Tipos de Robot

```typescript
enum RobotType {
  BASIC = 'BASIC',               // Robot básico
  INTERMEDIATE = 'INTERMEDIATE', // Robot intermedio
  PREMIUM = 'PREMIUM'            // Robot premium
}

enum RobotCategory {
  CLEANING = 'CLEANING',         // Limpieza
  KITCHEN = 'KITCHEN',           // Cocina
  SHOPPING = 'SHOPPING'          // Compras
}
```

---

## Eventos Publicados a RabbitMQ

### Exchange: `robofis.events`
**Tipo:** Topic Exchange

### 1. `rental.reservation.created`

**Routing Key:** `rental.reservation.created`

**Payload:**

```json
{
  "reservation_id": "67890abc12345def67890abc",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "zone_id": "Madrid Central",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "start_at": "2026-01-20T10:00:00.000Z",
  "end_at": "2026-01-22T18:00:00.000Z",
  "created_at": "2026-01-15T12:30:00.000Z",
  "robot_type": "BASIC",
  "robot_category": "CLEANING",
  "station_id": null,
  "requested_robot_id": null,
  "is_periodic": false,
  "periodicity_type": "DAILY",
  "next_occurrence_at": null
}
```

**Consumidores:**
- **Stock Service**: Asigna robot disponible
- **Notification Service**: Notifica al usuario

---

### 2. `rental.reservation.confirmed`

**Routing Key:** `rental.reservation.confirmed`

**Payload:**

```json
{
  "reservation_id": "67890abc12345def67890abc",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "robot_id": "robot-123",
  "status": "CONFIRMED",
  "confirmed_at": "2026-01-15T12:35:00.000Z"
}
```

**Consumidores:**
- **Notification Service**: Notifica confirmación al usuario

---

### 3. `rental.reservation.cancelled`

**Routing Key:** `rental.reservation.cancelled`

**Payload:**

```json
{
  "reservation_id": "67890abc12345def67890abc",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Cancelado por el usuario",
  "cancelled_at": "2026-01-15T14:00:00.000Z"
}
```

**Consumidores:**
- **Stock Service**: Libera robot asignado
- **Notification Service**: Notifica cancelación

---

## Manejo de Errores

### Validación de DTOs

El servicio usa `class-validator` con `ValidationPipe` global. Los errores de validación retornan:

```json
{
  "statusCode": 400,
  "message": [
    "end_date must be after start_date",
    "delivery_address must be longer than or equal to 5 characters"
  ],
  "error": "Bad Request"
}
```

### Códigos de Estado HTTP

| Estado | Significado |
|--------|-------------|
| `200 OK` | Solicitud exitosa |
| `201 Created` | Reserva creada exitosamente |
| `204 No Content` | Reserva cancelada exitosamente |
| `400 Bad Request` | Validación fallida, lógica de negocio rechaza operación |
| `401 Unauthorized` | Autenticación fallida (implementado en API Gateway) |
| `403 Forbidden` | Usuario no autorizado para la operación |
| `404 Not Found` | Reserva no encontrada |
| `429 Too Many Requests` | Rate limit excedido |
| `500 Internal Server Error` | Error inesperado del servidor |
| `503 Service Unavailable` | Servicio externo no disponible (circuit breaker) |

### Errores de Servicios Externos

Cuando un servicio externo falla, el circuit breaker activa fallback:

**Stock Service no disponible:**
```json
{
  "statusCode": 400,
  "message": "No robots available for this location and dates.",
  "error": "Bad Request"
}
```

**Payment Service no disponible:**
```json
{
  "statusCode": 400,
  "message": "Insufficient user credits.",
  "error": "Bad Request"
}
```

**Geo Service no disponible:**
```json
{
  "statusCode": 400,
  "message": "Invalid delivery address.",
  "error": "Bad Request"
}
```

---

## Rate Limiting y Throttling

### Configuración Global

- **Límite por defecto:** 100 peticiones/minuto
- **Ventana de tiempo (TTL):** 60 segundos

### Límites por Endpoint

| Endpoint | Método | Límite | Razón |
|----------|--------|--------|-------|
| `/rentals` | POST | 10/min | Operación costosa (geocoding, validaciones) |
| `/rentals/:id` | GET | 30/min | Lectura frecuente |
| `/rentals/user/:userId` | GET | 20/min | Consulta de historial |
| `/rentals/:id` | PUT | 15/min | Modificación moderada |
| `/rentals/:id` | DELETE | 15/min | Operación crítica |

### Respuesta cuando se excede el límite

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704715200

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Circuit Breakers

### Servicios Protegidos

| Servicio | Timeout | Error Threshold | Reset Timeout |
|----------|---------|-----------------|---------------|
| Stock Service | 6000ms | 50% | 30000ms |
| Payment Service (Check) | 4000ms | 50% | 30000ms |
| Payment Service (Charge) | 5000ms | 50% | 30000ms |
| Payment Service (Refund) | 5000ms | 50% | 30000ms |
| Geo Service | 5000ms | 50% | 30000ms |

### Endpoint de Monitoreo

```
GET /health/circuit-breaker/stats
```

**Respuesta:**

```json
{
  "circuitBreakers": [
    {
      "name": "stock-service-circuit-breaker",
      "state": "CLOSED",
      "stats": {
        "fires": 150,
        "successes": 148,
        "failures": 2,
        "rejects": 0,
        "timeouts": 0
      }
    },
    {
      "name": "payment-check-balance-circuit-breaker",
      "state": "OPEN",
      "stats": {
        "fires": 100,
        "successes": 45,
        "failures": 55,
        "rejects": 20,
        "timeouts": 10
      }
    }
  ]
}
```

---

## CORS y Seguridad

- **CORS Habilitado**: Orígenes configurables vía `ALLOWED_ORIGINS` (por defecto: `http://localhost:5173`)
- **Métodos Permitidos**: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- **Headers Permitidos**: Content-Type, Authorization
- **Credentials**: Habilitado (`credentials: true`)
- **Prefijo Global**: `/api` aplicado a todas las rutas
- **Versionado**: URI versioning con versión por defecto `v1`

---

## Documentación Interactiva

Documentación Swagger disponible en:

```
http://localhost:3000/api/v1/docs/rental
```

Incluye:
- Descripción de todos los endpoints
- Esquemas de DTOs con validaciones
- Ejemplos de peticiones y respuestas
- Códigos de error posibles
- Opción "Try it out" para probar endpoints

---

## Integración con Otros Servicios

### Servicios Consumidos (HTTP)

1. **Stock Service** (`STOCK_SERVICE_URL`)
   - `GET /stock/availability` - Verificar disponibilidad de robots

2. **Payment/Users Service** (`USER_SERVICE_URL`)
   - `GET /users/{userId}/credits` - Verificar saldo
   - `POST /users/{userId}/credits/charge` - Cobrar tokens
   - `POST /users/{userId}/credits/refund` - Reembolsar tokens

3. **OpenStreetMap** (`GEO_SERVICE_URL`)
   - `GET /search` - Geocodificación de direcciones

### Eventos Consumidos (RabbitMQ)

**Queue:** `rental_events`  
**Exchange:** `robofis.events`  
**Binding Keys:**
- `stock.robot.assigned` - Robot asignado a reserva
- `stock.robot.delivered` - Robot entregado al usuario
- `stock.robot.returned` - Robot devuelto

---

## Variables de Entorno

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/alquiler

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=rental_events

# Servicios Externos
STOCK_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
GEO_SERVICE_URL=https://nominatim.openstreetmap.org/search

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Servidor
PORT=3000
NODE_ENV=development
```

---

## Ejemplos de Uso

### Flujo Completo de Reserva

#### 1. Usuario crea reserva

```bash
curl -X POST http://localhost:3000/api/v1/rentals \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "delivery_address": "Calle Gran Vía 28, Madrid",
    "delivery_zone": "Madrid Central",
    "start_date": "2026-01-20T10:00:00.000Z",
    "end_date": "2026-01-22T18:00:00.000Z",
    "robot_type": "BASIC",
    "category": "CLEANING"
  }'
```

#### 2. Consultar estado de la reserva

```bash
curl http://localhost:3000/api/v1/rentals/67890abc12345def67890abc
```

#### 3. Actualizar dirección (si aún está pendiente)

```bash
curl -X PUT http://localhost:3000/api/v1/rentals/67890abc12345def67890abc \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "delivery_address": "Nueva dirección, Madrid"
  }'
```

#### 4. Cancelar reserva

```bash
curl -X DELETE http://localhost:3000/api/v1/rentals/67890abc12345def67890abc \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123"
  }'
```

#### 5. Ver historial de reservas

```bash
curl http://localhost:3000/api/v1/rentals/user/user-123
```

---

## Arquitectura Técnica

### Patrón CQRS

- **Commands**: Operaciones de escritura (crear, actualizar, cancelar)
  - `CreateRentalCommand`
  - `UpdateRentalCommand`
  - `CancelRentalCommand`
  - `AssignRobotCommand`
  - `ConfirmRentalCommand`

- **Queries**: Operaciones de lectura (consultar)
  - `GetRentalByIdQuery`
  - `GetRentalsByUserQuery`

### Patrón Repository

- **Interfaces de dominio**:
  - `RentalWriteRepository` - Operaciones de escritura
  - `RentalReadRepository` - Operaciones de lectura

- **Implementación**:
  - `MongoRentalRepository` - Implementa ambas interfaces

### Patrón Ports & Adapters

- **Ports** (interfaces): `IStockService`, `IPaymentService`, `IGeoService`
- **Adapters** (implementaciones): `HttpStockAdapter`, `HttpPaymentAdapter`, `OpenStreetMapAdapter`

---

## Testing

### Tests Unitarios

```bash
npm test
```

Cubre:
- Command handlers
- Query handlers
- Entidades de dominio
- Adaptadores HTTP (con mocks)

### Tests E2E

```bash
npm run test:e2e
```

Usa Testcontainers para MongoDB y RabbitMQ reales.

### Tests de Resiliencia

```bash
npm run test:e2e:resilience
```

Prueba circuit breakers y manejo de fallos.

---

## Monitoreo y Observabilidad

### Logs

Todos los handlers y adaptadores incluyen logging estructurado:

```
[CreateRentalHandler] HTTP request received: Create rental for user user-123
[HttpStockAdapter] Checking stock availability at URL: http://localhost:3001/stock/availability
[CreateRentalHandler] Event 'rental.reservation.created' emitted for 67890abc12345def67890abc
```

### Métricas de Circuit Breaker

Endpoint: `GET /health/circuit-breaker/stats`

Proporciona métricas en tiempo real de todos los circuit breakers activos.

---

## Notas de Implementación

- **Cálculo de precio**: 10 tokens por hora de alquiler
- **Geocodificación**: Usa OpenStreetMap Nominatim (requiere User-Agent)
- **Reembolsos**: Automáticos en caso de cancelación o rechazo
- **Estados inmutables**: Una vez `COMPLETED`, no se puede modificar
- **Validación de zona**: Delegada al Stock Service
- **Transaccionalidad**: No hay transacciones distribuidas, se usa patrón Saga implícito con eventos
