from rest_framework import serializers
from .models import OwnCheck
from banco.models import Banco
from banco.serializers import BankSerializer
from pago_compra.constants import PAYMENT_KIND_PURCHASE, PAYMENT_KIND_ON_ACCOUNT, PaymentState


class OwnCheckCreateSerializer(serializers.ModelSerializer):
    '''
    DTO para la creación de cheques propios. Las reglas de negocio (duplicado,
    rango de fechas) se validan en OwnCheckService, no acá.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']


class OwnCheckUpdateSerializer(serializers.ModelSerializer):
    '''
    DTO para la modificación de cheques propios. Las reglas de negocio
    (duplicado, uso en pagos, rango de fechas) se validan en OwnCheckService.
    '''
    banco = serializers.PrimaryKeyRelatedField(queryset=Banco.objects.all())

    class Meta:
        model = OwnCheck
        fields = ['numero', 'importe', 'fecha_emision', 'fecha_deposito', 'fecha_vencimiento', 'banco', 'observaciones']


class OwnCheckResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: cheque propio con banco expandido, y el proveedor, las compras y
    los pagos (de compras y a cuenta) inferidos desde los pagos asociados.
    '''
    banco = BankSerializer()
    supplier_name = serializers.SerializerMethodField()
    supplier = serializers.SerializerMethodField()
    purchases = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    class Meta:
        model = OwnCheck
        fields = [
            'id',
            'numero',
            'importe',
            'fecha_emision',
            'fecha_deposito',
            'fecha_vencimiento',
            'banco',
            'supplier_name',
            'supplier',
            'purchases',
            'payments',
            'estado',
            'observaciones',
        ]

    @staticmethod
    def _current_payment(obj):
        payment = obj.pago_compra
        return payment if payment and payment.estado_pago == PaymentState.VIGENTE else None

    def _first_supplier(self, obj):
        payment = self._current_payment(obj)
        return payment.proveedor if payment else None

    def get_supplier_name(self, obj):
        supplier = self._first_supplier(obj)
        return supplier.nombre if supplier else None

    def get_supplier(self, obj):
        supplier = self._first_supplier(obj)
        if not supplier:
            return None
        return {'id': supplier.id, 'nombre': supplier.nombre, 'puesto': supplier.puesto}

    def get_purchases(self, obj):
        '''Ids de las compras que cubre el pago vigente hecho con el cheque.'''
        payment = self._current_payment(obj)
        if not payment:
            return []
        return [application.compra_id for application in payment.purchase_applications.all()]

    def get_payments(self, obj):
        uses = sorted(obj.payment_uses.all(), key=lambda use: (use.pago_compra.fecha_pago, use.pago_compra.id))
        return [
            {
                'id': use.pago_compra.id,
                'fecha_pago': use.pago_compra.fecha_pago,
                'tipo': PAYMENT_KIND_PURCHASE if self._purchase_applications(use.pago_compra) else PAYMENT_KIND_ON_ACCOUNT,
                'compras': [
                    {'id': application.compra.id, 'fecha': application.compra.fecha}
                    for application in self._purchase_applications(use.pago_compra)
                ],
                'importe_abonado': use.importe,
                'estado_pago': use.pago_compra.estado_pago,
            }
            for use in uses
        ]

    @staticmethod
    def _purchase_applications(payment):
        return sorted(
            payment.purchase_applications.all(),
            key=lambda application: (application.compra.fecha, application.compra.id),
        )


class OwnCheckQueryParamsSerializer(serializers.Serializer):
    state = serializers.CharField(required=False)
    bank = serializers.CharField(required=False)
    available = serializers.BooleanField(required=False)
