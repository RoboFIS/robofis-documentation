# Documentación del API REST — microservicio-estado (RoboFIS)

Este microservicio es una aplicación híbrida en NestJS:
- **HTTP (API REST)** para consultar y gestionar robots y sus logs.
- **Microservicio RabbitMQ** (no cubierto en detalle aquí) para mensajería/eventos.

Esta guía documenta **exclusivamente el API REST**, a partir de los controladores y DTOs del proyecto.

## Base URL, versión y formato

- **Prefijo global**: `/api/v1`
- **Base URL**: `http://localhost:3004/api/v1`
- **Formato**: JSON (`Content-Type: application/json`)
- **CORS**: habilitado (en desarrollo permite cualquier origen)

## Variables de entorno (configuración)

Estas variables son las más relevantes para ejecutar el microservicio y/o entender su comportamiento. En `docker-compose.yml` se muestra un ejemplo completo (por defecto expone el servicio en el puerto 3004).

- `NODE_ENV`: `development` | `production` (afecta logging y respuesta de errores 500)
- `PORT`: puerto HTTP (por defecto `3000`; en Docker Compose se usa `3004`)

Persistencia (MongoDB):
- `MONGO_URI`: URI de MongoDB (por defecto `mongodb://localhost:27017/robot_db`)

Mensajería (RabbitMQ, usado por la parte de microservicio):
- `RABBITMQ_URL` (por defecto `amqp://guest:guest@localhost:5672`)
- `RABBITMQ_QUEUE` (por defecto `status_events`)
- `RABBITMQ_EXCHANGE` (por defecto `robofis.events`)
- `RABBITMQ_EXCHANGE_TYPE` (por defecto `topic`)
- `RABBITMQ_ROUTING_KEY` (por defecto `status.#`)

Integración externa (Mapbox) y control de cuota:
- `MAPBOX_ACCESS_TOKEN`: token de Mapbox (si no está configurado, el cálculo de rutas fallará)
- `RATE_LIMIT_MAX_TOKENS` (por defecto `10`)
- `RATE_LIMIT_REFILL_RATE` (por defecto `10`)

Simulación (si está activada en tu flujo de ejecución):
- `TICK_INTERVAL_MS` (por defecto `5000`)
- `SPEED_MULTIPLIER` (por defecto `1`)
- `BATTERY_CONSUMPTION_PER_KM` (por defecto `3`)
- `BATTERY_RECHARGE_PER_TICK` (por defecto `5`)
- `BATTERY_THRESHOLD` (por defecto `50`)
- `STATION_THRESHOLD` (por defecto `0.0001`)
- `TASK_DURATION_DELIVERY` (por defecto `30`)
- `TASK_DURATION_KITCHEN` (por defecto `120`)
- `TASK_DURATION_SECURITY` (por defecto `180`)
- `SIGNAL_MIN` (por defecto `20`)
- `TEMP_MAX` (por defecto `80`)
- `TEMP_MIN` (por defecto `-20`)
- `MAINTENANCE_OVERDUE_DAYS` (por defecto `365`)

## Modelos (referencia rápida)

> Para ejemplos completos de request/response, ver los ejemplos incluidos en cada endpoint.

### Robot (campos más habituales)

- `id`, `type`, `battery`, `speed`, `mode`
- `location` (`{latitude, longitude}`)
- `station_id`, `station_coordinates`
- `zone_id`, `zone_coordinates`
- `sensors` (`signalIntensity`, `temperature`, `readings[]`)
- `defects.entries[]`
- `last_software_update`, `last_maintenance_date`
- `current_target_location`, `is_returning_to_station`

### RobotLog (campos más habituales)

- `id`, `robotId`, `timestamp`, `eventType`, `message`
- `location`, `targetLocation`
- `battery`, `speed`, `mode`, `signalIntensity`, `temperature`
- `wasReturnTrip`

## Modelos y convenciones

