from django.db import migrations


class Migration(migrations.Migration):
    '''
    cheque_propio.numero deja de ser la PK de OwnCheck (ver
    cheque_propio.0006_owncheck_numero_deja_de_ser_pk); OwnCheck.id pasa a
    serlo. La FK de PagoCompra.cheque_propio no tiene to_field explícito,
    así que en la base todavía apunta a la columna vieja (numero) con el
    tipo de columna viejo (int). Django no regenera esto automáticamente
    porque pago_compra es una app distinta y su modelo no cambió: hay que
    migrar la FK a mano.

    No se contempla un reverse limpio: para revertir haría falta que
    cheque_propio.numero vuelva a ser PK/único ANTES de recrear esta FK
    apuntando a numero, pero esa reversión ocurre en la migración de
    cheque_propio, que se revierte después que esta por dependencia. Dado
    que es una situación de borde poco probable de necesitar, se deja
    como no reversible en vez de simular una reversión que no sería
    segura en el orden real de ejecución.
    '''

    dependencies = [
        ('pago_compra', '0003_add_cheque_propio_fk'),
        ('cheque_propio', '0006_owncheck_numero_deja_de_ser_pk'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                (
                    "ALTER TABLE pago_compra DROP FOREIGN KEY "
                    "pago_compra_cheque_propio_id_285ae4b8_fk_cheque_propio_numero;"
                ),
                (
                    "UPDATE pago_compra pc "
                    "JOIN cheque_propio cp ON pc.cheque_propio_id = cp.numero "
                    "SET pc.cheque_propio_id = cp.id "
                    "WHERE pc.cheque_propio_id IS NOT NULL;"
                ),
                "ALTER TABLE pago_compra MODIFY cheque_propio_id BIGINT DEFAULT NULL;",
                (
                    "ALTER TABLE pago_compra ADD CONSTRAINT "
                    "pago_compra_cheque_propio_id_285ae4b8_fk_cheque_propio_id "
                    "FOREIGN KEY (cheque_propio_id) REFERENCES cheque_propio(id) "
                    "ON DELETE RESTRICT;"
                ),
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
