# Novedades de la plataforma

## Objetivo
Avisar a cada usuario, dentro de la aplicación, los cambios funcionales nuevos de la plataforma y llevar registro de quién ya los vio. Ver DEV-137.

## Alcance
- Cargar novedades desde el admin de Django (no hay pantalla de alta propia por ahora).
- Listar las novedades pendientes de un usuario para el Inicio: vigentes y que todavía no marcó como vistas.
- Listar el historial completo del usuario: vistas y no vistas, vigentes y vencidas.
- Marcar una novedad como vista ("Entendido") para un usuario.
- Dirigir una novedad a un solo rol (ej. solo administración) o a todos.

No incluye: la sección visual del Inicio ni la pantalla de historial (frontend), ni los tutoriales (DEV-138).

## Qué se anuncia
Solo cambios **funcionales** (ej. facturar a clientes sin lista de precios). Los ajustes visuales chicos que se entienden solos (textos cortados con "…", orden de botones en formularios) no se cargan como novedad.

## Datos

| Tabla | Qué guarda |
|---|---|
| `novedad` | Una fila por novedad: título, descripción, fecha de publicación, vigente hasta, pantalla (nombre y ruta) opcional, clave de tutorial opcional, rol destino opcional y si está activa. |
| `novedad_usuario` | Una fila por cada usuario que marcó una novedad como vista, con la fecha y hora (`vista_en`). Un usuario no puede tener dos filas para la misma novedad. |

Que un usuario **no tenga fila** en `novedad_usuario` para una novedad significa que todavía no la vio.

## Flujo de uso

### Publicar una novedad
1. Entrar al admin de Django → **Novedades** → **Agregar**.
2. Completar título, descripción y fecha de publicación. Opcionalmente: pantalla (nombre que se muestra en "Ir a …" y ruta del frontend, ej. `/bill/`), clave de tutorial y rol destino.
3. Dejar **vigente hasta** vacío para usar el default (publicación + 30 días), o cargar otra fecha (ej. 15 días para un ajuste chico, 45-60 para un cambio grande).
4. Guardar. Si la fecha de publicación es futura, la novedad aparece recién ese día.

### Ver y marcar una novedad
1. El usuario entra al Inicio y ve sus novedades pendientes, las más recientes primero.
2. Con **Entendido** la novedad se marca como vista para ese usuario y deja de aparecerle en el Inicio. A los demás usuarios les sigue apareciendo.
3. Desde **Ver todas las novedades** consulta el historial completo, con cuáles vio y cuáles siguen vigentes.

## Validaciones y reglas importantes
- **Vigencia:** una novedad es vigente si `fecha_publicacion <= hoy <= vigente_hasta`. Se evalúa al consultar; no hay proceso programado que active o desactive novedades.
- **Pendiente (Inicio):** activa, vigente, del rol del usuario (o para todos) y sin registro de vista de ese usuario.
- **Historial:** activa, ya publicada y del rol del usuario. Incluye vistas y vencidas.
- **Rol destino:** vacío = la ven todos. Con un rol, solo la ven los usuarios de ese rol. El superusuario ve todas.
- **Marcar como vista** solo con "Entendido" (completar un tutorial no la marca). Repetirlo no duplica el registro. Marcar una novedad inexistente o de otro rol devuelve 404.
- **Activa = No** oculta la novedad del Inicio y del historial sin borrarla.

## Endpoints involucrados
- `GET /api/news/?pending=true` — novedades pendientes para el Inicio.
- `GET /api/news/` — historial completo del usuario, con `seen` (la vio) e `is_current` (está vigente).
- `POST /api/news/{id}/mark-seen/` — marca la novedad como vista (204).

## Pantallas involucradas
- Admin de Django → Novedades (carga).
- Inicio y pantalla de historial de novedades (frontend, pendiente).

## Consideraciones
- La primera novedad (DEV-135, facturar a clientes sin lista de precios) se carga con una migración de datos de la app `novedad`.
- Hay que definir quién redacta y publica las novedades en cada deploy.