### Identificadores
- **Robot ID**: se genera como `R` + UUID (ej. `R2f1c...`).
- **Log ID**: se genera como `LOG-` + UUID (ej. `LOG-7a3b...`).

### Tipos y modos
- `robot_type` (inyección): `CLEANING` | `KITCHEN` | `SHOPPING`
- `mode` (estado operativo):
  - `active`
  - `no-active`
  - `maintenance`
  - `need-maintenance`
  - `lost`
  - `decommissioned`

### Coordenadas
Este microservicio utiliza **dos formatos** según el endpoint:

- **Formato “Stock API” (x/y)**: usado en *inyección* y *update* de robot.
  - `x` se interpreta internamente como latitud
  - `y` se interpreta internamente como longitud

## Errores (estructura)

### Validación de DTOs (HTTP 400)
Cuando falla la validación (class-validator), el `ValidationPipe` lanza una `BadRequestException`.
El filtro global normaliza la respuesta así:

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/..."
}
```

### Errores de dominio (HTTP 400)
Algunas validaciones se realizan en el dominio (entidades/value objects). En ese caso se devuelve una respuesta estructurada como:

```json
{
  "statusCode": 400,
  "error": "INVALID_BATTERY",
  "message": "Battery must be between 0 and 100, got: -5",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/..."
}
```

### Not Found (HTTP 404)
- `Robot not found`
- `Log not found`

### Errores genéricos (HTTP 5xx)
En producción, los 500 se devuelven con un mensaje genérico `Internal server error`.

---

# Endpoints

## Robots

### 1) Listar robots
- **GET** `/api/v1/robots`
- **Respuesta 200**: lista de robots (array JSON)

Ejemplo de petición:
```bash
curl -s http://localhost:3004/api/v1/robots
```

Ejemplo de respuesta (200):
```json
[
  {
    "id": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "type": "CLEANING",
    "battery": 100,
    "speed": 20,
    "sensors": {
      "signalIntensity": 90,
      "temperature": 25,
      "readings": [
        {
          "name": "proximity",
          "value": 0,
          "unit": "cm",
          "lastUpdate": "2026-01-07T09:00:00.000Z"
        }
      ]
    },
    "defects": { "entries": [] },
    "location": { "latitude": 41.387, "longitude": 2.17 },
    "station_id": "ST-001",
    "station_coordinates": { "latitude": 41.387, "longitude": 2.17 },
    "zone_id": "ZONE-001",
    "zone_coordinates": [
      { "latitude": 41.387, "longitude": 2.17 },
      { "latitude": 41.388, "longitude": 2.171 },
      { "latitude": 41.389, "longitude": 2.172 }
    ],
    "mode": "no-active",
    "last_software_update": "2026-01-07T09:00:00.000Z",
    "last_maintenance_date": "2026-01-07T09:00:00.000Z",
    "current_target_location": null,
    "is_returning_to_station": false
  },
  {
    "id": "R8d3a7f10-1111-4b22-9c33-abcdef123456",
    "type": "KITCHEN",
    "battery": 68,
    "speed": 12,
    "sensors": {
        "signalIntensity": 82,
        "temperature": 31,
        "readings": [
        {
            "name": "proximity",
            "value": 15,
            "unit": "cm",
            "lastUpdate": "2026-01-07T10:15:00.000Z"
        },
        {
            "name": "humidity",
            "value": 47,
            "unit": "%",
            "lastUpdate": "2026-01-07T10:15:00.000Z"
        },
        {
            "name": "battery_voltage",
            "value": 12.2,
            "unit": "V",
            "lastUpdate": "2026-01-07T10:15:00.000Z"
        },
        {
            "name": "gps_accuracy",
            "value": 96,
            "unit": "%",
            "lastUpdate": "2026-01-07T10:15:00.000Z"
        }
        ]
    },
    "defects": {
        "entries": [
        {
            "id": "DEF-1736244900000-k3m9q2z1p",
            "description": "Rueda trasera con vibración leve",
            "reportedBy": "EMP-014",
            "reportedAt": "2026-01-06T16:40:00.000Z",
            "severity": "low",
            "resolved": false
        }
        ]
    },
    "location": { "latitude": 41.3882, "longitude": 2.1694 },
    "station_id": "ST-002",
    "station_coordinates": { "latitude": 41.388, "longitude": 2.169 },
    "zone_id": "ZONE-002",
    "zone_coordinates": [
        { "latitude": 41.3875, "longitude": 2.1685 },
        { "latitude": 41.3895, "longitude": 2.1685 },
        { "latitude": 41.3895, "longitude": 2.1705 },
        { "latitude": 41.3875, "longitude": 2.1705 }
    ],
    "mode": "active",
    "last_software_update": "2026-01-02T08:30:00.000Z",
    "last_maintenance_date": "2025-12-20T12:00:00.000Z",
    "current_target_location": { "latitude": 41.389, "longitude": 2.1701 },
    "is_returning_to_station": false
  }
]
```

### 2) Obtener robot por ID
- **GET** `/api/v1/robots/{id}`

Ejemplo de petición:
```bash
curl -s http://localhost:3004/api/v1/robots/R123...
```

Ejemplo de respuesta (200):
```json
{
  "id": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
  "type": "CLEANING",
  "battery": 100,
  "speed": 20,
  "sensors": {
    "signalIntensity": 90,
    "temperature": 25,
    "readings": [
      {
        "name": "proximity",
        "value": 0,
        "unit": "cm",
        "lastUpdate": "2026-01-07T09:00:00.000Z"
      }
    ]
  },
  "defects": { "entries": [] },
  "location": { "latitude": 41.387, "longitude": 2.17 },
  "station_id": "ST-001",
  "station_coordinates": { "latitude": 41.387, "longitude": 2.17 },
  "zone_id": "ZONE-001",
  "zone_coordinates": [
    { "latitude": 41.387, "longitude": 2.17 },
    { "latitude": 41.388, "longitude": 2.171 },
    { "latitude": 41.389, "longitude": 2.172 }
  ],
  "mode": "no-active",
  "last_software_update": "2026-01-07T09:00:00.000Z",
  "last_maintenance_date": "2026-01-07T09:00:00.000Z",
  "current_target_location": null,
  "is_returning_to_station": false
}
```
Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Robot not found",
  "error": "NotFoundException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R123..."
}
```

