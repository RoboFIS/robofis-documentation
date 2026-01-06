#  Descripción del API REST - Microservicio de Usuarios

##  Definición y Acceso
El microservicio expone una interfaz **RESTful** accesible a través del puerto `3002`. Se ha configurado un prefijo global de versionado, por lo que todos los endpoints responden bajo la ruta base `/api/v1`.

Además, el servicio autogenera su propia documentación interactiva utilizando **Swagger (OpenAPI)**, facilitando la integración con otros servicios y el frontend.

* **Base URL:** `http://localhost:3002/api/v1`
* **Swagger Docs:** `http://localhost:3002/api/v1/docs/users`

---

##  Catálogo de Recursos

La API se estructura en controladores temáticos que separan las responsabilidades de autenticación, gestión de clientes, lógica de negocio/pagos y administración de staff.

### 1. Autenticación (Auth & Security)
*Controlador encargado de la emisión de credenciales (JWT).*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `login` | Autenticación para **Clientes**. Retorna JWT con rol de suscripción. |
| `POST` | `/auth/login/staff` | `loginStaff` | Autenticación para **Staff**. Retorna JWT con rol administrativo (Admin/Employee). |

### 2. Gestión de Usuarios (Clients)
*Operaciones CRUD y de perfil sobre la entidad `User`.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | `createUser` | Registro público de nuevos usuarios. |
| `GET` | `/users/profile` | `getProfile` | Obtiene los datos del usuario logueado (basado en Token). |
| `GET` | `/users/:id` | `getUser` | Consulta de detalle de un usuario específico. |
| `GET` | `/users` | `getAllUsers` | Listado global de usuarios (**Solo Admin/Staff**). |
| `PUT` | `/users/:id/address` | `updateAddress` | Reemplazo completo de la dirección física. |
| `PUT` | `/users/:id/phone` | `updatePhone` | Reemplazo del teléfono de contacto. |
| `DELETE`| `/users/:id` | `deleteUser` | Baja del usuario en el sistema (**GDPR**). |

### 3. Lógica de Negocio y Tokens (Wallet)
*Endpoints transaccionales para gestión de saldo e integración con Microservicio de Alquileres.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| **Gestión Interna** | | | |
| `PATCH` | `/users/:id/tier` | `updateTier` | Modificación del plan de suscripción. |
| `POST` | `/users/:id/tokens/purchase`| `purchaseTokens`| Compra de saldo por parte del usuario (Pasarela). |
| `POST` | `/users/:id/tokens/consume` | `consumeTokens` | Gasto de saldo (Uso genérico interno). |
| `POST` | `/users/:id/tokens/refill` | `refillTokens` | Recarga manual administrativa (**Solo Admin**). |
| `PATCH` | `/users/:id/block` | `blockUser` | Bloqueo preventivo de cuenta por impago/fraude. |
| `PATCH` | `/users/:id/unblock` | `unblockUser` | Restauración de acceso. |
| **Integración MS Alquiler** | | | |
| `GET` | `/users/:id/credits` | `checkBalance` | Consulta de saldo (Interfaz pública para MS Alquiler). |
| `POST` | `/users/:id/credits/charge` | `chargeTokens` | Cobro de reserva (Interfaz pública para MS Alquiler). |
| `POST` | `/users/:id/credits/refund` | `refundTokens` | Reembolso por cancelación (Interfaz pública para MS Alquiler). |

### 4. Gestión Organizativa (Staff)
*Endpoints protegidos para la administración de empleados.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/org-users` | `create` | Alta de nuevos empleados o administradores. |
| `GET` | `/org-users` | `findAll` | Listado de la plantilla de la organización. |
| `DELETE`| `/org-users/:id` | `delete` | Baja de empleados. |

---

##  Códigos de Estado HTTP

Se respetan las convenciones estándar para informar el resultado de la operación:

*  **`200 OK`**: Petición procesada correctamente (Lecturas, Actualizaciones).
*  **`201 Created`**: Creación exitosa de recursos (Registro, Login, Compra).
*  **`400 Bad Request`**: Error de validación (DTO) o datos de entrada incorrectos.
*  **`401 Unauthorized`**: Falta token JWT o es inválido.
*  **`403 Forbidden`**: El usuario tiene token válido pero no tiene permisos (Ej: Cliente intentando acceder a ruta Admin).
* Search **`404 Not Found`**: Usuario o recurso no encontrado en BD.

---

##  Ubicación de Controladores

* **Auth Controller:** `src/user/interface/http/controllers/auth.controller.ts`
* **Users Controller:** `src/user/interface/http/controllers/users.controller.ts`
* **Staff Controller:** `src/org-user/interface/http/org-user.controller.ts`