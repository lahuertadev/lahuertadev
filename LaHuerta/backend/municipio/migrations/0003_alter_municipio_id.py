# Generated by Django 5.1.3 on 2024-12-05 18:59

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('municipio', '0002_alter_municipio_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='municipio',
            name='id',
            field=models.CharField(max_length=6, primary_key=True, serialize=False, validators=[django.core.validators.MinLengthValidator(6)]),
        ),
    ]
