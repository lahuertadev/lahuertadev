# Generated by Django 5.1.1 on 2024-10-09 14:30

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='TipoUnidad',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descripcion', models.CharField(max_length=20, unique=True)),
            ],
            options={
                'db_table': 'tipo_unidad',
            },
        ),
    ]
