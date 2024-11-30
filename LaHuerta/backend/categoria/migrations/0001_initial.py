# Generated by Django 5.1.3 on 2024-11-30 15:44

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.SmallAutoField(primary_key=True, serialize=False)),
                ('descripcion', models.CharField(max_length=20, unique=True)),
            ],
            options={
                'db_table': 'categoria',
            },
        ),
    ]
