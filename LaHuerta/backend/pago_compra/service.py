from django.db import transaction
from django.db.models import Sum
from decimal import Decimal
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.exceptions import CheckNotFoundException
from cheque_propio.exceptions import OwnCheckNotFoundException
from compra.service import BuyService
from .exceptions import (
    PaymentEditBlockedException,
    PurchasePaymentNotFoundException,
    PaymentExceedsBalanceException,
    PaymentSupplierMismatchException,
    OwnCheckOtherSupplierException,
)


class OwnCheckInsufficientBalanceException(Exception):
    pass


class PurchasePaymentService:

    def __init__(self, payment_repository, check_repository, check_service, supplier_repository, own_check_repository=None):
        self.payment_repository = payment_repository
        self.check_repository = check_repository
        self.check_service = check_service
        self.supplier_repository = supplier_repository
        self.own_check_repository = own_check_repository

    @transaction.atomic
    def create_payment(self, data: dict):
        '''
        Registra un pago a proveedor. Con compra, es un pago de esa compra (no puede
        superar su saldo pendiente); sin compra, es un pago a cuenta. En los dos casos
        el importe se descuenta de la cuenta corriente del proveedor.
        '''
        supplier = data['proveedor']
        buy = data.get('compra')
        amount_paid = Decimal(str(data['importe_abonado']))

        if buy:
            self._validate_buy(buy, supplier, amount_paid)

        own_check = None
        if data['tipo_pago'].descripcion == 'Cheque Propio':
            own_check = self._get_own_check_for_payment(data['own_check_id'], supplier, amount_paid)

        payment = self.payment_repository.create(
            proveedor=supplier,
            compra=buy,
            importe_abonado=amount_paid,
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
            cheque_propio=own_check,
        )

        if data['tipo_pago'].descripcion == 'Cheque':
            check = self.check_repository.get_by_id(data['cheque_id'])
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')
            self.check_service.endorse_check(check, payment)

        supplier.cuenta_corriente -= amount_paid
        self.supplier_repository.update_balance(supplier)

        return payment

    def _validate_buy(self, buy, supplier, amount_paid):
        if buy.proveedor_id != supplier.id:
            raise PaymentSupplierMismatchException(
                'La compra seleccionada no corresponde al proveedor del pago.'
            )
        outstanding = BuyService.calculate_outstanding_balance(buy)
        if amount_paid > outstanding:
            raise PaymentExceedsBalanceException(
                f'El importe abonado ({amount_paid}) supera el saldo pendiente ({outstanding}).'
            )

    def _get_own_check_for_payment(self, own_check_id, supplier, amount_paid):
        '''
        Un cheque emitido se usa para un único proveedor: puede repartirse entre pagos
        de compras y pagos a cuenta de ese proveedor hasta agotar su importe.
        '''
        own_check = self.own_check_repository.get_by_id(own_check_id)
        if not own_check:
            raise OwnCheckNotFoundException('Cheque propio no encontrado.')

        if own_check.pagocompra_set.exclude(proveedor_id=supplier.id).exists():
            raise OwnCheckOtherSupplierException(
                f'El cheque N° {own_check.numero} ya se usó para pagarle a otro proveedor. '
                'Un cheque emitido solo puede usarse con un proveedor.'
            )

        already_used = (
            own_check.pagocompra_set.aggregate(total=Sum('importe_abonado'))['total'] or Decimal('0')
        )
        remaining = own_check.importe - already_used
        if amount_paid > remaining:
            raise OwnCheckInsufficientBalanceException(
                f'El importe abonado ({amount_paid}) supera el saldo restante del cheque ({remaining}).'
            )
        return own_check

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        '''
        Edita la fecha y el importe de un pago. La diferencia de importe se ajusta en la
        cuenta corriente del proveedor, con los mismos topes que al crearlo: el saldo
        pendiente de la compra y el saldo del cheque emitido, sin contar este pago.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')

        new_amount = Decimal(str(data['importe_abonado']))
        difference = new_amount - payment.importe_abonado

        if difference:
            self._validate_amount_change(payment, new_amount, difference)
            supplier = payment.proveedor
            supplier.cuenta_corriente -= difference
            self.supplier_repository.update_balance(supplier)

        return self.payment_repository.update(payment, {
            'importe_abonado': new_amount,
            'fecha_pago': data['fecha_pago'],
        })

    def _validate_amount_change(self, payment, new_amount, difference):
        check = payment.cheque_set.first()
        if check and check.estado and check.estado.descripcion == check_status.RECHAZADO:
            raise PaymentEditBlockedException(
                'No se puede cambiar el importe: el cheque con el que se pagó fue rechazado '
                'y la cuenta corriente del proveedor ya fue revertida.'
            )
        if difference <= 0:
            return
        if payment.compra:
            outstanding = BuyService.calculate_outstanding_balance(payment.compra) + payment.importe_abonado
            if new_amount > outstanding:
                raise PaymentExceedsBalanceException(
                    f'El importe abonado ({new_amount}) supera el saldo pendiente ({outstanding}).'
                )
        if payment.cheque_propio:
            own_check = payment.cheque_propio
            already_used = (
                own_check.pagocompra_set.aggregate(total=Sum('importe_abonado'))['total'] or Decimal('0')
            )
            remaining = own_check.importe - already_used + payment.importe_abonado
            if new_amount > remaining:
                raise OwnCheckInsufficientBalanceException(
                    f'El importe abonado ({new_amount}) supera el saldo restante del cheque ({remaining}).'
                )

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')

        check = payment.cheque_set.first()
        if check:
            in_portfolio = EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
            self.check_repository.update(check, {
                'endosado': False,
                'estado': in_portfolio,
                'pago_compra': None,
                'fecha_endoso': None,
            })

        supplier = payment.proveedor
        supplier.cuenta_corriente += payment.importe_abonado
        self.supplier_repository.update_balance(supplier)

        self.payment_repository.delete(payment)
