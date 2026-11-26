from django.db import migrations

# Estado del cheque de un pago de cliente anulado (DEV-155). Va literal: una migración no importa
# constantes de la app; tiene que coincidir con estado_cheque/constants.py.
CANCELLED_STATE = 'ANULADO'


def create_cancelled_state(apps, schema_editor):
    EstadoCheque = apps.get_model('estado_cheque', 'EstadoCheque')
    EstadoCheque.objects.update_or_create(descripcion=CANCELLED_STATE, defaults={'is_system': True})


def delete_cancelled_state(apps, schema_editor):
    '''Solo se puede volver atrás si ningún cheque quedó en este estado (el FK es PROTECT).'''
    EstadoCheque = apps.get_model('estado_cheque', 'EstadoCheque')
    EstadoCheque.objects.filter(descripcion=CANCELLED_STATE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('estado_cheque', '0002_estadocheque_is_system'),
    ]

    operations = [
        migrations.RunPython(create_cancelled_state, delete_cancelled_state),
    ]
