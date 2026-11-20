from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from estado_cheque.models import EstadoCheque
from estado_cheque import constants as check_status
from cheque.exceptions import CheckNotFoundException
from cheque_propio.exceptions import OwnCheckNotFoundException
from cheque_propio.models import OwnCheck
from compra.service import BuyService
from .constants import PAYMENT_TYPE_CHECK, PAYMENT_TYPE_OWN_CHECK, PaymentState
from .exceptions import (
    PaymentApplicationsExceedAmountException,
    PaymentCancelBlockedException,
    PaymentEditBlockedException,
    PurchasePaymentNotFoundException,
    PaymentExceedsBalanceException,
    PaymentSupplierMismatchException,
    OwnCheckNotAvailableException,
)


def reduce_payment_amount(payment_repository, payment, amount):
    '''
    Baja el importe del pago en amount (un cheque que se cayó), descontándolo de sus compras de
    la más nueva a la más vieja y, si no alcanzan, de lo que tenía a cuenta. El pago no se elimina
    aunque quede en cero. La cuenta corriente del proveedor la ajusta quien llama.
    '''
    amount = Decimal(str(amount))
    remaining = amount
    for application in payment_repository.get_purchase_applications_newest_first(payment):
        if remaining <= 0:
            break
        taken = min(application.importe, remaining)
        if taken:
            payment_repository.update_purchase_application(application, application.importe - taken)
            remaining -= taken

    new_amount = max(payment.importe_abonado - amount, Decimal('0'))
    return payment_repository.update(payment, {'importe_abonado': new_amount})


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
        Crea el pago: el importe es la suma de los cheques o el cargado, se imputa a las compras
        indicadas (lo que sobra queda a cuenta), se vinculan los cheques y se descuenta de la
        cuenta corriente del proveedor.
        '''
        supplier = data['proveedor']
        payment_type = data['tipo_pago'].descripcion

        checks = []
        own_checks = []
        if payment_type == PAYMENT_TYPE_CHECK:
            checks = self._get_checks_for_payment(data['cheque_ids'])
            amount_paid = sum((Decimal(str(check.importe)) for check in checks), Decimal('0'))
        elif payment_type == PAYMENT_TYPE_OWN_CHECK:
            own_checks = self._get_own_checks_for_payment(data['own_check_ids'])
            amount_paid = sum((Decimal(str(own_check.importe)) for own_check in own_checks), Decimal('0'))
        else:
            amount_paid = Decimal(str(data['importe_abonado']))

        applications = self._build_applications(data.get('compras') or [])
        self._validate_applications(applications, supplier, amount_paid)

        payment = self.payment_repository.create(
            proveedor=supplier,
            importe_abonado=amount_paid,
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )
        if applications:
            self.payment_repository.replace_purchase_applications(payment, applications)

        for own_check in own_checks:
            self.own_check_repository.update(own_check, {'pago_compra': payment})
            self.payment_repository.add_own_check_use(payment, own_check, own_check.importe)

        for check in checks:
            self.check_service.endorse_check(check, payment)
            self.payment_repository.add_client_check_use(payment, check)

        supplier.cuenta_corriente -= amount_paid
        self.supplier_repository.update_balance(supplier)

        return payment

    @staticmethod
    def _build_applications(items):
        '''Pares (compra, importe aplicado) a partir de la lista del serializer.'''
        return [(item['compra'], Decimal(str(item['importe']))) for item in items]

    def _validate_applications(self, applications, supplier, amount_paid, current_applied=None):
        '''
        Cada compra es del proveedor y no recibe más que su saldo pendiente; entre todas no superan
        el importe del pago. current_applied: al editar, lo que el pago ya le aplicaba a cada compra.
        '''
        current_applied = current_applied or {}
        for buy, amount in applications:
            if buy.proveedor_id != supplier.id:
                raise PaymentSupplierMismatchException(
                    f'La compra N° {buy.id:08d} no corresponde al proveedor del pago.'
                )
            outstanding = BuyService.calculate_outstanding_balance(buy) + current_applied.get(buy.id, Decimal('0'))
            if amount > outstanding:
                raise PaymentExceedsBalanceException(
                    f'Lo aplicado a la compra N° {buy.id:08d} ({amount}) supera su saldo pendiente ({outstanding}).'
                )

        total_applied = sum((amount for _, amount in applications), Decimal('0'))
        if total_applied > amount_paid:
            raise PaymentApplicationsExceedAmountException(
                f'Lo aplicado a las compras ({total_applied}) supera el importe del pago ({amount_paid}).'
            )

    def _get_checks_for_payment(self, check_ids):
        '''Cheques de clientes del pago. Que estén en cartera lo valida endorse_check.'''
        checks = []
        for check_id in check_ids:
            check = self.check_repository.get_by_id(check_id)
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')
            checks.append(check)
        return checks

    def _get_own_checks_for_payment(self, own_check_ids):
        '''Cheques emitidos del pago: cada uno tiene que estar Emitido y no estar usado en otro pago.'''
        own_checks = []
        for own_check_id in own_check_ids:
            own_check = self.own_check_repository.get_by_id(own_check_id)
            if not own_check:
                raise OwnCheckNotFoundException('Cheque propio no encontrado.')

            if own_check.estado != OwnCheck.State.EMITIDO:
                raise OwnCheckNotAvailableException(
                    f'El cheque N° {own_check.numero} está {OwnCheck.State(own_check.estado).label.lower()}: '
                    'solo se pueden usar cheques emitidos.'
                )

            if own_check.pago_compra_id:
                raise OwnCheckNotAvailableException(
                    f'El cheque N° {own_check.numero} ya se usó en el pago N° {own_check.pago_compra_id:08d}.'
                )
            own_checks.append(own_check)
        return own_checks

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        '''
        Edita la fecha, el importe y las compras de un pago vigente; sin compras en data, conserva
        las que tenía. Un pago con cheques no cambia su importe. La diferencia de importe se ajusta
        en la cuenta corriente del proveedor.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        if payment.estado_pago == PaymentState.ANULADO:
            raise PaymentEditBlockedException('No se puede editar un pago anulado.')

        new_amount = Decimal(str(data.get('importe_abonado', payment.importe_abonado)))
        difference = new_amount - payment.importe_abonado
        if difference and (payment.cheque_set.exists() or payment.owncheck_set.exists()):
            raise PaymentEditBlockedException(
                'No se puede cambiar el importe de un pago con cheques: sale de los cheques. '
                'Para cambiar los cheques, anulá el pago y cargalo de nuevo.'
            )

        current_applications = list(payment.purchase_applications.all())
        current_applied = {application.compra_id: application.importe for application in current_applications}
        if 'compras' in data:
            applications = self._build_applications(data['compras'])
        else:
            applications = [(application.compra, application.importe) for application in current_applications]
        self._validate_applications(applications, payment.proveedor, new_amount, current_applied)

        if 'compras' in data:
            self.payment_repository.replace_purchase_applications(payment, applications)

        if difference:
            supplier = payment.proveedor
            supplier.cuenta_corriente -= difference
            self.supplier_repository.update_balance(supplier)

        return self.payment_repository.update(payment, {
            'importe_abonado': new_amount,
            'fecha_pago': data['fecha_pago'],
        })

    @transaction.atomic
    def cancel_payment(self, payment_id: int):
        '''
        Anula el pago (borrado lógico): devuelve su importe a la cuenta corriente del proveedor y
        libera sus cheques (los de clientes vuelven a cartera, los emitidos quedan disponibles); los
        rechazados o anulados siguen vinculados. Bloqueado si ya está anulado o si tiene un cheque
        emitido cobrado.
        '''
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')
        if payment.estado_pago == PaymentState.ANULADO:
            raise PaymentCancelBlockedException('El pago ya está anulado.')

        own_checks = list(payment.owncheck_set.all())
        cashed = [own_check.numero for own_check in own_checks if own_check.estado == OwnCheck.State.COBRADO]
        if cashed:
            raise PaymentCancelBlockedException(
                f'No se puede anular el pago: el cheque N° {", ".join(str(number) for number in cashed)} ya se cobró.'
            )

        in_portfolio = None
        for check in payment.cheque_set.all():
            if check.estado and check.estado.descripcion == check_status.RECHAZADO:
                continue
            in_portfolio = in_portfolio or EstadoCheque.objects.get(descripcion=check_status.EN_CARTERA)
            self.check_repository.update(check, {
                'endosado': False,
                'estado': in_portfolio,
                'pago_compra': None,
                'fecha_endoso': None,
            })

        for own_check in own_checks:
            if own_check.estado == OwnCheck.State.EMITIDO:
                self.own_check_repository.update(own_check, {'pago_compra': None})

        supplier = payment.proveedor
        supplier.cuenta_corriente += payment.importe_abonado
        self.supplier_repository.update_balance(supplier)

        return self.payment_repository.update(payment, {
            'estado_pago': PaymentState.ANULADO,
            'fecha_anulacion': timezone.localdate(),
        })
