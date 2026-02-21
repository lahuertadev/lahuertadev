# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tipo_unidad', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipounidad',
            name='abreviacion',
            field=models.CharField(default='u', max_length=5),
        ),
    ]
