import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pago_cliente', '0001_initial'),
        ('pago_factura', '0002_remove_pagofactura_pago'),
    ]

    operations = [
        migrations.AddField(
            model_name='pagofactura',
            name='pago_cliente',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='pago_cliente.pagocliente',
                null=True,
            ),
        ),
    ]
