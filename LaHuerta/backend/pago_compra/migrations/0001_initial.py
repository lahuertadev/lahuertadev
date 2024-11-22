# Generated by Django 5.1.1 on 2024-11-22 18:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('compra', '0001_initial'),
        ('pago', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PagoCompra',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_pago', models.DateTimeField()),
                ('importe_abonado', models.DecimalField(decimal_places=2, max_digits=10)),
                ('estado_pago', models.CharField(blank=True, max_length=8, null=True)),
                ('compra', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='compra.compra')),
                ('pago', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='pago.pago')),
            ],
            options={
                'db_table': 'pago_compra',
            },
        ),
    ]
