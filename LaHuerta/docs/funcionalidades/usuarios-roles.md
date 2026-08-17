# Usuarios y roles

## Objetivo
Controlar el acceso al sistema mediante autenticación obligatoria y roles de usuario, y permitir que un Socio habilite o deshabilite el acceso de otros usuarios.

## Alcance
- Exigir sesión iniciada para acceder a cualquier endpoint de la API, salvo los públicos (registro, login, recuperación de contraseña, verificación de email).
- Tres roles posibles: **Socio** (`superuser`), **Administrator** (`administrator`) y **Employee** (`employee`, reservado para una etapa futura, sin reglas propias todavía).
- Socio y Administrator tienen hoy el mismo acceso a los módulos de negocio (clientes, facturas, compras, cheques, banco, gastos, etc.). La única diferencia real es la gestión de usuarios, exclusiva de Socio.
- Listar usuarios y habilitar/deshabilitar su acceso, exclusivo del rol Socio.
- Cambiar el rol de un usuario entre Administrator y Employee, exclusivo del rol Socio.
- Bloquear que el autoregistro público asigne un rol privilegiado (Socio o Administrator).
- La creación de cuentas Socio no pasa por la API: se hace manualmente (Django admin/shell) por el equipo de desarrollo. Ningún endpoint permite otorgar ni modificar el rol `superuser`.

No incluye (pendiente de otra etapa):
- Reporte de Ganancias (usará el mismo control de rol Socio cuando se implemente).
- Permisos diferenciados por rol en los módulos de negocio (hoy no aporta, porque Socio y Administrator acceden igual).
- Pantallas de frontend para gestión de usuarios y ocultamiento de menús por rol.

## Flujo de uso
1. Un usuario se registra en `/api/auth/register/`. El rol queda siempre en `employee`, sin importar qué se envíe en el request.
2. Un Socio puede consultar `GET /api/auth/users/` para ver el listado completo de usuarios (activos e inactivos).
3. Un Socio puede togglear el acceso de otro usuario con `PATCH /api/auth/users/<id>/toggle-active/`. Un usuario deshabilitado no puede iniciar sesión.
4. Un Socio no puede deshabilitarse a sí mismo (se bloquea con 400 para evitar quedar sin acceso).
5. Un Socio puede promover a un Employee a Administrator (o degradarlo) con `PATCH /api/auth/users/<id>/role/`, enviando `{"role": "administrator"}` o `{"role": "employee"}`.
6. Las cuentas Socio se crean fuera de la API (por el equipo de desarrollo). Ningún endpoint permite ascender a alguien a `superuser`, ni modificar el rol de un usuario que ya es `superuser`.

## Validaciones importantes
- Todos los endpoints de la API requieren sesión iniciada por defecto (`DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`), excepto los explícitamente públicos.
- El campo `role` es de solo lectura en el registro público: cualquier valor enviado se ignora y el usuario se crea como `employee`.
- Gestión de usuarios (`GET /api/auth/users/`, `PATCH /api/auth/users/<id>/toggle-active/`, `PATCH /api/auth/users/<id>/role/`) requiere rol `superuser`; ni siquiera Administrator puede leer ese listado.
- Un usuario no puede deshabilitarse a sí mismo.
- Un usuario deshabilitado (`is_active=False`) no puede iniciar sesión (regla ya existente, reutilizada).
- El cambio de rol solo acepta `administrator` o `employee`; cualquier otro valor (incluido `superuser`) devuelve 400.
- El cambio de rol no puede aplicarse sobre un usuario que ya es `superuser`.

## Endpoints involucrados
- `POST /api/auth/register/` — Registro público, rol forzado a `employee`.
- `GET /api/auth/users/` — Listado de usuarios (solo Socio).
- `PATCH /api/auth/users/<id>/toggle-active/` — Habilita/deshabilita un usuario (solo Socio).
- `PATCH /api/auth/users/<id>/role/` — Cambia el rol de un usuario entre `administrator` y `employee` (solo Socio).

## Consideraciones
- Este cambio cierra un hueco de seguridad existente: antes de esta funcionalidad, la API no exigía sesión iniciada en ningún módulo de negocio (clientes, facturas, compras, etc.), porque Django REST Framework no tenía configurado ningún permiso por defecto.
- Cuando se defina qué puede hacer el rol Employee, va a ser necesario revisar módulo por módulo qué acceso le corresponde — hoy esa diferenciación no existe porque Employee no está en uso.
