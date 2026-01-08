  # Nivel de acabado — Microservicio de Usuarios

  Nos presentamos al **nivel de acabado de 10 puntos**.

  ### Cobertura por nivel
  - [x] Microservicio básico: cumplido.
  - [x] Microservicio avanzado: cumplido (6/6).
  - [x] Aplicación basada en microservicios básica: cumplida.
  - [x] Aplicación basada en microservicios avanzada: cumplida (4/4).

  ### Características avanzadas del microservicio (6/6)
  - [x] Frontend con rutas y navegación (SPA React con react-router-dom).
  - [x] Materialized View de `activeRentals` mantenida por eventos del Rental Service.
  - [x] Consumo de API externa (DiceBear para generación de avatares).
  - [x] Autenticación basada en JWT (Passport con roles y guards).
  - [x] Throttling / Rate limiting (protección global contra fuerza bruta).
  - [x] Arquitectura CQRS (commands/queries separados con repositorios segregados).

  ### Características avanzadas de la aplicación (4/4)
  - [x] Add-ons al plan de precios (compra de paquetes de tokens).
  - [x] API Gateway con funcionalidad avanzada (autenticación JWT global, roles, enrutado).
  - [x] Comunicación asíncrona mediante sistema de cola de mensajes (RabbitMQ) para todos los microservicios.
  - [x] Mecanismo para deshacer transacciones distribuidas (Patrón SAGA con compensación).