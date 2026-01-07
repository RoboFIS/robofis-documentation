# Análisis justificativo de la suscripción óptima de las APIs externas del proyecto

## 1. Contexto y necesidad

El proyecto necesita dos capacidades externas:

1) **Mapas en la aplicación web** (visualización del mapa en frontend).  
2) **Cálculo de rutas óptimas** para misiones (backend) para obtener geometría (polyline), distancia y duración.

## 2. Criterios de selección de la “suscripción óptima”

Se considera óptima la opción que, para el volumen esperado (entorno académico), minimiza coste y riesgo operacional, cumpliendo requisitos:

- **Coste esperado y previsibilidad**: existencia de tramo gratuito suficiente (free tier) y política clara de facturación.
- **Cuotas incluidas**: volumen mensual/diario incluido para “map rendering” y “routing”.
- **Rate limits**: límites por minuto/segundo documentados y comportamiento ante excedentes (429 + headers).
- **Esfuerzo de integración y mantenimiento**: coste de migración, SDKs, cambios en backend/frontend.
- **Riesgo de disponibilidad**: riesgo de bloqueo/limitaciones (p.ej. servicios comunitarios sin SLA).

## 3. Comparativa resumida (lo relevante para este proyecto)

| Opción | Mapas (frontend) | Rutas (backend) | Free tier publicado | Riesgo principal |
|---|---|---|---|---|
| Mapbox | Sí (Mapbox GL JS) | Sí (Directions API) | 50k map loads/mes + 100k directions requests/mes | Riesgo de cambios de pricing/cuotas. Riesgo de 429 si se supera rate limit por token. |
| Google Maps Platform | Sí | Sí | “free usage” por SKU (p.ej. 10k/mes en varias SKUs) | Modelo por SKUs/eventos complica estimación de coste si se activan SKUs no previstos. Free cap puede ser menor según uso real. |
| OpenRouteService | No | Sí | Standard: 2000/día y 40/min (Directions V2) | No cubre mapas: obliga a integrar otro proveedor para frontend (más complejidad). |
| TomTom | Sí | Sí | 50k tiles/día + 2.5k non-tile/día | Modelo por tiles dificulta extrapolar “map loads” y puede elevar consumo según zoom/panning. Cuota “non-tile” puede limitar routing/geocoding. |
| HERE | Sí | Sí | Free tier por API, pero restricciones desconocidos | Detalle numérico puede ser menos directo; Esfuerzo adicional para validar costes/cuotas reales. |
| OpenStreetMap tiles (OSMF) | Sí (tiles) | No (routing) | No es “free tier comercial”: es servicio comunitario | La Tile Usage Policy limita prefetch/bulk y exige caching y User-Agent correcto; servicio puede bloquear tráfico sin aviso. |

Fuentes:
- Mapbox pricing: https://www.mapbox.com/pricing/
- Mapbox rate limits: https://docs.mapbox.com/api/guides/#rate-limits
- Google price list: https://developers.google.com/maps/billing-and-pricing/pricing
- ORS plans: https://account.heigit.org/info/plans
- TomTom pricing: https://developer.tomtom.com/pricing
- OSM tile policy: https://operations.osmfoundation.org/policies/tiles/

## 4. Recomendación: mantener Mapbox en Free Tier (suscripción óptima para el proyecto)

### 5.1 Por qué Mapbox Free Tier es óptimo aquí

1) **Cubre ambas necesidades con un solo proveedor** (mapas + rutas), reduciendo complejidad operacional y documentación.
   - Mapbox tiene “Maps” y “Navigation / Directions API” con tramos gratuitos publicados: https://www.mapbox.com/pricing/

2) **El free tier publicado es amplio para un proyecto académico**:
   - 50.000 map loads/mes (Mapbox GL JS) y 100.000 requests/mes (Directions API).  
   - Esto suele ser suficiente para demos, pruebas y tráfico moderado.

3) **Rate limits claros y documentados** (diseñables):
   - Directions API: 300 req/min y se controla por access token.  
   - Permite diseñar limitación interna (ya implementada en el backend) y aislar entornos con tokens distintos.
   - Fuente: https://docs.mapbox.com/api/guides/#rate-limits

4) **Mejor “headroom” frente a varias alternativas en gratis**:
   - Google (según price list) ofrece free usage típico de 10k/mes por SKU para mapas/rutas en varias tablas; esto puede ser menor margen que 50k/100k de Mapbox para este caso.
   - Fuente: https://developers.google.com/maps/billing-and-pricing/pricing
   - ORS Standard tiene 2000/día para rutas, lo cual puede ser suficiente pero ofrece menos holgura y además no cubre mapas.
   - Fuente: https://account.heigit.org/info/plans

### 5.2 Condiciones y límites (para que la decisión sea responsable)

- **No “inventar capacidad”**: el free tier puede cambiar; conviene revisar periódicamente el pricing oficial.
- **No superar 300 req/min** en Directions (y respetar 429 + backoff). El backend ya incorpora rate limiting interno.

## 5. Plan de escalado (si se supera el free tier)

- **Mitigación técnica**:
  - Mantener caché de rutas por misión (ya existe) y evitar recalcular rutas innecesariamente.
  - Backoff/retry cuando haya 429.

- **Opciones si crece el uso**:
  - Subir a un plan de pago Mapbox (pay-as-you-go) manteniendo compatibilidad.
  - O bien separar proveedor de mapas y proveedor de routing si hay razones fuertes (p.ej. ORS on-premise para routing).

