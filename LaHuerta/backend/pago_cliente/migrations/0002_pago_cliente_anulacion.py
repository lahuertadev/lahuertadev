from django.db import migrations, models


class Migration(migrations.Migration):
    '''
    DEV-155: un pago de cliente no se elimina, se anula. estado_pago indica si el pago está
    vigente o anulado (los pagos que ya existen quedan vigentes por el default) y
    fecha_anulacion guarda cuándo se anuló.
    '''

    dependencies = [
        ('pago_cliente', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagocliente',
            name='estado_pago',
            field=models.CharField(
                choices=[('VIGENTE', 'Vigente'), ('ANULADO', 'Anulado')],
                default='VIGENTE',
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name='pagocliente',
            name='fecha_anulacion',
            field=models.DateField(blank=True, null=True),
        ),
    ]
