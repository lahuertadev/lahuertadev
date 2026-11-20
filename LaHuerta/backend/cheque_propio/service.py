from django.db import transaction
from django.utils import timezone
from pago_compra.service import reduce_payment_amount
from .models import OwnCheck
from pago_compra.constants import PaymentState
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

        payment = self._current_payment(own_check)
        if (number_changed or bank_changed or amount_changed) and payment:
            raise OwnCheckEditBlockedException(
                f'No se puede modificar el número, banco ni importe: este cheque ya está usado en el '
                f'pago N° {payment.id:08d} a {payment.proveedor.nombre}. Anulá ese pago primero.'
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
        if not self._current_payment(own_check):
            raise OwnCheckInvalidTransitionException('No se puede cobrar un cheque que no está asociado a ningún pago.')
        if own_check.fecha_deposito and own_check.fecha_deposito > timezone.localdate():
            raise OwnCheckInvalidTransitionException('No se puede cobrar un cheque antes de su fecha de depósito.')
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.COBRADO})
        return own_check

    @transaction.atomic
    def cancel_check(self, own_check):
        '''Anula un cheque Emitido; si está en un pago vigente, lo saca del pago como el rechazo.'''
        if own_check.estado != OwnCheck.State.EMITIDO:
            raise OwnCheckInvalidTransitionException('Solo se pueden anular cheques en estado EMITIDO.')

        self._take_out_of_payment(own_check)
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.ANULADO})
        return own_check

    @transaction.atomic
    def reject_check(self, own_check):
        '''Rechaza un cheque Emitido o Cobrado que está en un pago vigente, y lo saca del pago.'''
        if own_check.estado not in (OwnCheck.State.EMITIDO, OwnCheck.State.COBRADO):
            raise OwnCheckInvalidTransitionException('Solo se pueden rechazar cheques en estado EMITIDO o COBRADO.')

        if not self._current_payment(own_check):
            raise OwnCheckInvalidTransitionException('No se puede rechazar un cheque que no está asociado a ningún pago.')

        self._take_out_of_payment(own_check)
        self.own_check_repository.update(own_check, {'estado': OwnCheck.State.RECHAZADO})
        return own_check

    @staticmethod
    def _current_payment(own_check):
        '''Pago vigente en el que está usado el cheque, o None.'''
        payment = own_check.pago_compra
        return payment if payment and payment.estado_pago == PaymentState.VIGENTE else None

    def _take_out_of_payment(self, own_check):
        '''
        Si el cheque está en un pago vigente, le devuelve su importe al proveedor y lo descuenta
        del pago (ver reduce_payment_amount). El cheque sigue vinculado al pago como registro.
        '''
        payment = self._current_payment(own_check)
        if not payment:
            return
        supplier = payment.proveedor
        supplier.cuenta_corriente += own_check.importe
        self.supplier_repository.update_balance(supplier)
        reduce_payment_amount(self.payment_repository, payment, own_check.importe)
