# Usuarios y roles

## Objetivo
Controlar el acceso al sistema mediante autenticación obligatoria y roles de usuario, exigir la aprobación de un Socio antes de que un usuario recién registrado pueda ingresar, y permitir que un Socio habilite o deshabilite el acceso de otros usuarios.

## Alcance
- Exigir sesión iniciada para acceder a cualquier endpoint de la API, salvo los públicos (registro, login, recuperación de contraseña, verificación de email).
- Tres roles posibles: **Socio** (`superuser`), **Administrator** (`administrator`) y **Employee** (`employee`, reservado para una etapa futura, sin reglas propias todavía).
- Socio y Administrator tienen hoy el mismo acceso a los módulos de negocio (clientes, facturas, compras, cheques, banco, gastos, etc.). La única diferencia real es la gestión de usuarios, exclusiva de Socio.
- Todo usuario nuevo se crea **inactivo** (`is_active=False`) y no puede iniciar sesión hasta que un Socio lo apruebe explícitamente.
- Notificar por email a los Socios activos cuando un usuario nuevo verifica su email y queda pendiente de revisión.
- Indicar visualmente en la gestión de Usuarios quién está pendiente de aprobación, distinguiéndolo de un usuario dado de baja (ambos están inactivos, pero por motivos distintos).
- Listar usuarios y cambiar su estado (activo/inactivo), exclusivo del rol Socio.
- Cambiar el rol de un usuario entre Administrator y Employee, exclusivo del rol Socio.
- Bloquear que el autoregistro público asigne un rol privilegiado (Socio o Administrator).
- La creación de cuentas Socio no pasa por la API: se hace manualmente (Django admin/shell) por el equipo de desarrollo. Ningún endpoint permite otorgar ni modificar el rol `superuser`.

No incluye (pendiente de otra etapa):
- Reporte de Ganancias (usará el mismo control de rol Socio cuando se implemente).
- Permisos diferenciados por rol en los módulos de negocio (hoy no aporta, porque Socio y Administrator acceden igual).
- Rechazar/eliminar automáticamente registros nunca verificados ni revisados (hoy quedan pendientes indefinidamente hasta que un Socio decida).

## Flujo de uso
1. Un usuario se registra en `/api/auth/register/`. El rol queda siempre en `employee` (sin importar qué se envíe en el request) y el usuario queda **inactivo**, pendiente de aprobación. Recibe un email con un código de verificación.
2. El usuario verifica su email en `/api/auth/verify-email/`. Recién en ese momento se notifica por email a todos los Socios activos, con los datos del usuario nuevo y un link directo a la gestión de Usuarios.
3. Mientras esté inactivo, cualquier intento de login devuelve el mismo mensaje genérico que unas credenciales inválidas ("Credenciales inválidas.") — no revela si la cuenta existe, ni si está pendiente de aprobación o directamente deshabilitada.
4. Un Socio puede consultar `GET /api/auth/users/` para ver el listado completo de usuarios (activos e inactivos). En pantalla, la fila de un usuario pendiente de aprobación aparece resaltada y su Estado dice "Pendiente".
5. Un Socio decide el estado de un usuario con `PATCH /api/auth/users/<id>/status/`, enviando `{"is_active": true}` (aprobar) o `{"is_active": false}` (rechazar/deshabilitar). Esa es la primera y única vez que ese usuario deja de estar "pendiente": a partir de ahí su Estado siempre se muestra como Activo o Inactivo, nunca vuelve a leerse como pendiente aunque se lo deshabilite más adelante.
6. Un Socio no puede deshabilitarse a sí mismo (se bloquea con 400 para evitar quedar sin acceso).
7. Un Socio puede promover a un Employee a Administrator (o degradarlo) con `PATCH /api/auth/users/<id>/role/`, enviando `{"role": "administrator"}` o `{"role": "employee"}`.
8. Las cuentas Socio se crean fuera de la API (por el equipo de desarrollo). Ningún endpoint permite ascender a alguien a `superuser`, ni modificar el rol de un usuario que ya es `superuser`.

## Validaciones importantes
- Todos los endpoints de la API requieren sesión iniciada por defecto (`DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`), excepto los explícitamente públicos.
- El campo `role` es de solo lectura en el registro público: cualquier valor enviado se ignora y el usuario se crea como `employee`.
- El registro público siempre crea el usuario con `is_active=False`, sin importar qué se envíe en el request.
- Gestión de usuarios (`GET /api/auth/users/`, `PATCH /api/auth/users/<id>/status/`, `PATCH /api/auth/users/<id>/role/`) requiere rol `superuser`; ni siquiera Administrator puede leer ese listado.
- Un usuario no puede deshabilitarse a sí mismo.
- Un usuario inactivo (`is_active=False`, sea "pendiente" o "dado de baja") no puede iniciar sesión: Django descarta el intento a nivel del backend de autenticación (`ModelBackend`) antes de llegar a cualquier chequeo propio, y el mensaje que se devuelve es el mismo que el de credenciales inválidas.
- Un usuario "pendiente de aprobación" se distingue de uno "dado de baja" por el campo `approved_at`: `None` significa que ningún Socio decidió todavía su estado; una vez seteado (la primera vez que se llama a `/status/` para ese usuario, sea cual sea el resultado), no se vuelve a borrar.
- El cambio de rol solo acepta `administrator` o `employee`; cualquier otro valor (incluido `superuser`) devuelve 400.
- El cambio de rol no puede aplicarse sobre un usuario que ya es `superuser`.

## Pantallas involucradas
- **Gestión de Usuarios** (`/user`, solo Socio): listado con columnas Nombre, Email, Rol, Estado y Fecha de alta.
  - La columna Rol y la columna Estado son selects inline (pill + flecha) en vez de un formulario aparte: Rol ofrece Administrador/Empleado, Estado ofrece Activo/Inactivo.
  - Un usuario pendiente de aprobación se ve con la fila resaltada (fondo y borde naranja) y su Estado en pill naranja "Pendiente" — no es una opción elegible del select, solo el rótulo inicial hasta que un Socio decida.
  - Un Socio no puede cambiarse el rol ni el estado a sí mismo, ni a otro Socio, desde esta pantalla (se muestran como texto fijo, sin select).

## Endpoints involucrados
- `POST /api/auth/register/` — Registro público, rol forzado a `employee`, usuario creado inactivo.
- `POST /api/auth/verify-email/` — Verifica el código de email; si es la primera verificación exitosa, dispara el email de notificación a los Socios.
- `GET /api/auth/users/` — Listado de usuarios (solo Socio).
- `PATCH /api/auth/users/<id>/status/` — Habilita o deshabilita un usuario de forma explícita, según `{"is_active": true|false}` (solo Socio).
- `PATCH /api/auth/users/<id>/role/` — Cambia el rol de un usuario entre `administrator` y `employee` (solo Socio).

## Consideraciones
- Este cambio cierra un hueco de seguridad existente: antes de esta funcionalidad, la API no exigía sesión iniciada en ningún módulo de negocio (clientes, facturas, compras, etc.), porque Django REST Framework no tenía configurado ningún permiso por defecto.
- Los emails de esta funcionalidad (bienvenida con código de verificación, recuperación de contraseña, notificación de usuario pendiente) comparten un mismo layout base (`autenticacion/templates/emails/base_email.html`), con la paleta de colores del sitio. Cualquier cambio de estilo ahí impacta a los tres.
- Cuando se defina qué puede hacer el rol Employee, va a ser necesario revisar módulo por módulo qué acceso le corresponde — hoy esa diferenciación no existe porque Employee no está en uso.