- **Errores**:
  - 404 si no existe

### 3) Inyectar (crear) un robot
- **POST** `/api/v1/robots/inject`
- **Crea** un robot con valores por defecto (por ejemplo batería 100, velocidad 20, modo inicial `no-active`) y lo persiste.

**Body (JSON) — formato Stock (x/y):**
```json
{
  "robot_type": "CLEANING",
  "station_coordinates": { "x": 41.387, "y": 2.170 },
  "station_id": "ST-001",
  "zone_id": "ZONE-001",
  "zone_coordinates": [
    { "x": 41.387, "y": 2.170 },
    { "x": 41.388, "y": 2.171 },
    { "x": 41.389, "y": 2.172 }
  ]
}
```

- **Respuesta 201**:
```json
{
  "message": "Robot created successfully",
  "robot": { /* robot */ }
}
```

Ejemplo de petición:
```bash
curl -s -X POST http://localhost:3004/api/v1/robots/inject \
  -H "Content-Type: application/json" \
  -d '{
    "robot_type": "CLEANING",
    "station_coordinates": {"x": 41.387, "y": 2.170},
    "station_id": "ST-001",
    "zone_id": "ZONE-001",
    "zone_coordinates": [
      {"x": 41.387, "y": 2.170},
      {"x": 41.388, "y": 2.171},
      {"x": 41.389, "y": 2.172}
    ]
  }'
```

