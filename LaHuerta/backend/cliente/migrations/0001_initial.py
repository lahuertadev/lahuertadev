# Generated by Django 5.1.1 on 2024-10-09 14:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('dia_entrega', '0001_initial'),
        ('localidad', '0001_initial'),
        ('tipo_condicion_iva', '0001_initial'),
        ('tipo_facturacion', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Cliente',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cuit', models.CharField(max_length=11, unique=True)),
                ('razon_social', models.CharField(max_length=70, unique=True)),
                ('cuenta_corriente', models.DecimalField(decimal_places=2, max_digits=10)),
                ('domicilio', models.CharField(blank=True, max_length=50, null=True)),
                ('telefono', models.CharField(max_length=16)),
                ('fecha_inicio_ventas', models.DateField(blank=True, null=True)),
                ('nombre_fantasia', models.CharField(blank=True, max_length=100, null=True)),
                ('condicion_IVA', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tipo_condicion_iva.tipocondicioniva')),
                ('dias_entrega', models.ManyToManyField(related_name='clientes', to='dia_entrega.diaentrega')),
                ('localidad', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='localidad.localidad')),
                ('tipo_facturacion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tipo_facturacion.tipofacturacion')),
            ],
            options={
                'db_table': 'cliente',
            },
        ),
    ]
