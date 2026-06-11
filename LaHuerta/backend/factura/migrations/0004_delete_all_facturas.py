from django.db import migrations


def delete_all_bills(apps, schema_editor):
    Factura = apps.get_model("factura", "Factura")
    Factura.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("factura", "0003_factura_factura_asociada"),
    ]

    operations = [
        migrations.RunPython(delete_all_bills, migrations.RunPython.noop),
    ]
