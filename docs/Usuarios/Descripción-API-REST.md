## Descripción del API REST del microservicio

- **Definición y Acceso**:
  El microservicio expone una interfaz **RESTful** accesible a través del puerto `3002`. Se ha configurado un prefijo global de versionado, por lo que todos los endpoints responden bajo la ruta base `/api/v1`.
  
  Además, el servicio autogenera su propia documentación interactiva utilizando **Swagger (OpenAPI)**, disponible en `/api/v1/docs/users`, lo que facilita la integración del frontend.

- **Catálogo de Recursos**:
  La API se estructura en controladores temáticos que separan las responsabilidades de autenticación, gestión de clientes y administración.

### 1. Autenticación (Auth & Security)
*Controlador encargado de la emisión de credenciales (JWT).*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | `login` | Autenticación para **Clientes**. Retorna JWT con rol de suscripción. |
| `POST` | `/login/staff` | `loginStaff` | Autenticación para **Staff**. Retorna JWT con rol administrativo (Admin/Employee). |

### 2. Gestión de Usuarios (Clients)
*Operaciones CRUD y de perfil sobre la entidad `User`.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | `createUser` | Registro público de nuevos usuarios. |
| `GET` | `/users/profile` | `getProfile` | Obtiene los datos del usuario logueado (basado en Token). |
| `GET` | `/users/:id` | `getUser` | Consulta de detalle de un usuario específico. |
| `GET` | `/users` | `getAllUsers` | Listado global de usuarios (Solo Admin). |
| `PUT` | `/users/:id/address` | `updateAddress` | Reemplazo completo de la dirección física. |
| `PUT` | `/users/:id/phone` | `updatePhone` | Reemplazo del teléfono de contacto. |
| `DELETE`| `/users/:id` | `deleteUser` | Baja del usuario en el sistema. |

### 3. Lógica de Negocio y Tokens
*Endpoints transaccionales que disparan eventos de dominio y gestión de saldo.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/users/:id/tier` | `updateTier` | Modificación del plan de suscripción. |
| `POST` | `/users/:id/tokens/purchase`| `purchaseTokens`| Compra de saldo por parte del usuario. |
| `POST` | `/users/:id/tokens/consume` | `consumeTokens` | Gasto de saldo (uso interno/alquileres). |
| `GET` | `/users/:id/credits` | `checkBalance` | Consulta rápida de saldo disponible. |
| `POST` | `/users/:id/tokens/refill` | `refillTokens` | Recarga manual administrativa. |
| `PATCH` | `/users/:id/block` | `blockUser` | Bloqueo preventivo de cuenta. |
| `PATCH` | `/users/:id/unblock` | `unblockUser` | Restauración de acceso. |

### 4. Gestión Organizativa (Staff)
*Endpoints protegidos para la administración de empleados.*

| Método | Endpoint Relativo | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/org-users` | `create` | Alta de nuevos empleados o administradores. |
| `GET` | `/org-users` | `findAll` | Listado de la plantilla de la organización. |
| `DELETE`| `/org-users/:id` | `delete` | Baja de empleados. |

- **Códigos de Estado HTTP**:
  Se respetan las convenciones estándar para informar el resultado de la operación:
  * **`201 Created`**: Creación exitosa (Registro) y generación de sesión (Login).
  * **`200 OK`**: Petición procesada correctamente.
  * **`400 Bad Request`**: Error de validación en los datos de entrada.
  * **`401 Unauthorized`**: Credenciales inválidas o token expirado.
  * **`403 Forbidden`**: Acceso denegado por falta de permisos (Roles).
  * **`404 Not Found`**: Recurso no encontrado.

- **Dónde**:
  * **Auth Controller**: `src/user/interface/http/controllers/login.controller.ts`
  * **Users Controller**: `src/user/interface/http/controllers/users.controller.ts`
  * **Staff Controller**: `src/org-user/interface/http/org-user.controller.ts`
  * **Swagger Config**: Disponible en `http://localhost:3002/api/v1/docs/users`