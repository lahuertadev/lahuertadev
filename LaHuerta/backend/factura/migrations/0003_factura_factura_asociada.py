import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factura', '0002_factura_cae_factura_cae_vto_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='factura',
            name='factura_asociada',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='notas_debito',
                to='factura.factura',
            ),
        ),
    ]
