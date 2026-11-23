from django.db.models import Prefetch
from cheque.models import Cheque
from .models import PagoCliente
from .interfaces import IClientPaymentRepository


def _checks_prefetch():
    '''Cheques del pago en el orden en que se cargaron, con lo que leen el service y el serializer.'''
    return Prefetch(
        'cheque_set',
        queryset=Cheque.objects.select_related('banco', 'estado', 'pago_compra__proveedor').order_by('id'),
    )


class ClientPaymentRepository(IClientPaymentRepository):

    def get_all(self, client_id=None, business_name=None, amount_min=None, amount_max=None,
                date_from=None, date_to=None, payment_type_id=None, state=None):
        qs = (
            PagoCliente.objects
            .select_related('cliente', 'tipo_pago')
            .prefetch_related(_checks_prefetch(), 'cliente__contactos')
            .all()
        )
        if client_id:
            qs = qs.filter(cliente_id=client_id)
        if business_name:
            qs = qs.filter(cliente__razon_social__icontains=business_name)
        if amount_min is not None:
            qs = qs.filter(importe__gte=amount_min)
        if amount_max is not None:
            qs = qs.filter(importe__lte=amount_max)
        if date_from:
            qs = qs.filter(fecha_pago__gte=date_from)
        if date_to:
            qs = qs.filter(fecha_pago__lte=date_to)
        if payment_type_id:
            qs = qs.filter(tipo_pago_id=payment_type_id)
        if state:
            qs = qs.filter(estado_pago=state)
        return qs.order_by('-fecha_pago', '-id')

    def get_by_id(self, id):
        return (
            PagoCliente.objects
            .select_related('cliente', 'tipo_pago')
            .prefetch_related(_checks_prefetch())
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