Ejemplo de respuesta (201):
```json
{
  "message": "Robot created successfully",
  "robot": {
    "id": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "type": "CLEANING",
    "battery": 100,
    "speed": 20,
    "sensors": {
      "signalIntensity": 90,
      "temperature": 25,
      "readings": [
        {
          "name": "proximity",
          "value": 0,
          "unit": "cm",
          "lastUpdate": "2026-01-07T09:00:00.000Z"
        }
      ]
    },
    "defects": { "entries": [] },
    "location": { "latitude": 41.387, "longitude": 2.17 },
    "station_id": "ST-001",
    "station_coordinates": { "latitude": 41.387, "longitude": 2.17 },
    "zone_id": "ZONE-001",
    "zone_coordinates": [
      { "latitude": 41.387, "longitude": 2.17 },
      { "latitude": 41.388, "longitude": 2.171 },
      { "latitude": 41.389, "longitude": 2.172 }
    ],
    "mode": "no-active",
    "last_software_update": "2026-01-07T09:00:00.000Z",
    "last_maintenance_date": "2026-01-07T09:00:00.000Z",
    "current_target_location": null,
    "is_returning_to_station": false
  }
}
```

Ejemplo de error (400, validación):
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/inject"
}
```

### 4) Actualizar un robot (parcial)
- **PUT** `/api/v1/robots/{id}`
- Aunque sea PUT, el backend **permite actualizaciones parciales** (solo envía los campos a modificar).

Campos aceptados (todos opcionales):
- Stock:
  - `zone_id` (string)
  - `zone_coordinates` (array de `{x,y}`; mínimo 1 punto por validación de DTO)
  - `station_id` (string)
  - `station_coordinates` (`{x,y}`)
- Internos:
  - `battery` (0–100)
  - `speed` (0–120)
  - `location` (`{x,y}`)
  - `sensors` (`{ signalIntensity?: 0–100, temperature?: -50..150 }`)
  - `mode` (ver lista de modos)

Ejemplo de petición — actualizar telemetría:
```bash
curl -s -X PUT http://localhost:3004/api/v1/robots/R123... \
  -H "Content-Type: application/json" \
  -d '{
    "battery": 77,
    "speed": 15,
    "location": {"x": 41.3875, "y": 2.1705},
    "sensors": {"signalIntensity": 88, "temperature": 24},
    "mode": "active"
  }'
```

Ejemplo de respuesta (200):
```json
{
  "message": "Robot updated successfully",
  "robot":
  {
    "id": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "type": "CLEANING",
    "battery": 77,
    "speed": 15,
    "sensors": {
      "signalIntensity": 88,
      "temperature": 24,
      "readings": [
        {
          "name": "proximity",
          "value": 0,
          "unit": "cm",
          "lastUpdate": "2026-01-07T09:00:00.000Z"
        }
      ]
    },
    "defects": { "entries": [] },
    "location": { "latitude": 41.3875, "longitude": 2.1705 },
    "station_id": "ST-001",
    "station_coordinates": { "latitude": 41.387, "longitude": 2.17 },
    "zone_id": "ZONE-001",
    "zone_coordinates": [
      { "latitude": 41.387, "longitude": 2.17 },
      { "latitude": 41.388, "longitude": 2.171 },
      { "latitude": 41.389, "longitude": 2.172 }
    ],
    "mode": "active",
    "last_software_update": "2026-01-07T09:00:00.000Z",
    "last_maintenance_date": "2026-01-07T09:00:00.000Z",
    "current_target_location": null,
    "is_returning_to_station": false
  }
}
```

Ejemplo de error (400):
```json
{
  "statusCode": 400,
  "message": "Cannot set mode to active while robot has critical defects",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R123..."
}
```

Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Robot not found",
  "error": "NotFoundException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R123..."
}
```

### 5) Eliminar robot
- **DELETE** `/api/v1/robots/{id}`

Ejemplo de petición:
```bash
curl -s -X DELETE http://localhost:3004/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab
```

