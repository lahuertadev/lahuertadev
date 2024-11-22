# Generated by Django 5.1.1 on 2024-11-22 18:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('cliente', '0001_initial'),
        ('dia_entrega', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClienteDiaEntrega',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cliente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cliente.cliente')),
                ('dia_entrega', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dia_entrega.diaentrega')),
            ],
            options={
                'db_table': 'cliente_dias_entrega',
            },
        ),
    ]
