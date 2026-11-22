from django.db import migrations, models


class Migration(migrations.Migration):
    '''
    DEV-155: motivo por el que se anuló el pago. Lo carga el usuario al anularlo, o el sistema
    cuando se rechazan todos los cheques del pago.
    '''

    dependencies = [
        ('pago_cliente', '0002_pago_cliente_anulacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagocliente',
            name='motivo_anulacion',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]
