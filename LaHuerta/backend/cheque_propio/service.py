from django.db import transaction
from .models import OwnCheck
from .exceptions import OwnCheckInvalidTransitionException


class OwnCheckService:

    def __init__(self, own_check_repository):
        self.own_check_repository = own_check_repository

    @transaction.atomic
    def cash_check(self, own_check):
        if own_check.estado != OwnCheck.State.EMITIDO:
            raise OwnCheckInvalidTransitionException('Solo se pueden marcar como cobrados los cheques en estado EMITIDO.')
        if not own_check.pagocompra_set.exists():
            raise OwnCheckInvalidTransitionException('No se puede cobrar un cheque que no está asociado a ningún pago.')
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.COBRADO})
        return own_check

    @transaction.atomic
    def cancel_check(self, own_check):
        if own_check.estado != OwnCheck.State.EMITIDO:
            raise OwnCheckInvalidTransitionException('Solo se pueden anular cheques en estado EMITIDO.')
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.ANULADO})
        return own_check
