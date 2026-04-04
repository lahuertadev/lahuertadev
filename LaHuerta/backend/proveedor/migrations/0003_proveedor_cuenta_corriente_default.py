from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proveedor', '0002_nave_optional'),
    ]

    operations = [
        migrations.AlterField(
            model_name='proveedor',
            name='cuenta_corriente',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.RunSQL(
            sql="UPDATE proveedor SET cuenta_corriente = 0 WHERE cuenta_corriente IS NULL",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
