# Generated by Django 5.1.1 on 2024-11-22 18:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('lista_precios', '0001_initial'),
        ('producto', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ListaPreciosProducto',
            fields=[
                ('id', models.SmallAutoField(primary_key=True, serialize=False)),
                ('precio_unitario', models.DecimalField(blank=True, decimal_places=0, max_digits=10, null=True)),
                ('precio_bulto', models.DecimalField(blank=True, decimal_places=0, max_digits=10, null=True)),
                ('lista_precios', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='lista_precios.listaprecios')),
                ('producto', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='producto.producto')),
            ],
            options={
                'db_table': 'lista_precios_producto',
            },
        ),
    ]