Ejemplo de respuesta (200):
```json
{ "message": "Robot deleted successfully" }
```

Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Robot not found",
  "error": "NotFoundException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab"
}
```


Ejemplo de error (400):
```json
{
  "statusCode": 400,
  "message": "Failed to delete robot due to active mission",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab"
}
```

- **Errores**:
  - 404 si no existe
  - 400 si el borrado falla

### 6) Decommission (archivar) robot
- **POST** `/api/v1/robots/{id}/decommission`
- Cambia el `mode` a `decommissioned`.

Ejemplo de petición:
```bash
curl -s -X POST http://localhost:3004/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab/decommission
```

Ejemplo de respuesta (200):
```json
{
  "message": "Robot decommissioned successfully",
  "robot": { /* robot */ }
}
```

Ejemplo de respuesta (200) con datos:
```json
{
  "message": "Robot decommissioned successfully",
  "robot": {
    "id": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "type": "CLEANING",
    "battery": 77,
    "speed": 15,
    "sensors": {
      "signalIntensity": 88,
      "temperature": 24,
      "readings": [
        {
          "name": "proximity",
          "value": 0,
          "unit": "cm",
          "lastUpdate": "2026-01-07T09:00:00.000Z"
        }
      ]
    },
    "defects": { "entries": [] },
    "location": { "latitude": 41.3875, "longitude": 2.1705 },
    "station_id": "ST-001",
    "station_coordinates": { "latitude": 41.387, "longitude": 2.17 },
    "zone_id": "ZONE-001",
    "zone_coordinates": [
      { "latitude": 41.387, "longitude": 2.17 },
      { "latitude": 41.388, "longitude": 2.171 },
      { "latitude": 41.389, "longitude": 2.172 }
    ],
    "mode": "decommissioned",
    "last_software_update": "2026-01-07T09:00:00.000Z",
    "last_maintenance_date": "2026-01-07T09:00:00.000Z",
    "current_target_location": null,
    "is_returning_to_station": false
  }
}
```

Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Robot not found",
  "error": "NotFoundException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab/decommission"
}
```

Ejemplo de error (400):
```json
{
  "statusCode": 400,
  "message": "Robot is already decommissioned",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robots/R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab/decommission"
}
```

- **Errores**:
  - 404 si no existe
  - 400 si ya estaba `decommissioned`

---

## Robot Logs

### 1) Crear un log
- **POST** `/api/v1/robot-logs`

**Body (JSON) — formato latitude/longitude:**
```json
{
  "robotId": "R123...",
  "eventType": "MISSION_START",
  "message": "Inicio de misión",
  "location": { "latitude": 41.387, "longitude": 2.170 },
  "battery": 90,
  "speed": 10,
  "mode": "active",
  "signalIntensity": 80,
  "temperature": 25,
  "targetLocation": { "latitude": 41.388, "longitude": 2.171 },
  "wasReturnTrip": false
}
```

- `eventType` permitido:
  - `MISSION_START`, `MISSION_DELIVERED`, `MISSION_RETURNING`, `MISSION_COMPLETE`
  - `ZONE_EXIT`, `ZONE_ENTER`
  - `MAINTENANCE_REQUIRED`
  - `BATTERY_LOW`, `BATTERY_HIGH`
  - `OPERATIVE_CHANGE`, `MODE_CHANGE`

Ejemplo de petición:
```bash
curl -s -X POST http://localhost:3004/api/v1/robot-logs \
  -H "Content-Type: application/json" \
  -d '{
    "robotId": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "eventType": "MISSION_START",
    "message": "Inicio de misión",
    "location": {"latitude": 41.387, "longitude": 2.17},
    "battery": 90,
    "speed": 10,
    "mode": "active",
    "signalIntensity": 80,
    "temperature": 25,
    "targetLocation": {"latitude": 41.388, "longitude": 2.171},
    "wasReturnTrip": false
  }'
```

