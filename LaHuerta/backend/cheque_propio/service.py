from django.db import transaction
from django.utils import timezone
from .models import OwnCheck
from .exceptions import (
    OwnCheckInvalidTransitionException,
    OwnCheckAlreadyExistsException,
    OwnCheckEditBlockedException,
    OwnCheckInvalidDateRangeException,
)


class OwnCheckService:

    def __init__(self, own_check_repository, payment_repository=None, supplier_repository=None):
        self.own_check_repository = own_check_repository
        self.payment_repository = payment_repository
        self.supplier_repository = supplier_repository

    def create_own_check(self, data: dict):
        self._validate_no_duplicate(data['numero'], data['banco'])
        self._validate_date_range(data.get('fecha_deposito'), data['fecha_vencimiento'])
        return self.own_check_repository.create(data)

    def update_own_check(self, own_check, data: dict):
        number = data.get('numero', own_check.numero)
        bank = data.get('banco', own_check.banco)
        amount = data.get('importe', own_check.importe)

        number_changed = number != own_check.numero
        bank_changed = bank != own_check.banco
        amount_changed = amount != own_check.importe

        if (number_changed or bank_changed or amount_changed) and own_check.pagocompra_set.exists():
            suppliers = sorted({
                payment.proveedor.nombre
                for payment in own_check.pagocompra_set.select_related('proveedor')
            })
            raise OwnCheckEditBlockedException(
                f'No se puede modificar el número, banco ni importe: este cheque ya está usado en '
                f'pagos a {", ".join(suppliers)}. Editá o eliminá esos pagos primero.'
            )

        if number_changed or bank_changed:
            self._validate_no_duplicate(number, bank, exclude_id=own_check.id)

        deposit_date = data.get('fecha_deposito', own_check.fecha_deposito)
        due_date = data.get('fecha_vencimiento', own_check.fecha_vencimiento)
        self._validate_date_range(deposit_date, due_date)

        return self.own_check_repository.update(own_check, data)

    def _validate_no_duplicate(self, number, bank, exclude_id=None):
        if self.own_check_repository.exists_duplicate(number, bank, exclude_id=exclude_id):
            raise OwnCheckAlreadyExistsException('Ya existe un cheque con ese número para ese banco.')

    def _validate_date_range(self, deposit_date, due_date):
        if deposit_date and due_date and deposit_date > due_date:
            raise OwnCheckInvalidDateRangeException(
                'La fecha de depósito no puede ser posterior a la fecha de vencimiento.'
            )

    @transaction.atomic
    def cash_check(self, own_check):
        if own_check.estado != OwnCheck.State.EMITIDO:
            raise OwnCheckInvalidTransitionException('Solo se pueden marcar como cobrados los cheques en estado EMITIDO.')
        if not own_check.pagocompra_set.exists():
            raise OwnCheckInvalidTransitionException('No se puede cobrar un cheque que no está asociado a ningún pago.')
        if own_check.fecha_deposito and own_check.fecha_deposito > timezone.localdate():
            raise OwnCheckInvalidTransitionException('No se puede cobrar un cheque antes de su fecha de depósito.')
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.COBRADO})
        return own_check

    @transaction.atomic
    def cancel_check(self, own_check):
        if own_check.estado != OwnCheck.State.EMITIDO:
            raise OwnCheckInvalidTransitionException('Solo se pueden anular cheques en estado EMITIDO.')

        # Cada pago pierde la parte que se pagó con este cheque: si era su único cheque se
        # elimina, y si tenía otros queda con el importe de los demás.
        for use in self.own_check_repository.get_payment_uses(own_check):
            payment = use.pago_compra
            supplier = payment.proveedor
            supplier.cuenta_corriente += use.importe
            self.supplier_repository.update_balance(supplier)
            if payment.importe_abonado <= use.importe:
                self.payment_repository.delete(payment)
            else:
                self.own_check_repository.delete_payment_use(use)
                self.payment_repository.update(payment, {'importe_abonado': payment.importe_abonado - use.importe})

        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.ANULADO})
        return own_check
