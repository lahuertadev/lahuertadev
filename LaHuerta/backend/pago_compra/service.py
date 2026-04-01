from django.db import transaction
from estado_cheque.models import EstadoCheque
from cheque.exceptions import CheckNotFoundException
from .exceptions import PurchasePaymentNotFoundException


class PurchasePaymentService:

    def __init__(self, payment_repository, check_repository, check_service):
        self.payment_repository = payment_repository
        self.check_repository = check_repository
        self.check_service = check_service

    @transaction.atomic
    def create_payment(self, data: dict):
        payment = self.payment_repository.create(
            compra=data['compra'],
            importe_abonado=data['importe_abonado'],
            tipo_pago=data['tipo_pago'],
            fecha_pago=data['fecha_pago'],
        )

        if data['tipo_pago'].descripcion == 'Cheque':
            check = self.check_repository.get_by_id(data['cheque_numero'])
            if not check:
                raise CheckNotFoundException('Cheque no encontrado.')
            self.check_service.endorse_check(check, payment)

        return payment

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise PurchasePaymentNotFoundException('Pago de compra no encontrado.')

        check = payment.cheque_set.first()
        if check:
            en_cartera = EstadoCheque.objects.get(descripcion='EN_CARTERA')
            self.check_repository.update(check, {
                'endosado': False,
                'estado': en_cartera,
                'pago_compra': None,
                'fecha_endoso': None,
            })

        self.payment_repository.delete(payment)
