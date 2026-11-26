from datetime import date
from django.db import migrations

# Valores literales: una migración no importa constantes de la app.
CURRENT_STATE = 'VIGENTE'
CANCELLED_STATE = 'ANULADO'
REJECTED_CHECK_STATE = 'RECHAZADO'


def cancel_payments_with_rejected_checks(apps, schema_editor):
    '''
    Los pagos vigentes con todos sus cheques rechazados pasan a anulados, como hace ahora el
    rechazo del último cheque. La cuenta corriente no se toca: al rechazar el cheque ya se le
    devolvió el importe al cliente. No se guardaba la fecha del rechazo: queda la de hoy.
    '''
    PagoCliente = apps.get_model('pago_cliente', 'PagoCliente')
    Cheque = apps.get_model('cheque', 'Cheque')

    for payment in PagoCliente.objects.filter(estado_pago=CURRENT_STATE):
        checks = list(Cheque.objects.filter(pago_cliente_id=payment.id).select_related('estado').order_by('id'))
        if not checks or any(check.estado.descripcion != REJECTED_CHECK_STATE for check in checks):
            continue
        numbers = ', '.join(f'N° {check.numero}' for check in checks)
        label = 'Cheques rechazados' if len(checks) > 1 else 'Cheque rechazado'
        payment.estado_pago = CANCELLED_STATE
        payment.fecha_anulacion = date.today()
        payment.motivo_anulacion = f'{label}: {numbers}'
        payment.save(update_fields=['estado_pago', 'fecha_anulacion', 'motivo_anulacion'])


class Migration(migrations.Migration):
    '''
    DEV-155: un pago de cliente con todos sus cheques rechazados queda anulado.
    '''

    dependencies = [
        ('pago_cliente', '0003_pago_cliente_motivo_anulacion'),
        ('cheque', '0003_cheque_numero_deja_de_ser_pk'),
    ]

    operations = [
        # La reversa no vuelve a poner vigentes los pagos: no se distingue cuáles anuló esta migración.
        migrations.RunPython(cancel_payments_with_rejected_checks, migrations.RunPython.noop),
    ]
