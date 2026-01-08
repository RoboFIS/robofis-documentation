# Análisis Justificativo de la Suscripción Óptima de APIs Externas

## **1\. Contexto y Necesidad**

El microservicio de **Alquiler (Rental Service)** requiere una funcionalidad crítica de geocodificación (_Geocoding_) para transformar las direcciones postales introducidas por los usuarios (ej: "Calle Gran Vía 28, Madrid") en coordenadas geográficas (Latitud/Longitud).  
Estas coordenadas son necesarias para:

1. Validar que la dirección existe.
2. Consultar con el servicio de Stock si dicha ubicación se encuentra dentro de un polígono de reparto operativo.

## **2\. Evaluación de Candidatos**

Se han evaluado las dos soluciones líderes en el mercado bajo criterios de coste, facilidad de integración, límites de uso y escalabilidad.

### **Opción A: Google Maps Platform (Geocoding API)**

El estándar de la industria, conocido por la precisión de sus datos y robustez.

- **Modelo de Coste:** Pago por uso (_Pay-as-you-go_).
- **Precio:** Aproximadamente **$5.00 USD por cada 1,000 peticiones** (tras consumir el crédito mensual gratuito de $200).
- **Requisitos:** Vinculación obligatoria de tarjeta de crédito y gestión de claves API (API Key) en Google Cloud Console.
- **Ventajas:** Datos extremadamente precisos, tolerancia a fallos ortográficos, SLA del 99.9%.
- **Desventajas:** Riesgo de costes imprevistos en entornos de desarrollo/pruebas automatizadas, _Vendor Lock-in_ fuerte.

### **Opción B: OpenStreetMap (Nominatim Public API)**

Servicio de código abierto mantenido por la comunidad y la Fundación OpenStreetMap.

- **Modelo de Coste:** Gratuito (Para la API pública con restricciones).
- **Precio:** **0€**.
- **Requisitos:** Cumplimiento de la _Política de Uso Justo_ (No uso masivo, identificación vía User-Agent).
- **Ventajas:** Totalmente gratuito, datos abiertos, posibilidad de auto-hospedaje (_Self-hosting_) mediante Docker.
- **Desventajas:** Límite estricto de 1 petición/segundo en la API pública, menor tolerancia a direcciones ambiguas, sin SLA garantizado.

## **3\. Matriz Comparativa**

| Característica           | Google Maps API                  | Nominatim (OSM)           | Decisión              |
| :----------------------- | :------------------------------- | :------------------------ | :-------------------- |
| **Coste Dev/Test**       | Bajo (Créditos gratis)           | **Nulo**                  | ✅ Nominatim          |
| **Complejidad Auth**     | Media (API Key)                  | **Baja (User-Agent)**     | ✅ Nominatim          |
| **Límites (Rate Limit)** | Muy Alto (QPS ilimitado pagando) | Bajo (1 req/sec)          | ⚠️ Aceptable para MVP |
| **Privacidad**           | Datos gestionados por Google     | Open Data                 | ✅ Nominatim          |
| **Infraestructura**      | Externa (SaaS)                   | Externa o **Self-Hosted** | ✅ Nominatim          |

## **4\. Selección y Justificación Técnica**

Tras el análisis, se ha seleccionado **OpenStreetMap (Nominatim)** como la suscripción óptima para la fase actual del proyecto RoboFIS.

### **4.1. Justificación Económica (Cost-Avoidance)**

En un entorno de desarrollo académico y CI/CD (Integración Continua), se ejecutan cientos de tests automáticos. Utilizar una API de pago como Google Maps implicaría:

1. Consumir cuota real por cada ejecución de los tests de integración.
2. Riesgo de exponer la API Key en repositorios o logs.
3. Necesidad de configurar "Mocks" complejos para evitar llamadas reales.

Con Nominatim, el coste operativo es cero, eliminando la barrera de entrada para nuevos desarrolladores y simplificando el despliegue en entornos efímeros.

### **4.2. Justificación Arquitectónica (Desacoplamiento)**

Para mitigar los riesgos de Nominatim (menor disponibilidad y límites de velocidad), se ha implementado el **Patrón de Adaptador (Hexagonal Architecture)**.

- **Diseño:** El sistema depende de la interfaz IGeoService, no de una implementación concreta.
- **Implementación:** Se ha creado OpenStreetMapAdapter.
- **Escalabilidad:** Si en el futuro el proyecto pasa a producción y requiere mayor volumen, se puede cambiar a GoogleMapsAdapter o desplegar un contenedor propio de Nominatim sin modificar ni una línea de la lógica de negocio.

## **5\. Estrategia de Implementación y Mitigación**

Para cumplir con la _Política de Uso_ de Nominatim y asegurar la estabilidad:

1. **Identificación:** Se inyecta la cabecera User-Agent: RoboFIS Rental Service en todas las peticiones.
2. **Gestión de Errores:** El adaptador está diseñado para capturar fallos de red o errores 403/429 (Too Many Requests) y devolver null de forma controlada, permitiendo al sistema responder con un error legible al usuario (BadRequest) en lugar de colapsar.
3. **Configuración Externa:** La URL del servicio se ha extraído a variables de entorno (GEO_SERVICE_URL), permitiendo cambiar a una instancia privada de Nominatim en Docker si se superan los límites de la API pública.

**Conclusión:** La elección de OpenStreetMap maximiza la eficiencia de costes y la flexibilidad arquitectónica, alineándose con los objetivos académicos y técnicos del proyecto.
