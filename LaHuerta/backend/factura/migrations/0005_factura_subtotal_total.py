from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('factura', '0004_delete_all_facturas'),
    ]

    operations = [
        migrations.RenameField(
            model_name='factura',
            old_name='importe',
            new_name='subtotal',
        ),
        migrations.AddField(
            model_name='factura',
            name='total',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
