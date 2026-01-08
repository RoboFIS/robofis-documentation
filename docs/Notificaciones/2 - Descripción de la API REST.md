# Descripción de la API REST

## Descripción General
El Microservicio de Notificaciones se basa en una API REST, basada a su vez en NestJS que gestiona notificaciones orientadas a eventos en toda la plataforma RoboFIS. Recibe eventos de dominio desde RabbitMQ (mediante el intercambio de temas `robofis.events`), almacena notificaciones en MongoDB y proporciona puntos finales HTTP para recuperación, gestión y envío de correos electrónicos.

**URL Base:** `/api/v1`  
**Documentación API:** `/api/v1/docs/notifications` (Swagger)  
**Puerto del Servicio:** 3000 (predeterminado)

---

## Características Principales

- **Arquitectura Orientada por Eventos**: Consume eventos del intercambio de temas RabbitMQ (`robofis.events`) usando patrones:
  - `rental.*` - Eventos de alquiler/reserva
  - `users.*` - Eventos de cuenta de usuario
  - `stock.*` - Eventos de gestión de stock
  - `status.*` - Eventos de estado del sistema

- **Almacenamiento Persistente**: MongoDB almacena todas las notificaciones con marcas de tiempo, estado de lectura, niveles de severidad y seguimiento de origen

- **Entrega Multicanal**: 
  - Notificaciones en la aplicación (almacenadas en la base de datos)
  - Notificaciones por correo electrónico mediante integración SendGrid
  - Notificaciones manuales del administrador

- **Categorización**: Las notificaciones se clasifican por:
  - **Audiencia Objetivo**: CLIENT (usuarios de la aplicación) o EMPLOYEE (personal operativo)
  - **Origen**: Alquiler, Robots, Stock, Usuarios o Manual
  - **Severidad**: INFO, SUCCESS, WARNING o CRITICAL

---

## Endpoints de la API REST

### 1. **Crear Notificación**
```
POST /api/v1/notifications
Content-Type: application/json
```

**Cuerpo de la Solicitud:**
```json
{
  "targetAudience": "CLIENT|EMPLOYEE",
  "userId": "id-usuario-opcional",
  "source": "MS_ALQUILER|MS_ROBOTS|MS_STOCK|MS_USERS|MANUAL",
  "eventName": "rental.reservation.confirmed",
  "severity": "INFO|SUCCESS|WARNING|CRITICAL",
  "message": "Texto del mensaje de notificación",
  "data": { "campoPersonalizado": "valor" }
}
```

**Respuesta:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "targetAudience": "CLIENT",
  "userId": "usuario-123",
  "source": "MS_ALQUILER",
  "eventName": "rental.reservation.confirmed",
  "severity": "SUCCESS",
  "message": "Tu reserva ha sido confirmada",
  "read": false,
  "createdAt": "2026-01-08T10:30:00Z",
  "updatedAt": "2026-01-08T10:30:00Z"
}
```

---

### 2. **Obtener Todas las Notificaciones**
```
GET /api/v1/notifications
```

**Respuesta:** `200 OK`
```json
[
  { notificacion_objeto_1 },
  { notificacion_objeto_2 }
]
```

---

### 3. **Obtener Notificación por ID**
```
GET /api/v1/notifications/{id}
```

**Parámetros de Ruta:**
- `id` (string, requerido): ID de notificación de MongoDB

**Respuesta:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "targetAudience": "CLIENT",
  "userId": "usuario-123",
  ...
}
```

**Respuestas de Error:**
- `404 Not Found` - Notificación con el ID dado no existe

---

### 4. **Actualizar Notificación**
```
PATCH /api/v1/notifications/{id}
Content-Type: application/json
```

**Cuerpo de la Solicitud (todos los campos opcionales):**
```json
{
  "message": "Mensaje actualizado",
  "severity": "WARNING",
  "read": true,
  "data": { "campoAdicional": "valor-actualizado" }
}
```

**Respuesta:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  ...
  "message": "Mensaje actualizado",
  "severity": "WARNING",
  ...
}
```

**Respuestas de Error:**
- `400 Bad Request` - Carga útil inválida
- `404 Not Found` - Notificación no encontrada

---

### 5. **Eliminar Notificación**
```
DELETE /api/v1/notifications/{id}
```

**Respuesta:** `200 OK`
```json
{
  "message": "Notificación eliminada exitosamente"
}
```

**Respuestas de Error:**
- `404 Not Found` - Notificación no encontrada

---

### 6. **Obtener Historial de Notificaciones del Usuario**
```
GET /api/v1/notifications/user/{userId}
```

**Parámetros de Ruta:**
- `userId` (string, requerido): ID de usuario para el cual recuperar notificaciones

**Respuesta:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "targetAudience": "CLIENT",
    "userId": "usuario-123",
    "eventName": "rental.reservation.confirmed",
    "read": false,
    ...
  }
]
```

