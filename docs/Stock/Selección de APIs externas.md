# **Análisis Justificativo de la Selección del Servicio de Ruteo y Cálculo de Distancias**

---

## **1. Contexto y Necesidad Funcional**

El **Microservicio de Stock y Gestión de Robots** del sistema RoboFIS requiere funcionalidades avanzadas (**cálculo de tiempo medio de llegada de un robot a la localización del usuario**) para soportar correctamente la lógica operativa del sistema.

Estas capacidades son necesarias para:

1. Estimar distancias realistas entre estaciones, zonas y ubicaciones de usuario.
3. Evitar cálculos simplistas basados únicamente en distancia euclídea, utilizando en su lugar la red viaria real.

Para ello, se ha analizado el uso de APIs externas de ruteo que permitan trabajar sobre mapas reales con un coste asumible en entornos de desarrollo, pruebas y CI/CD.

---

## **2. Evaluación de Soluciones Disponibles**

Se han evaluado distintas soluciones de ruteo y cálculo de distancias bajo criterios de **coste**, **precisión**, **facilidad de integración**, **flexibilidad arquitectónica** y **adecuación a un entorno académico**.

---

### **Opción A: Google Maps Directions API**

Solución comercial ampliamente utilizada en entornos productivos.

- **Plan de precios:** https://developers.google.com/maps/billing-and-pricing/pricing#routes-legacy-pricing
- **Modelo de coste:** Pago por uso (*Pay-as-you-go*).
- **Cuota gratuita:** 10.000 peticiones mensuales.
- **Precio aproximado:** ~**5 USD por cada 1.000 peticiones hasta 100.000 solicitudes**.
- **Requisitos:** Cuenta en Google Cloud, API Key y tarjeta de crédito obligatoria.
- **Ventajas:**
  - Alta precisión y cobertura global.
  - SLA elevado y documentación extensa.
- **Desventajas:**
  - Coste acumulativo elevado en pruebas automatizadas.
  - Riesgo de consumo involuntario de cuota en CI/CD.

---

### **Opción B: Mapbox Directions API**

Alternativa comercial moderna basada en datos de OpenStreetMap.

- **Plan de precios:** https://www.mapbox.com/pricing
- **Modelo de coste:** Freemium con límites.
- **Ventajas:**
  - Buen rendimiento y experiencia de uso.
  - SDKs bien integrados.
- **Desventajas:**
  - Límites estrictos en el plan gratuito.
  - Escalabilidad condicionada al coste.

---

### **Opción C: OSRM (Open Source Routing Machine – Self-hosted)**

Motor de ruteo de código abierto desplegable en infraestructura propia.

- **Url al proyecto**: https://github.com/Project-OSRM/osrm-backend
- **Modelo de coste:** Gratuito (requiere infraestructura propia).
- **Ventajas:**
  - Control total del servicio.
  - Sin límites de uso.
- **Desventajas:**
  - Alta complejidad de despliegue y mantenimiento.
  - No adecuado para fases tempranas del proyecto.

---

### **Opción D: OpenRouteService**

Servicio de ruteo basado en OpenStreetMap, mantenido por el Heidelberg Institute for Geoinformation Technology.

- **Plan de precios:** https://account.heigit.org/info/plans
- **Modelo de coste:** Free (Parece que hay que hablar con ellos o tienen mal la web)
- **Plan gratuito:** Adecuado para desarrollo, pruebas y MVP.
- **Autenticación:** API Key sencilla.
- **Ventajas:**
  - Basado en datos abiertos.
  - Documentación clara y API REST bien definida.
  - Posibilidad de auto-hosting en fases futuras.
- **Desventajas:**
  - Límites de peticiones en el plan gratuito.
  - SLA inferior al de soluciones puramente comerciales.

---

## **3. Matriz Comparativa**

| Característica | Google Maps | Mapbox | OSRM Self-hosted | OpenRouteService |
|---------------|------------|--------|------------------|------------------|
| Coste en Dev/Test | Alto | Medio | Bajo | **Bajo** |
| Complejidad de integración | Media | Media | Alta | **Baja** |
| Precisión de rutas | Muy alta | Alta | Alta | Alta |
| Auto-hosting futuro | No | No | Sí | **Sí** |
| Adecuado para CI/CD | No | Parcial | No | **Sí** |

---

## **4. Selección y Justificación de la Solución**

Tras el análisis comparativo, se ha seleccionado **OpenRouteService** como la solución más adecuada para el microservicio de Stock en la fase actual del proyecto.

---

### **4.1 Justificación Económica**

El uso de APIs comerciales con coste por petición introduce riesgos significativos en entornos con pruebas automatizadas, donde el volumen de llamadas puede crecer de forma no controlada.

OpenRouteService permite operar sin costes directos en volúmenes moderados, facilitando el desarrollo continuo y evitando la necesidad de mocks complejos o credenciales sensibles en CI/CD.

---

### **4.2 Justificación Técnica y Arquitectónica**

Desde el punto de vista arquitectónico, OpenRouteService encaja de forma natural en un diseño basado en **Arquitectura Limpia**:

- El dominio depende de una abstracción de ruteo.
- OpenRouteService se implementa como un servicio externo.
- La lógica de negocio permanece desacoplada del proveedor concreto.

Este enfoque permite sustituir el proveedor en el futuro sin impacto sobre el dominio ni los casos de uso.

---

## **5. Estrategia de Uso y Mitigación de Riesgos**

Para garantizar un uso correcto y estable del servicio se han definido las siguientes medidas:

1. Uso responsable conforme a las políticas del proveedor.
2. Gestión controlada de errores y límites de peticiones.
3. Configuración mediante variables de entorno.
4. Posibilidad de sustitución futura por otra implementación.

---

## **Conclusión**

La adopción de **OpenRouteService** ofrece un equilibrio óptimo entre coste, precisión, flexibilidad arquitectónica y facilidad de integración, alineándose con los objetivos técnicos y académicos del proyecto RoboFIS.

Su uso permite implementar cálculos de tiempos de rutas realistas sin introducir dependencias comerciales innecesarias, manteniendo el sistema preparado para una posible evolución futura.

