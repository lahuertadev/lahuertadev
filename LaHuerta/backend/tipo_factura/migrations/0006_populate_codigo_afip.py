from django.db import migrations

AFIP_CODE_BY_ABREVIATURA = {
    "A": 1,
    "B": 6,
    "NCA": 3,
    "NCB": 8,
    "NDA": 2,
    "NDB": 7,
}


def populate_codigo_afip(apps, schema_editor):
    TipoFactura = apps.get_model('tipo_factura', 'TipoFactura')
    for obj in TipoFactura.objects.all():
        codigo = AFIP_CODE_BY_ABREVIATURA.get(obj.abreviatura)
        if codigo is not None:
            obj.codigo_afip = codigo
            obj.save(update_fields=['codigo_afip'])


def reverse_populate(apps, schema_editor):
    TipoFactura = apps.get_model('tipo_factura', 'TipoFactura')
    TipoFactura.objects.all().update(codigo_afip=None)


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_factura', '0005_tipofactura_codigo_afip'),
    ]

    operations = [
        migrations.RunPython(populate_codigo_afip, reverse_populate),
    ]
