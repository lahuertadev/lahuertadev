from decimal import Decimal
from django.db import transaction
from .interfaces import IClientPaymentRepository
from .exceptions import ClientPaymentNotFoundException, PaymentTypeChangeBlockedException
from cliente.interfaces import IClientRepository
from cheque.interfaces import ICheckRepository
from estado_cheque.models import EstadoCheque


class ClientPaymentService:

    def __init__(
        self,
        payment_repository: IClientPaymentRepository,
        client_repository: IClientRepository,
        check_repository: ICheckRepository,
    ):
        self.payment_repository = payment_repository
        self.client_repository = client_repository
        self.check_repository = check_repository

    @transaction.atomic
    def create_payment(self, data: dict):
        payment = self.payment_repository.create(
            client=data['cliente'],
            payment_type=data['tipo_pago'],
            payment_date=data['fecha_pago'],
            amount=data['importe'],
            observations=data.get('observaciones'),
        )

        client = data['cliente']
        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) - Decimal(str(data['importe']))
        self.client_repository.update_balance(client)

        if data['tipo_pago'].descripcion == 'Cheque':
            in_wallet = EstadoCheque.objects.get(descripcion='EN_CARTERA')
            self.check_repository.create({
                'numero': data['cheque_numero'],
                'importe': data['importe'],
                'fecha_emision': data['cheque_fecha_emision'],
                'fecha_deposito': data.get('cheque_fecha_deposito'),
                'banco': data['cheque_banco'],
                'estado': in_wallet,
                'pago_cliente': payment,
                'endosado': False,
            })

        return payment

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        old_tipo_pago = payment.tipo_pago
        new_tipo_pago = data.get('tipo_pago', old_tipo_pago)
        old_is_check = old_tipo_pago.descripcion == 'Cheque'
        new_is_check = new_tipo_pago.descripcion == 'Cheque'

        check = payment.cheque_set.first()

        if old_is_check and not new_is_check:
            if check and check.endosado:
                raise PaymentTypeChangeBlockedException(
                    'No se puede cambiar el tipo de pago porque el cheque asociado ya fue endosado.'
                )
            if check:
                self.check_repository.delete(check)
            check = None

        elif not old_is_check and new_is_check:
            in_wallet = EstadoCheque.objects.get(descripcion='EN_CARTERA')
            self.check_repository.create({
                'numero': data['cheque_numero'],
                'importe': data.get('importe', payment.importe),
                'fecha_emision': data['cheque_fecha_emision'],
                'fecha_deposito': data.get('cheque_fecha_deposito'),
                'banco': data['cheque_banco'],
                'estado': in_wallet,
                'pago_cliente': payment,
                'endosado': False,
            })
            check = None

        old_total_amount = payment.importe
        old_client = payment.cliente
        new_total_amount = data.get('importe', old_total_amount)
        new_client = data.get('cliente', old_client)

        client_changed = old_client != new_client
        amount_changed = old_total_amount != new_total_amount

        if client_changed:
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) + Decimal(str(old_total_amount))
            self.client_repository.update_balance(old_client)

            new_client.cuenta_corriente = Decimal(str(new_client.cuenta_corriente)) - Decimal(str(new_total_amount))
            self.client_repository.update_balance(new_client)

        elif amount_changed:
            difference = Decimal(str(new_total_amount)) - Decimal(str(old_total_amount))
            old_client.cuenta_corriente = Decimal(str(old_client.cuenta_corriente)) - difference
            self.client_repository.update_balance(old_client)

        check_fields = {'cheque_numero', 'cheque_banco', 'cheque_fecha_emision', 'cheque_fecha_deposito'}
        payment_data = {k: v for k, v in data.items() if k not in check_fields}
        self.payment_repository.update(payment, payment_data)

        if old_is_check and new_is_check and check:
            check_updates = {}
            if 'cheque_banco' in data:
                check_updates['banco'] = data['cheque_banco']
            if 'cheque_fecha_emision' in data:
                check_updates['fecha_emision'] = data['cheque_fecha_emision']
            if 'cheque_fecha_deposito' in data:
                check_updates['fecha_deposito'] = data.get('cheque_fecha_deposito')
            if 'importe' in data:
                check_updates['importe'] = data['importe']
            if check_updates:
                self.check_repository.update(check, check_updates)

        return payment

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        client = payment.cliente
        client.cuenta_corriente = Decimal(str(client.cuenta_corriente)) + Decimal(str(payment.importe))
        self.client_repository.update_balance(client)

        check = payment.cheque_set.first()
        if check:
            self.check_repository.delete(check)

        self.payment_repository.delete(payment)