---

### 7. **Marcar Notificación como Leída**
```
PUT /api/v1/notifications/{id}/read
```

**Respuesta:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "read": true,
  ...
  "updatedAt": "2026-01-08T10:35:00Z"
}
```

---

### 8. **Obtener Demandas de Stock Pendientes (Administrador)**
```
GET /api/v1/notifications/admin/demands
```

**Respuesta:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "targetAudience": "EMPLOYEE",
    "source": "MS_STOCK",
    "eventName": "stock.demand.pending",
    "severity": "WARNING",
    "message": "La demanda de stock para el Producto X requiere aprobación",
    ...
  }
]
```

---

### 9. **Obtener Incidentes Críticos de Robots (Administrador)**
```
GET /api/v1/notifications/admin/incidents
```

**Respuesta:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "targetAudience": "EMPLOYEE",
    "source": "MS_ROBOTS",
    "eventName": "robot.critical.failure",
    "severity": "CRITICAL",
    "message": "El Robot 'R-001' ha encontrado una falla crítica",
    ...
  }
]
```

---

### 10. **Enviar Notificación Manual (Administrador)**
```
POST /api/v1/notifications/send/manual
Content-Type: application/json
```

**Cuerpo de la Solicitud:**
```json
{
  "targetAudience": "CLIENT",
  "userId": "usuario-123",
  "message": "Mantenimiento del sistema programado para 2026-01-10",
  "severity": "INFO"
}
```

**Respuesta:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "targetAudience": "CLIENT",
  "userId": "usuario-123",
  "source": "MANUAL",
  "eventName": "manual.send",
  "message": "Mantenimiento del sistema programado para 2026-01-10",
  "severity": "INFO",
  ...
}
```

---

### 11. **Enviar Correo Electrónico Urgente**
```
POST /api/v1/notifications/send/email
Content-Type: application/json
```

**Cuerpo de la Solicitud:**
```json
{
  "to": "usuario@example.com",
  "subject": "Alerta de Seguridad de Cuenta",
  "text": "Se detectó actividad de inicio de sesión inusual en tu cuenta"
}
```

**Respuesta:** `202 Accepted`

**Detalles:**
- Correo electrónico enviado de forma asincrónica a través de SendGrid
- Asunto prefijado con "URGENTE: "
- El estado de respuesta `202` indica aceptación para entrega

---

## Modelos de Datos

### Entidad de Notificación

```typescript
interface Notificacion {
  _id: ObjectId;
  targetAudience: "CLIENT" | "EMPLOYEE";
  userId?: string;  // Opcional, para dirigirse a usuarios específicos
  source: "MS_ALQUILER" | "MS_ROBOTS" | "MS_STOCK" | "MS_USERS" | "MANUAL";
  eventName: string;  // Clave de enrutamiento / identificador de evento
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  message: string;
  data?: Record<string, any>;  // Datos personalizados específicos del evento
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Manejo de Errores

### Filtro Global de Excepciones
El servicio incluye un `MongooseExceptionFilter` que captura errores de validación/consulta de MongoDB y devuelve respuestas de error estandarizadas.

### Códigos de Estado HTTP Comunes

| Estado | Significado |
|---|---|
| `200 OK` | Solicitud exitosa |
| `201 Created` | Recurso creado exitosamente |
| `202 Accepted` | Solicitud aceptada para procesamiento asincrónico (correo) |
| `400 Bad Request` | Entrada inválida/validación fallida |
| `404 Not Found` | Recurso no encontrado |
| `500 Internal Server Error` | Error inesperado del servidor |

---

## CORS y Seguridad

- **CORS Habilitado**: `origin: true`, `credentials: true`
- **Métodos Permitidos**: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- **Prefijo Global**: `/api/v1` aplicado a todas las rutas

---

### Documentación de la API
Documentación interactiva de Swagger disponible en:
```
http://localhost:3000/api/v1/docs/notifications
```

---

## Integración

### Con Otros Microservicios
1. **Servicio de Alquiler** → Publica eventos `rental.*`
2. **Servicio de Usuarios** → Publica eventos `users.*`
3. **Servicio de Stock** → Publica eventos `stock.*`
4. **Servicio de Estado de Robot** → Publica eventos `status.*`

### Con Servicios Externos
1. **SendGrid** → Entrega de correos electrónicos para notificaciones urgentes
2. **MongoDB** → Almacenamiento persistente de notificaciones
3. **RabbitMQ** → Consumo de eventos y enrutamiento de mensajes
