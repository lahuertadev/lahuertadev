from .models import PagoCliente
from .interfaces import IClientPaymentRepository


class ClientPaymentRepository(IClientPaymentRepository):

    def get_all(self, client_id=None):
        qs = PagoCliente.objects.select_related('cliente', 'tipo_pago').all()
        if client_id:
            qs = qs.filter(cliente_id=client_id)
        return qs

    def get_by_id(self, id):
        return (
            PagoCliente.objects
            .select_related('cliente', 'tipo_pago')
            .filter(id=id)
            .first()
        )

    def create(self, client, payment_type, payment_date, amount, observations=None):
        payment = PagoCliente(
            cliente=client,
            tipo_pago=payment_type,
            fecha_pago=payment_date,
            importe=amount,
            observaciones=observations,
        )
        payment.save()
        return payment

    def save(self, payment):
        payment.save()
        return payment

    def update(self, payment, data: dict):
        for key, value in data.items():
            setattr(payment, key, value)
        payment.save()
        return payment

    def delete(self, payment):
        payment.delete()
