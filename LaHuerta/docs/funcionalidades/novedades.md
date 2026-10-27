# Novedades de la plataforma

## Objetivo
Avisar a cada usuario, dentro de la aplicación, los cambios funcionales nuevos de la plataforma y llevar registro de quién ya los vio. Ver DEV-137.

## Alcance
- Cargar novedades con una migración de datos de la app `novedad`, junto con el cambio funcional que anuncian (también se pueden cargar o corregir desde el admin de Django).
- Listar las novedades pendientes de un usuario para el Inicio: vigentes y que todavía no marcó como vistas.
- Listar el historial completo del usuario: vistas y no vistas, vigentes y vencidas.
- Marcar una novedad como vista ("Entendido") para un usuario.
- Dirigir una novedad a un solo rol (ej. solo administración) o a todos.

No incluye: los tutoriales y el botón "Ver cómo se usa" (DEV-138).

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
La carga el desarrollador en la misma rama del cambio funcional, con una migración de datos (ver la regla `.claude/rules/platform-news.md`):
1. Crear `backend/novedad/migrations/00XX_novedad_<tema>.py` con título, descripción, fecha de publicación, vigente hasta (publicación + 30 días por defecto) y, si aplica, pantalla y rol destino.
2. La novedad llega a producción con el deploy, al aplicarse las migraciones. Si la fecha de publicación es futura, aparece recién ese día.

El admin de Django (**Novedades**) queda para corregir o desactivar una novedad ya publicada. Si se carga desde ahí y **vigente hasta** queda vacío, se completa con publicación + 30 días.

### Ver y marcar una novedad
1. El usuario entra al Inicio y, entre los avisos de cumpleaños y las tarjetas de acceso, ve el carrusel **Novedades** con sus pendientes (máximo 3, las más recientes).
2. El carrusel muestra una novedad a la vez y pasa solo a la siguiente cada 7 segundos. Se pausa con el mouse encima o al tocarlo en el celular, y se puede cambiar con las flechas, los puntos o deslizando.
3. **Ir a …** lleva a la pantalla de la novedad.
4. Con **Entendido** la novedad se marca como vista para ese usuario y sale del carrusel. A los demás usuarios les sigue apareciendo.
5. Desde **Ver todas las novedades** consulta el historial completo (`/news`), con filtros Todas / No vistas / Vigentes / Vencidas. El historial es solo de consulta.

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
- Inicio: carrusel de novedades (`components/NewsPanel`).
- Todas las novedades: historial (`pages/novedad/NewsHistory.jsx`, ruta `/news`).

## Consideraciones
- Las novedades iniciales se cargan con la migración `0002_novedades_iniciales`: facturar a clientes sin lista de precios (DEV-135), vacíos por proveedor (DEV-123), listas de precios por producto (DEV-117) y carga masiva de compras (DEV-121), publicadas el 26/10/2026.
- Cada cambio funcional lleva su novedad; los ajustes visuales chicos no.
- Si no hay novedades pendientes, el carrusel no aparece. Con una sola, no muestra flechas ni puntos.
- Con la opción "reducir movimiento" del sistema operativo el carrusel no avanza solo.
