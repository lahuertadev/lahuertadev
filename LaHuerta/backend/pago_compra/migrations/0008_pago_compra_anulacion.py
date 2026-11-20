from django.db import migrations, models

# Estados del pago. Van literales: las migraciones no importan constantes de la app.
CURRENT_STATE = 'VIGENTE'


def mark_payments_current(apps, schema_editor):
    '''Los pagos que ya existen están vigentes (el campo estado_pago no se usaba y estaba vacío).'''
    PagoCompra = apps.get_model('pago_compra', 'PagoCompra')
    PagoCompra.objects.filter(estado_pago__isnull=True).update(estado_pago=CURRENT_STATE)


class Migration(migrations.Migration):
    '''
    DEV-150: un pago a proveedor no se elimina, se anula. estado_pago pasa a indicar si el pago
    está vigente o anulado, y fecha_anulacion guarda cuándo se anuló.
    '''

    dependencies = [
        ('pago_compra', '0007_pago_compra_varias_compras'),
    ]

    operations = [
        migrations.RunPython(mark_payments_current, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='pagocompra',
            name='estado_pago',
            field=models.CharField(
                choices=[('VIGENTE', 'Vigente'), ('ANULADO', 'Anulado')],
                default='VIGENTE',
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name='pagocompra',
            name='fecha_anulacion',
            field=models.DateField(blank=True, null=True),
        ),
    ]
