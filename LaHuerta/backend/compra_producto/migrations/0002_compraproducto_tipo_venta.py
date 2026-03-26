import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compra_producto', '0001_initial'),
        ('tipo_venta', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='compraproducto',
            name='tipo_venta',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='tipo_venta.tipoventa',
            ),
        ),
    ]
