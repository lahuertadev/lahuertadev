from django.db import transaction
from .interfaces import IClientPaymentRepository
from .exceptions import ClientPaymentNotFoundException
from cliente.interfaces import IClientRepository


class ClientPaymentService:

    def __init__(
        self,
        payment_repository: IClientPaymentRepository,
        client_repository: IClientRepository,
    ):
        self.payment_repository = payment_repository
        self.client_repository = client_repository

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
        client.cuenta_corriente -= data['importe']
        self.client_repository.update_balance(client)

        return payment

    @transaction.atomic
    def update_payment(self, payment_id: int, data: dict):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        old_total_amount = payment.importe
        old_client = payment.cliente

        new_total_amount = data.get('importe', old_total_amount)
        new_client = data.get('cliente', old_client)

        client_changed = old_client != new_client
        amount_changed = old_total_amount != new_total_amount

        if client_changed:
            old_client.cuenta_corriente += old_total_amount
            self.client_repository.update_balance(old_client)

            new_client.cuenta_corriente -= new_total_amount
            self.client_repository.update_balance(new_client)

        elif amount_changed:
            difference = new_total_amount - old_total_amount
            old_client.cuenta_corriente -= difference
            self.client_repository.update_balance(old_client)

        self.payment_repository.update(payment, data)

        return payment

    @transaction.atomic
    def delete_payment(self, payment_id: int):
        payment = self.payment_repository.get_by_id(payment_id)
        if not payment:
            raise ClientPaymentNotFoundException('Pago no encontrado.')

        client = payment.cliente
        client.cuenta_corriente += payment.importe
        self.client_repository.update_balance(client)

        self.payment_repository.delete(payment)
