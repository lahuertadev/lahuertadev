from datetime import date
from decimal import Decimal
from django.db import transaction
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from .exceptions import CheckAlreadyEndorsedException, CheckInvalidStateException, CheckInvalidTransitionException


class CheckService:

    def __init__(self, check_repository, client_repository=None):
        self.check_repository = check_repository
        self.client_repository = client_repository

    @transaction.atomic
    def endorse_check(self, check, pago_compra):
        if check.endosado:
            raise CheckAlreadyEndorsedException('El cheque ya fue endosado.')

        if not check.estado or check.estado.descripcion != check_status.EN_CARTERA:
            raise CheckInvalidStateException('Solo se pueden endosar cheques en estado EN_CARTERA.')

        endorsed_state = EstadoCheque.objects.get(descripcion=check_status.ENDOSADO)

        self.check_repository.update(check, {
            'endosado': True,
            'estado': endorsed_state,
            'pago_compra': pago_compra,
            'fecha_endoso': date.today(),
        })

        return check

    @transaction.atomic
    def deposit_check(self, check):
        if not check.estado or check.estado.descripcion != check_status.EN_CARTERA:
            raise CheckInvalidTransitionException('Solo se pueden depositar cheques en estado EN_CARTERA.')

        deposited_state = EstadoCheque.objects.get(descripcion=check_status.DEPOSITADO)
        self.check_repository.update(check, {'estado': deposited_state})
        return check

    @transaction.atomic
    def credit_check(self, check):
        if not check.estado or check.estado.descripcion != check_status.DEPOSITADO:
            raise CheckInvalidTransitionException('Solo se pueden acreditar cheques en estado DEPOSITADO.')

        credited_state = EstadoCheque.objects.get(descripcion=check_status.ACREDITADO)
        self.check_repository.update(check, {'estado': credited_state})
        return check

    @transaction.atomic
    def reject_check(self, check):
        if not check.estado or check.estado.descripcion != check_status.DEPOSITADO:
            raise CheckInvalidTransitionException('Solo se pueden rechazar cheques en estado DEPOSITADO.')

        rejected_state = EstadoCheque.objects.get(descripcion=check_status.RECHAZADO)
        self.check_repository.update(check, {'estado': rejected_state})

        if self.client_repository and check.pago_cliente:
            client = check.pago_cliente.cliente
            client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) + Decimal(str(check.pago_cliente.importe))
            self.client_repository.update_balance(client)

        return check
