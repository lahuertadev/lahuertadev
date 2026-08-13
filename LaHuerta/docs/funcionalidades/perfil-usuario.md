# Perfil de usuario

## Objetivo
Permitir que cualquier usuario autenticado consulte y edite sus propios datos de cuenta (self-service), cambie su contraseña y suba una foto de perfil, sin depender de un Socio ni de otro módulo.

## Alcance
- Pantalla `/profile`, accesible desde el menú de cuenta (ícono de usuario, arriba a la derecha) para cualquier usuario logueado, sin restricción de rol.
- Datos de solo lectura: email, nombre de usuario, rol (con el mismo badge de color por rol que ya se usa en el header y en la lista de Usuarios: violeta Socio, azul Administrador, gris Empleado) y fecha de alta de la cuenta.
- Datos editables: nombre, apellido, fecha de nacimiento, domicilio y teléfono.
- Cambio de contraseña, reutilizando la misma validación en vivo (checklist de requisitos e indicador de coincidencia) que ya existe en registro y en reseteo de contraseña.
- Subida y recorte circular de foto de perfil, reflejada tanto en la pantalla de perfil como en el ícono de cuenta del header.
- Las tres acciones (datos personales, contraseña, foto) se guardan de forma independiente entre sí.
- Recordatorios de cumpleaños y aniversario laboral en la Home, de **todo el equipo** (no solo el usuario logueado): cualquier usuario activo cuyo cumpleaños (`birth_date`) o aniversario de ingreso (`date_joined`) caiga hoy o dentro de los próximos 7 días aparece en un banner. El día exacto, el mensaje saluda directamente; los días previos, muestra la cuenta regresiva. Cuando el destinatario es el propio usuario logueado, el mensaje se personaliza en segunda persona ("Tu cumpleaños es...", "Hoy cumplís...").

No incluye (pendiente de otra etapa):
- Edición de email, nombre de usuario o rol desde esta pantalla (son de solo lectura; su cambio, si se necesita, requeriría un flujo aparte).
- Persistencia garantizada del archivo de avatar entre despliegues en producción: hoy se guarda en disco local (`MEDIA_ROOT`) del contenedor backend. Falta confirmar si el entorno de producción actual usa un volumen persistente o si el archivo se pierde en cada deploy; si no persiste, habría que migrar a un storage externo (ej. S3).

## Flujo de uso
1. El usuario hace clic en "Perfil" desde el menú de cuenta del header.
2. La pantalla `/profile` precarga los datos del usuario logueado (vienen del mismo `GET /api/auth/me/` que usa `RequireAuth` para proteger las rutas).
3. En la sección "Datos Personales", el usuario edita los campos que quiera y guarda con `PATCH /api/auth/me/`. La respuesta actualiza el estado global de sesión (`AuthContext`), por lo que el nombre mostrado en el header se actualiza al instante.
4. En la sección "Cambiar Contraseña", el usuario ingresa su contraseña actual y la nueva (dos veces), con el mismo checklist de requisitos e indicador de coincidencia que en registro/reseteo. Se envía a `POST /api/auth/password-change/` (endpoint preexistente, sin cambios).
5. En la sección "Foto de Perfil", el usuario selecciona un archivo de imagen, lo recorta en un modal circular (`react-easy-crop`) y confirma. El recorte se sube como JPEG a `POST /api/auth/me/avatar/` (multipart). La respuesta actualiza el avatar en la pantalla y en el ícono de cuenta del header.
6. Al entrar a la Home, el frontend pide `GET /api/auth/celebrations/` y muestra un banner por cada cumpleaños o aniversario laboral de un usuario activo que caiga hoy o dentro de los próximos 7 días (ej. "🎂 El cumpleaños de Juan Gomez es en 3 días", "🎉 ¡Hoy Juan Gomez cumple 3 años en La Huerta!"). El cálculo (días restantes, años de antigüedad) lo hace el backend; el frontend solo arma el texto y distingue si el destinatario es el propio usuario logueado para personalizar el mensaje.

