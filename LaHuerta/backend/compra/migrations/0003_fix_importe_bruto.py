from django.db import migrations


def set_importe_to_gross(apps, schema_editor):
    # Los registros existentes tienen importe = subtotal - senia.
    # El nuevo modelo requiere importe = subtotal (bruto), por lo que
    # hay que sumarle la seña a cada registro.
    Compra = apps.get_model('compra', 'Compra')
    for compra in Compra.objects.all():
        compra.importe = compra.importe + compra.senia
        compra.save(update_fields=['importe'])


def revert_importe_to_net(apps, schema_editor):
    Compra = apps.get_model('compra', 'Compra')
    for compra in Compra.objects.all():
        compra.importe = compra.importe - compra.senia
        compra.save(update_fields=['importe'])


class Migration(migrations.Migration):

    dependencies = [
        ('compra', '0002_remove_compra_bultos'),
    ]

    operations = [
        migrations.RunPython(set_importe_to_gross, reverse_code=revert_importe_to_net),
    ]
