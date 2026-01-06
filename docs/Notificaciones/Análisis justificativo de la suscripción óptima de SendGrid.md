# Análisis justificativo de la suscripción óptima de SendGrid

## 1. Contexto del proyecto

El proyecto corresponde a una **aplicación innovadora de servicio de alquiler de robots**, desarrollada inicialmente en el marco de un **proyecto de universidad**.  
Actualmente, el sistema utiliza **SendGrid en su plan gratuito** para el envío de correos electrónicos transaccionales (confirmaciones, notificaciones, avisos de alquiler, etc.).

Aunque el uso presente es limitado, la naturaleza del proyecto —un servicio digital con potencial de crecimiento— justifica analizar cuál sería la **suscripción óptima de SendGrid** a medio y largo plazo.

---

## 2. Uso actual de SendGrid

### Plan actual
- **Plan gratuito**
- Envío aproximado: **≤ 100 correos/día**
- Uso principal:
  - Correo de bienvenida a la aplicacion
  - Notificaciones básicas del servicio enviadas de manera manual


### Ventajas del plan gratuito
- Sin coste económico
- Suficiente para pruebas, desarrollo y validación del concepto
- Integración completa con la API v3 de SendGrid

### Limitaciones
- Límite diario de envíos
- Sin soporte técnico avanzado
- Falta de herramientas avanzadas de análisis y entregabilidad
- No escalable para un servicio en producción real

---

## 3. Previsión de crecimiento del proyecto

Dado que se trata de una **aplicación muy novedosa**, es razonable prever:

- Incremento progresivo de usuarios registrados
- Automatización de comunicaciones:
  - Confirmaciones de reservas
  - Avisos de disponibilidad
  - Recordatorios de devolución
  - Incidencias y alertas
- Mayor dependencia del correo como canal crítico del servicio

Un crecimiento moderado (por ejemplo, 1.000–5.000 usuarios activos) podría generar fácilmente **varios miles de correos mensuales**, superando ampliamente el límite del plan gratuito.

---

## 4. Requisitos funcionales futuros

Para una versión madura del servicio, se identifican los siguientes requisitos:

- Mayor volumen de envío mensual
- Alta fiabilidad en correos transaccionales
- Monitorización de errores y rebotes
- Capacidad de recuperación ante errores de envío (429, backoff, etc.)

---

## 5. Suscripción óptima 

### Plan recomendado
**SendGrid Essentials (plan de pago básico)**

### Justificación
- Permite **decenas de miles de correos mensuales**
- Mantiene un coste bajo y asumible
- Incluye:
  - Estadísticas básicas
  - Mayor estabilidad de envío
  - Mejor reputación del dominio
- Compatible con el crecimiento gradual del proyecto

Este plan actúa como una **transición natural** entre un entorno educativo y una aplicación real en producción.

---

## 6. Análisis coste–beneficio

| Aspecto | Plan Gratuito | Plan Essentials |
|------|--------------|----------------|
| Coste | 0 € | Bajo |
| Escalabilidad | Muy limitada | Media |
| Uso en producción | No recomendado | Recomendado |
| Entregabilidad | Básica | Mejorada |
| Monitorización | Mínima | Incluida |
| Adecuación al proyecto | Solo fase escolar | Fase real |

**Conclusión:**  
El coste del plan Essentials se justifica claramente frente al riesgo de fallos de comunicación en un servicio automatizado como el alquiler de robots.

---

## 7. Riesgos de mantener el plan gratuito

- Bloqueo de envíos en picos de uso
- Mala experiencia de usuario por correos no entregados
- Imposibilidad de escalar el sistema
- Dependencia excesiva de un entorno pensado solo para pruebas7desarrollo
