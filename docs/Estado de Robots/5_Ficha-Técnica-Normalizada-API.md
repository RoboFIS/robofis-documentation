# Ficha técnica normalizada — Consumo de API externa (Mapbox Directions)

## 1. Identificación

- **Sistema / Microservicio**: microservicio-estado (RoboFIS)
- **API externa**: Mapbox — Directions API
- **Propósito**: cálculo de rutas (waypoints), distancia y duración para misiones de robots
- **Fecha de última actualización**: 2026-01-07

---

## 2. Proveedor

- **Proveedor**: Mapbox
- **Producto**:
  - Navigation: Directions API (usado por el backend para cálculo de rutas)
  - Maps: Mapbox GL JS / Map Loads for Web (usado por el frontend para visualizar el mapa, según el equipo)
- **Documentación oficial**: [https://docs.mapbox.com/](https://docs.mapbox.com/)
- **Pricing oficial**: [https://www.mapbox.com/pricing/](https://www.mapbox.com/pricing/)

---

## 3. Modelo de consumo (cómo se usa)

### 3.1 Flujo funcional

1) El microservicio recibe una autorización de misión (evento de Stock) y arranca la misión.
2) Se solicita el cálculo de ruta a Mapbox entre origen y destino.
3) Se decodifica la geometría (polyline6) a lista de coordenadas.
4) Se persiste el estado de la ruta/misión en caché para reutilizarlo durante la simulación.

**Evidencias en código**:
- Cálculo de rutas: `src/robot/application/services/route.service.ts`
- Inicio de misión y almacenamiento del routeo en caché: `src/robot/application/services/mission.service.ts`
- Caché de estado (waypoints, progreso, etc.): `src/robot/application/simulation/cache/simulation-state.cache.ts`

### 3.2 Tipo de consumo

- **Tipo**: HTTP(s) saliente desde backend
- **Frecuencia**: por misión (cuando se inicia), no por tick
- **Granularidad**: 1 llamada por cálculo de ruta origen→destino

---

## 4. Endpoints utilizados

### 4.1 Endpoint

- **Base URL**: `https://api.mapbox.com/directions/v5/mapbox`
- **Perfil**: `cycling` (configurado en el código)
- **Endpoint efectivo**:
  - `GET /cycling/{originLon},{originLat};{destLon},{destLat}`

**Parámetros de query usados**:
- `access_token`: token de Mapbox
- `geometries=polyline6`
- `overview=full`
- `steps=false`

**Evidencia**:
- Construcción de URL: `src/robot/application/services/route.service.ts` (`buildUrl()`)

---

## 5. Autenticación y secretos

- **Mecanismo**: token en query param (`access_token`)
- **Variable de entorno**: `MAPBOX_ACCESS_TOKEN`
- **Gestión del secreto**:
  - Local/dev: `.env` o variables del entorno
  - CI/CD: secretos del pipeline

**Notas**:
- Si `MAPBOX_ACCESS_TOKEN` no está configurado, el servicio registra un warning y el cálculo de ruta falla.

---

## 6. Límite de cuota / rate limit

### 6.1 Límite del proveedor

- **Plan usado**: Free tier. Mapbox opera con pricing *pay-as-you-go* con un tramo gratuito mensual para muchos productos.

**Capacidad (cuota) — Free tier (valores estándar)**

