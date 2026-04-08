from django.db import transaction
from decimal import Decimal
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.exceptions import CheckNotFoundException
from compra.service import BuyService
from .exceptions import PurchasePaymentNotFoundException, PaymentExceedsBalanceException


class PurchasePaymentService:

    def __init__(self, payment_repository, check_repository, check_service, supplier_repository):
        self.payment_repository = payment_repository
        self.check_repository = check_repository
        self.check_service = check_service
        self.supplier_repository = supplier_repository

    @transaction.atomic
    def create_payment(self, data: dict):
        buy = data['compra']
        amount_paid = Decimal(str(data['importe_abonado']))
        outstanding = BuyService.calculate_outstanding_balance(buy)

        if amount_paid > outstanding:
            raise PaymentExceedsBalanceException(
                f'El importe abonado ({amount_paid}) supera el saldo pendiente ({outstanding}).'
            )

        payment = self.payment_repository.create(
            compra=buy,
            importe_abonado=amount_paid,
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )

        if data['tipo_pago'].descripcion == 'Cheque':
            check = self.check_repository.get_by_id(data['cheque_numero'])
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')
            self.check_service.endorse_check(check, payment)

        supplier = data['compra'].proveedor
        supplier.cuenta_corriente -= data['importe_abonado']
        self.supplier_repository.update_balance(supplier)

        return payment

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

        supplier = payment.compra.proveedor
        supplier.cuenta_corriente += payment.importe_abonado
        self.supplier_repository.update_balance(supplier)

        self.payment_repository.delete(payment)
