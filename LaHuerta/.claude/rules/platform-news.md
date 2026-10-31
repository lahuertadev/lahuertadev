# Novedades de la plataforma

Aplicar esta regla al terminar cualquier funcionalidad nueva o cambio funcional (ver DEV-137 y `docs/funcionalidades/novedades.md`).

## Principio
Cada cambio funcional que se entrega lleva su novedad, para que los usuarios se enteren desde el Inicio. La carga el desarrollador **en el código, con una migración de datos** de la app `novedad`, en la misma rama que el cambio. No se deja para cargarla a mano en el admin después del deploy.

## Cuándo corresponde
Sí:
- funcionalidad nueva (pantalla, flujo, acción nueva);
- cambio en un flujo existente que el usuario tiene que conocer (ej. facturar a clientes sin lista de precios);
- cambio de una regla de negocio visible (validaciones, cálculos, permisos).

No:
- ajustes visuales que se entienden solos (textos cortados con "…", colores, orden de botones, espaciados);
- refactors, fixes internos o cambios técnicos sin impacto en el uso.

Si hay dudas, preguntar al usuario antes de crearla.

## Cómo crearla
Una migración nueva en `backend/novedad/migrations/`, con `RunPython` y función de reversa. Referencia: `0002_novedades_iniciales.py` (varias novedades en una migración).

```python
from datetime import date, timedelta
from django.db import migrations

PUBLISHED_AT = date(2026, 10, 26)
TITLE = 'Facturar a clientes sin lista de precios'


def create_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.create(
        titulo=TITLE,
        descripcion='Ahora un cliente puede no tener lista de precios asignada. ...',
        fecha_publicacion=PUBLISHED_AT,
        vigente_hasta=PUBLISHED_AT + timedelta(days=30),
        pantalla_nombre='Facturación',
        pantalla_url='/bill/',
    )


def delete_news(apps, schema_editor):
    Novedad = apps.get_model('novedad', 'Novedad')
    Novedad.objects.filter(titulo=TITLE, fecha_publicacion=PUBLISHED_AT).delete()


class Migration(migrations.Migration):
    dependencies = [('novedad', '<última migración de novedad>')]
    operations = [migrations.RunPython(create_news, delete_news)]
```

- Nombre del archivo: `00XX_novedad_<tema>.py` (ej. `0004_novedad_tutoriales.py`).
- Una novedad por cambio funcional; si la rama trae varios, una migración puede crear varias.
- `vigente_hasta` va **calculado en la migración** con el número literal: el modelo histórico no ejecuta `Novedad.save()` y las migraciones no importan constantes de la app (ver `backend-architecture.md`). 30 días por defecto; 15 para un cambio chico, 45-60 para uno grande en un flujo central.
- `fecha_publicacion`: la fecha en que se espera que salga a producción. Si el deploy se demora, actualizarla antes de mergear, para que la vigencia cuente desde que el usuario puede usar el cambio.

## Contenido
- **titulo:** corto, en lenguaje de negocio, qué se puede hacer ahora (máx. 120 caracteres).
- **descripcion:** una o dos oraciones para el usuario, sin términos técnicos (máx. 500 caracteres; en el Inicio se ven dos líneas).
- **pantalla_nombre / pantalla_url:** la pantalla donde se usa el cambio (ruta del frontend, ej. `/bill/`). Vacíos si no aplica a una pantalla.
- **rol_destino:** vacío si es para todos; un rol (`administrator`, `employee`) si solo lo usa ese rol.
- **tutorial:** el tutorial guiado del cambio, si tiene (DEV-138): en la migración, `Tutorial.objects.filter(clave='...').first()` con `apps.get_model('tutorial', 'Tutorial')`, y la migración depende de la de `tutorial` que lo crea. En el Inicio se ofrece "Ver tutorial" mientras el usuario no lo complete.

## Al proponer o cerrar una implementación
Indicar, igual que con la documentación funcional:
- si el cambio lleva novedad o no, y por qué;
- el título y la descripción propuestos, para que el usuario los apruebe antes de commitear.
