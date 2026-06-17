from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_condicion_iva', '0002_tipocondicioniva_is_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipocondicioniva',
            name='codigo_afip',
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