Ejemplo de respuesta (201):
```json
{
  "message": "Log created successfully",
  "log": { /* log */ }
}
```

Ejemplo de respuesta (201) con datos:
```json
{
  "message": "Log created successfully",
  "log": {
    "id": "LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab",
    "robotId": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "timestamp": "2026-01-07T09:05:00.000Z",
    "eventType": "MISSION_START",
    "message": "Inicio de misión",
    "location": { "latitude": 41.387, "longitude": 2.17 },
    "battery": 90,
    "speed": 10,
    "mode": "active",
    "signalIntensity": 80,
    "temperature": 25,
    "targetLocation": { "latitude": 41.388, "longitude": 2.171 },
    "wasReturnTrip": false
  }
}
```

Ejemplo de error (400, validación):
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "BadRequestException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robot-logs"
}
```

### 2) Listar todos los logs
- **GET** `/api/v1/robot-logs`

Ejemplo de petición:
```bash
curl -s http://localhost:3004/api/v1/robot-logs
```

Ejemplo de respuesta (200):
```json
[
  {
    "id": "LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab",
    "robotId": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "timestamp": "2026-01-07T09:05:00.000Z",
    "eventType": "MISSION_START",
    "message": "Inicio de misión",
    "location": { "latitude": 41.387, "longitude": 2.17 },
    "battery": 90,
    "speed": 10,
    "mode": "active",
    "signalIntensity": 80,
    "temperature": 25,
    "targetLocation": { "latitude": 41.388, "longitude": 2.171 },
    "wasReturnTrip": false
  }
]
```

Ejemplo de error (500, fallo interno):
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Error",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robot-logs"
}
```

### 3) Obtener log por ID
- **GET** `/api/v1/robot-logs/{id}`

Ejemplo de petición:
```bash
curl -s http://localhost:3004/api/v1/robot-logs/LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab
```

Ejemplo de respuesta (200):
```json
{
  "id": "LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab",
  "robotId": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
  "timestamp": "2026-01-07T09:05:00.000Z",
  "eventType": "MISSION_START",
  "message": "Inicio de misión",
  "location": { "latitude": 41.387, "longitude": 2.17 },
  "battery": 90,
  "speed": 10,
  "mode": "active",
  "signalIntensity": 80,
  "temperature": 25,
  "targetLocation": { "latitude": 41.388, "longitude": 2.171 },
  "wasReturnTrip": false
}
```

Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Log not found",
  "error": "NotFoundException",
  "timestamp": "2026-01-07T10:00:00.000Z",
  "path": "/api/v1/robot-logs/LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab"
}
```

- **Errores**:
  - 404 si no existe

### 4) Obtener logs de un robot
- **GET** `/api/v1/robots/{robotId}/logs`
- Filtros (opcionales):
  - `from` (ISO date string)
  - `to` (ISO date string)
  - `limit` (número >= 1)

Ejemplo de petición:
```bash
curl -s "http://localhost:3004/api/v1/robots/R123.../logs?from=2026-01-01T00:00:00.000Z&to=2026-01-07T23:59:59.999Z&limit=50"
```

Ejemplo de respuesta (200):
```json
[
  {
    "id": "LOG-7a3b4c5d-aaaa-bbbb-cccc-1234567890ab",
    "robotId": "R2f1c2b3c-aaaa-bbbb-cccc-1234567890ab",
    "timestamp": "2026-01-07T09:05:00.000Z",
    "eventType": "MISSION_START",
    "message": "Inicio de misión",
    "location": { "latitude": 41.387, "longitude": 2.17 },
    "battery": 90,
    "speed": 10,
    "mode": "active",
    "signalIntensity": 80,
    "temperature": 25,
    "targetLocation": { "latitude": 41.388, "longitude": 2.171 },
    "wasReturnTrip": false
  }
]
```

Ejemplo de error (404):
```json
{
  "statusCode": 404,
  "message": "Robot not found",
  "error": "Not Found"
}
```
