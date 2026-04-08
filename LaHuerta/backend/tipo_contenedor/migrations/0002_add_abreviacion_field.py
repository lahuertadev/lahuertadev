# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_contenedor', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipocontenedor',
            name='abreviacion',
            field=models.CharField(default='c', max_length=5),
        ),
    ]