## Validaciones importantes
- Todos los endpoints de esta funcionalidad requieren sesión iniciada (`IsAuthenticated`); no hay restricción de rol adicional en ninguno, ya que tanto la edición del propio perfil como la visibilidad de cumpleaños/aniversarios del equipo son de acceso general (no exclusivas de Socio).
- `PATCH /api/auth/me/` solo admite `first_name`, `last_name`, `birth_date`, `address`, `phone`. Cualquier otro campo enviado (ej. `role`, `email`) se ignora — el serializer no los expone.
- El cambio de contraseña reutiliza las reglas ya existentes (`validate_password_strength`): mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial, y que la confirmación coincida.
- `POST /api/auth/me/avatar/` requiere un archivo de imagen válido (`ImageField`); si no se envía o no es una imagen, devuelve 400.
- `GET /api/auth/celebrations/` solo considera usuarios activos (`is_active=True`) y solo cuenta aniversario laboral a partir del primer año cumplido (no avisa antes). No expone el año de nacimiento (edad) de nadie: solo cuántos días faltan.

## Endpoints involucrados
- `GET /api/auth/me/` — Devuelve el perfil completo del usuario autenticado (ampliado en esta funcionalidad: antes solo devolvía `id, email, role, first_name, last_name`; ahora suma `username, date_joined, birth_date, address, phone, avatar`).
- `PATCH /api/auth/me/` — Actualiza los datos personales del propio usuario (nuevo).
- `POST /api/auth/me/avatar/` — Sube o reemplaza la foto de perfil del propio usuario (nuevo).
- `POST /api/auth/password-change/` — Cambia la contraseña del usuario autenticado (preexistente, sin cambios).
- `GET /api/auth/celebrations/` — Devuelve cumpleaños y aniversarios laborales de usuarios activos que caen hoy o dentro de los próximos 7 días, ordenados por cercanía (nuevo). Cada ítem: `user_id, first_name, last_name, type ('birthday'|'anniversary'), days_until` y, solo en aniversarios, `years`.

## Pantallas involucradas
- `Header` (menú de cuenta): el ícono "Perfil" ahora navega a `/profile` en lugar de mostrar un alert de "próximamente"; el ícono de cuenta del AppBar muestra el avatar real si existe.
- `Profile` (`/profile`): pantalla nueva, formulario grande con secciones tipo card (mismo patrón que el formulario de Clientes).
- `Home` (`/`): suma uno o más banners de cumpleaños/aniversario del equipo, descriptos arriba, encima de las cards existentes.

## Consideraciones
- El campo `role` sigue siendo de solo lectura en toda la app: ni el registro público ni esta pantalla permiten que un usuario se autoasigne o cambie su propio rol (ver [usuarios-roles.md](./usuarios-roles.md)).
- Esta es la primera funcionalidad del proyecto que sube archivos: se agregó `MEDIA_URL`/`MEDIA_ROOT` a `settings.py` (no existía antes) y se sirve `MEDIA_URL` solo en `DEBUG=True`. En producción, el servidor web (no Django) debería servir esos archivos — verificar configuración vigente si se despliega esta funcionalidad.
- El test `test_me_view_returns_only_expected_fields` de `autenticacion` se actualizó a propósito: el contrato de `GET /api/auth/me/` cambió (más campos) como parte de esta funcionalidad.
- Se decidió explícitamente que mostrar la fecha de cumpleaños del equipo a cualquier usuario autenticado no representa un problema de privacidad (práctica común en otras empresas); por eso `GET /api/auth/celebrations/` no requiere rol `superuser` ni ningún otro.
- El 29 de febrero se aproxima al 28 de febrero en años no bisiestos, tanto para cumpleaños como para aniversarios (`_next_occurrence` en `autenticacion/utils.py`).
