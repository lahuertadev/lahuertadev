from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cliente', '0002_cliente_lista_precios'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE cliente DROP FOREIGN KEY cliente_tipo_facturacion_id_c935f762_fk_tipo_facturacion_id;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RemoveField(
            model_name='cliente',
            name='tipo_facturacion',
        ),
    ]
