from datetime import date
from django.db import transaction
from estado_cheque.models import EstadoCheque
from .exceptions import CheckAlreadyEndorsedException, CheckInvalidStateException


class CheckService:

    def __init__(self, check_repository):
        self.check_repository = check_repository

    @transaction.atomic
    def endorse_check(self, check, pago_compra):
        if check.endosado:
            raise CheckAlreadyEndorsedException('El cheque ya fue endosado.')

        if not check.estado or check.estado.descripcion != 'EN_CARTERA':
            raise CheckInvalidStateException('Solo se pueden endosar cheques en estado EN_CARTERA.')

        endorsed_state = EstadoCheque.objects.get(descripcion='ENDOSADO')

        self.check_repository.update(check, {
            'endosado': True,
            'estado': endorsed_state,
            'pago_compra': pago_compra,
            'fecha_endoso': date.today(),
        })

        return check