- **Directions API (Navigation)**: **100.000 requests/mes** incluidos (coste mensual: Free en el tramo base).
  - Fuente: [https://www.mapbox.com/pricing/#navigation](https://www.mapbox.com/pricing/#navigation) (sección “Directions API”).
- **Mapbox GL JS (Maps / Web)**: **50.000 map loads/mes** incluidos (coste mensual: Free en el tramo base).
  - Fuente: [https://www.mapbox.com/pricing/#maps](https://www.mapbox.com/pricing/#maps) (sección “Mapbox GL JS / Map Loads for Web”).

> Nota: los números exactos y la forma de facturación pueden cambiar (Mapbox lo indica como pricing flexible).

**Rate limit (potencia máxima) — valores documentados**

- Comportamiento al exceder el límite: **HTTP 429 Too Many Requests**.
- Headers posibles: `X-Rate-Limit-Interval` (siempre 60s), `X-Rate-Limit-Limit`, `X-Rate-Limit-Reset`.
- **Directions API**: **300 requests/minuto** (por defecto) y **hasta 25 coordenadas por request**.
  - Fuente: [https://docs.mapbox.com/api/guides/#rate-limits](https://docs.mapbox.com/api/guides/#rate-limits) y [https://docs.mapbox.com/api/navigation/directions/#directions-api-restrictions-and-limits](https://docs.mapbox.com/api/navigation/directions/#directions-api-restrictions-and-limits)
- Los rate limits se cuentan **por access token** (no por cuenta).
  - Fuente: [https://docs.mapbox.com/api/guides/#rate-limits](https://docs.mapbox.com/api/guides/#rate-limits)

### 6.2 Rate limiting implementado en el backend

- **Patrón**: Token Bucket con cola (espera si no hay tokens)
- **Configuración**:
  - `RATE_LIMIT_MAX_TOKENS` (default: 10)
  - `RATE_LIMIT_REFILL_RATE` (default: 10 tokens/segundo)
- **Punto de aplicación**: antes de cada llamada a Mapbox

**Evidencias**:
- Rate limiter: `src/robot/application/services/rate-limiter.service.ts`
- Uso del limiter antes del `fetch`: `src/robot/application/services/route.service.ts` (`await this.rateLimiter.acquire()`)

---

## 7. Caché / optimización

- **Qué se cachea**: estado de misión y routeo (waypoints, distancia, duración, progreso)
- **Dónde**: `cache-manager` (configurado como caché en memoria)
- **Motivación**: evitar recalcular rutas dentro de la misma misión y permitir progreso por waypoints

**Evidencias**:
- Registro de caché: `src/robot/infrastructure/nest_modules/robot-core.module.ts` (`CacheModule.register()`)
- API de caché: `src/robot/application/simulation/cache/simulation-state.cache.ts`
- Escritura de la ruta en caché: `src/robot/application/services/mission.service.ts`

**Limitación conocida**:
- Comentarios mencionan Redis, pero la configuración actual es en memoria. Si se requiere persistencia multi-instancia, se recomienda migrar a Redis.

---

## 8. Datos intercambiados

### 8.1 Datos enviados a Mapbox

- Coordenadas de origen/destino en formato lon,lat (Mapbox)

### 8.2 Datos recibidos de Mapbox

- `routes[0].geometry` (polyline6)
- `routes[0].distance` (metros)
- `routes[0].duration` (segundos)

### 8.3 Transformación

- Se decodifica `polyline6` a una lista de `Coordinates`.

**Evidencia**:
- Decodificación: `src/robot/application/services/route.service.ts` (`decodePolyline()`)

---

## 9. Gestión de errores y resiliencia

- Si la respuesta HTTP no es OK: se lanza error `Mapbox API error: <status> <statusText>`
- Si no hay rutas: se lanza error `Mapbox returned no routes: <code>`
- El error se registra y se propaga (no hay circuit breaker implementado)

**Evidencia**:
- Manejo de errores: `src/robot/application/services/route.service.ts`

---

## 10. Seguridad y cumplimiento

- **PII**: no se envían datos personales; solo coordenadas
- **TLS**: consumo vía HTTPS

---

## 11. Observabilidad

- Logging:
  - Se registra un contador de llamadas a Mapbox (solo para debugging/monitorización básica)


**Evidencia**:
- Contador `apiCallCount`: `src/robot/application/services/route.service.ts`

---

## 12. Costes

- **Modelo de costes / facturación**: pay-as-you-go con tramo mensual gratuito (free tier) según producto.
  - Directions API: medido por requests/mes.
  - Maps (web): medido por map loads/mes.
  - Fuente: [https://www.mapbox.com/pricing/](https://www.mapbox.com/pricing/)

---

## 13. Pruebas

- Cobertura E2E de flujo relacionado (sin asegurar Mapbox real):
  - `test/out_process/api.e2e-spec.ts`

> Nota: Las pruebas E2E actuales verifican el ciclo de vida de robots/logs. Para cubrir Mapbox de forma determinista, se recomienda mockear `fetch` o inyectar un cliente HTTP mock.

---
