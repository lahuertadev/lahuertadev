from django.db import transaction
from django.db.models import Sum
from decimal import Decimal
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.exceptions import CheckNotFoundException
from cheque_propio.exceptions import OwnCheckNotFoundException
from compra.service import BuyService
from .constants import PAYMENT_TYPE_CHECK, PAYMENT_TYPE_OWN_CHECK
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

        Un pago tiene un solo tipo de pago. Con cheques, el importe es la suma de los cheques:
        los de clientes se endosan enteros y de los emitidos se usa lo indicado de cada uno.
        '''
        supplier = data['proveedor']
        buy = data.get('compra')
        payment_type = data['tipo_pago'].descripcion

        checks = []
        own_check_uses = []
        if payment_type == PAYMENT_TYPE_CHECK:
            checks = self._get_checks_for_payment(data['cheque_ids'])
            amount_paid = sum((Decimal(str(check.importe)) for check in checks), Decimal('0'))
        elif payment_type == PAYMENT_TYPE_OWN_CHECK:
            own_check_uses = self._get_own_checks_for_payment(data['own_checks'], supplier)
            amount_paid = sum((amount for _, amount in own_check_uses), Decimal('0'))
        else:
            amount_paid = Decimal(str(data['importe_abonado']))

        if buy:
            self._validate_buy(buy, supplier, amount_paid)

        payment = self.payment_repository.create(
            proveedor=supplier,
            compra=buy,
            importe_abonado=amount_paid,
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )

        for own_check, amount in own_check_uses:
            self.payment_repository.add_own_check_use(payment, own_check, amount)

        for check in checks:
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

    def _get_checks_for_payment(self, check_ids):
        checks = []
        for check_id in check_ids:
            check = self.check_repository.get_by_id(check_id)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')
            checks.append(check)
        return checks

    def _get_own_checks_for_payment(self, own_checks, supplier):
        '''
        Un cheque emitido se usa para un único proveedor: puede repartirse entre pagos
        de compras y pagos a cuenta de ese proveedor hasta agotar su importe.
        Devuelve (cheque, importe a usar) por cada cheque del pago.
        '''
        uses = []
        for item in own_checks:
            own_check = self.own_check_repository.get_by_id(item['id'])
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            if own_check.pagocompra_set.exclude(proveedor_id=supplier.id).exists():
                raise OwnCheckOtherSupplierException(
                    f'El cheque N° {own_check.numero} ya se usó para pagarle a otro proveedor. '
                    'Un cheque emitido solo puede usarse con un proveedor.'
                )

            amount = Decimal(str(item['importe']))
            already_used = own_check.payment_uses.aggregate(total=Sum('importe'))['total'] or Decimal('0')
            remaining = own_check.importe - already_used
            if amount > remaining:
                raise OwnCheckInsufficientBalanceException(
                    f'El importe del cheque N° {own_check.numero} ({amount}) supera su saldo restante ({remaining}).'
                )
            uses.append((own_check, amount))
        return uses

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        '''
        Edita la fecha y el importe de un pago. La diferencia de importe se ajusta en la
        cuenta corriente del proveedor, con el mismo tope que al crearlo: el saldo pendiente
        de la compra, sin contar este pago. En un pago con cheques el importe sale de los
        cheques, así que solo se cambia la fecha.
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
        if payment.cheque_set.exists() or payment.own_check_uses.exists():
            raise PaymentEditBlockedException(
                'No se puede cambiar el importe de un pago con cheques: sale de los cheques. '
                'Solo se puede cambiar la fecha; para cambiar los cheques, eliminá el pago y cargalo de nuevo.'
            )
        if difference > 0 and payment.compra:
            outstanding = BuyService.calculate_outstanding_balance(payment.compra) + payment.importe_abonado
            if new_amount > outstanding:
                raise PaymentExceedsBalanceException(
                    f'El importe abonado ({new_amount}) supera el saldo pendiente ({outstanding}).'
                )

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        '''
        Elimina el pago y deshace sus efectos: los cheques de clientes vuelven a cartera,
        los usos de cheques emitidos se liberan y el importe vuelve a la cuenta corriente.
        Lo de un cheque rechazado ya se devolvió al rechazarlo, así que no se devuelve dos veces.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')

        rejected_amount = Decimal('0')
        in_portfolio = None
        for check in payment.cheque_set.all():
            if check.estado and check.estado.descripcion == check_status.RECHAZADO:
                rejected_amount += Decimal(str(check.importe))
                continue
            in_portfolio = in_portfolio or EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
            self.check_repository.update(check, {
                'endosado': False,
                'estado': in_portfolio,
                'pago_compra': None,
                'fecha_endoso': None,
            })

        supplier = payment.proveedor
        supplier.cuenta_corriente += payment.importe_abonado - rejected_amount
        self.supplier_repository.update_balance(supplier)

        self.payment_repository.delete(payment)
