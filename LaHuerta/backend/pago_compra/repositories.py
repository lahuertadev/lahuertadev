from django.db.models import Q
from .models import PagoCompra, ImputacionPago, PagoCompraCheque, PagoCompraChequePropio
from .constants import PAYMENT_KIND_PURCHASE, PAYMENT_KIND_ON_ACCOUNT
from .interfaces import IPurchasePaymentRepository


class PurchasePaymentRepository(IPurchasePaymentRepository):

    def _base_queryset(self):
        return (
            PagoCompra.objects
            .select_related('proveedor', 'tipo_pago')
            .prefetch_related(
                'purchase_applications__compra',
                'cheque_set__banco',
                'cheque_set__estado',
                'client_check_uses__cheque__estado',
                'client_check_uses__cheque__banco',
                'own_check_uses__cheque_propio__banco',
                'owncheck_set',
            )
        )

    def get_all(self, compra_id=None, supplier_id=None, supplier=None, kind=None, payment_type_id=None,
                amount_min=None, amount_max=None, date_from=None, date_to=None, state=None):
        qs = self._base_queryset().all()
        if compra_id:
            qs = qs.filter(purchase_applications__compra_id=compra_id)
        if supplier_id:
            qs = qs.filter(proveedor_id=supplier_id)
        if supplier:
            qs = qs.filter(self._supplier_search(supplier))
        if kind == PAYMENT_KIND_PURCHASE:
            qs = qs.filter(purchase_applications__isnull=False)
        elif kind == PAYMENT_KIND_ON_ACCOUNT:
            qs = qs.filter(purchase_applications__isnull=True)
        if payment_type_id:
            qs = qs.filter(tipo_pago_id=payment_type_id)
        if amount_min is not None:
            qs = qs.filter(importe_abonado__gte=amount_min)
        if amount_max is not None:
            qs = qs.filter(importe_abonado__lte=amount_max)
        if date_from:
            qs = qs.filter(fecha_pago__gte=date_from)
        if date_to:
            qs = qs.filter(fecha_pago__lte=date_to)
        if state:
            qs = qs.filter(estado_pago=state)
        return qs.distinct().order_by('-fecha_pago', '-id')

    @staticmethod
    def _supplier_search(text):
        '''Un número busca por puesto exacto o por nombre; un texto, solo por nombre.'''
        text = text.strip()
        condition = Q(proveedor__nombre__icontains=text)
        if text.isdigit():
            condition |= Q(proveedor__puesto=int(text))
        return condition

    def get_by_id(self, id):
        return self._base_queryset().filter(id=id).first()

    def create(self, proveedor, importe_abonado, tipo_pago, fecha_pago):
        payment = PagoCompra(
            proveedor=proveedor,
            importe_abonado=importe_abonado,
            tipo_pago=tipo_pago,
            fecha_pago=fecha_pago,
        )
        payment.save()
        return payment

    def add_client_check_use(self, payment, check):
        '''Registra en el pago el cheque de cliente con que se pagó (queda aunque el pago se anule).'''
        return PagoCompraCheque.objects.create(pago_compra=payment, cheque=check, importe=check.importe)

    def add_own_check_use(self, payment, own_check, amount):
        return PagoCompraChequePropio.objects.create(pago_compra=payment, cheque_propio=own_check, importe=amount)

    def replace_purchase_applications(self, payment, applications):
        '''Reemplaza las compras que cubre el pago. applications: pares (compra, importe aplicado).'''
        payment.purchase_applications.all().delete()
        ImputacionPago.objects.bulk_create([
            ImputacionPago(pago_compra=payment, compra=buy, importe=amount)
            for buy, amount in applications
        ])

    def get_purchase_applications_newest_first(self, payment):
        return (
            payment.purchase_applications
            .select_related('compra')
            .order_by('-compra__fecha', '-compra__id')
        )

    def update_purchase_application(self, application, amount):
        application.importe = amount
        application.save(update_fields=['importe'])
        return application

    def update(self, payment, data):
        for field, value in data.items():
            setattr(payment, field, value)
        payment.save(update_fields=list(data.keys()))
        return payment
