from decimal import Decimal
from rest_framework import serializers
from .models import PagoCompra
from compra.models import Compra
from proveedor.models import Proveedor
from tipo_pago.models import TipoPago
from tipo_pago.serializers import PaymentTypeSerializer
from .constants import (
    CHECK_STATE_RELEASED,
    DROPPED_CHECK_STATES,
    PAYMENT_KIND_CHOICES,
    PAYMENT_TYPE_CHECK,
    PAYMENT_TYPE_OWN_CHECK,
    PaymentState,
)


def validate_unique_purchases(applications):
    purchase_ids = [application['compra'].id for application in applications]
    if len(set(purchase_ids)) != len(purchase_ids):
        raise serializers.ValidationError('Una compra no puede estar dos veces en el mismo pago.')
    return applications


class SupplierSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'puesto']


class PurchaseApplicationSerializer(serializers.Serializer):
    '''Compra del pago con el importe que se le aplica (mayor a cero).'''
    compra = serializers.PrimaryKeyRelatedField(queryset=Compra.objects.all())
    importe = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class PurchasePaymentCreateSerializer(serializers.Serializer):
    '''
    Alta de un pago. Valida que tenga un solo tipo de pago y los datos que ese tipo necesita:
    cheque_ids con Cheque, own_check_ids con Cheque Propio (al menos uno y sin repetir) o
    importe_abonado con cualquier otro. Las compras son opcionales y no se repiten.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    compras = PurchaseApplicationSerializer(many=True, required=False)
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    tipo_pago = serializers.PrimaryKeyRelatedField(queryset=TipoPago.objects.all())
    fecha_pago = serializers.DateField()
    cheque_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    own_check_ids = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate_compras(self, applications):
        return validate_unique_purchases(applications)

    def validate(self, data):
        payment_type = data['tipo_pago'].descripcion
        if payment_type != PAYMENT_TYPE_CHECK and data.get('cheque_ids'):
            raise serializers.ValidationError(
                {'cheque_ids': f'Un pago con {payment_type} no lleva cheques de clientes. Cargá un pago por cada tipo de pago.'}
            )
        if payment_type != PAYMENT_TYPE_OWN_CHECK and data.get('own_check_ids'):
            raise serializers.ValidationError(
                {'own_check_ids': f'Un pago con {payment_type} no lleva cheques propios. Cargá un pago por cada tipo de pago.'}
            )
        if payment_type == PAYMENT_TYPE_CHECK:
            check_ids = data.get('cheque_ids') or []
            if not check_ids:
                raise serializers.ValidationError({'cheque_ids': 'Elegí al menos un cheque.'})
            if len(set(check_ids)) != len(check_ids):
                raise serializers.ValidationError({'cheque_ids': 'Un cheque no puede estar dos veces en el mismo pago.'})
        elif payment_type == PAYMENT_TYPE_OWN_CHECK:
            own_check_ids = data.get('own_check_ids') or []
            if not own_check_ids:
                raise serializers.ValidationError({'own_check_ids': 'Elegí al menos un cheque propio.'})
            if len(set(own_check_ids)) != len(own_check_ids):
                raise serializers.ValidationError({'own_check_ids': 'Un cheque no puede estar dos veces en el mismo pago.'})
        elif not data.get('importe_abonado'):
            raise serializers.ValidationError({'importe_abonado': 'Este campo es requerido.'})
        return data


class PurchasePaymentUpdateSerializer(serializers.Serializer):
    '''
    Edición de un pago: fecha obligatoria; importe y compras opcionales, sin compras repetidas.
    El proveedor y el tipo de pago no se editan.
    '''
    importe_abonado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'), required=False)
    fecha_pago = serializers.DateField()
    compras = PurchaseApplicationSerializer(many=True, required=False)

    def validate_compras(self, applications):
        return validate_unique_purchases(applications)


class PurchasePaymentResponseSerializer(serializers.ModelSerializer):
    proveedor = SupplierSummarySerializer()
    tipo_pago = PaymentTypeSerializer()
    compras = serializers.SerializerMethodField()
    importe_a_cuenta = serializers.SerializerMethodField()
    cheques = serializers.SerializerMethodField()
    cheques_propios = serializers.SerializerMethodField()

    def get_compras(self, obj):
        '''Compras del pago, de la más vieja a la más nueva, con lo aplicado a cada una.'''
        applications = sorted(
            obj.purchase_applications.all(),
            key=lambda application: (application.compra.fecha, application.compra.id),
        )
        return [
            {
                'id': application.compra.id,
                'fecha': application.compra.fecha,
                'importe': application.compra.importe,
                'importe_aplicado': application.importe,
            }
            for application in applications
        ]

    def get_importe_a_cuenta(self, obj):
        '''Lo que el pago no aplica a ninguna compra.'''
        applied = sum((application.importe for application in obj.purchase_applications.all()), Decimal('0'))
        return max(obj.importe_abonado - applied, Decimal('0'))

    @staticmethod
    def _check_state(payment, state):
        '''En un pago anulado, los cheques que quedaron libres se muestran como Liberado.'''
        if payment.estado_pago == PaymentState.ANULADO and state not in DROPPED_CHECK_STATES:
            return CHECK_STATE_RELEASED
        return state

    def get_cheques(self, obj):
        '''Cheques de clientes del pago, tomados del historial.'''
        return [
            {
                'id': use.cheque_id,
                'numero': use.cheque.numero,
                'importe': use.importe,
                'banco': use.cheque.banco.descripcion,
                'estado': self._check_state(obj, use.cheque.estado.descripcion if use.cheque.estado else None),
            }
            for use in obj.client_check_uses.all()
        ]

    def get_cheques_propios(self, obj):
        '''Cheques emitidos del pago, tomados del historial.'''
        return [
            {
                'id': use.cheque_propio.id,
                'numero': use.cheque_propio.numero,
                'importe': use.importe,
                'banco': use.cheque_propio.banco.descripcion,
                'estado': self._check_state(obj, use.cheque_propio.estado),
            }
            for use in obj.own_check_uses.all()
        ]

    class Meta:
        model = PagoCompra
        fields = [
            'id', 'proveedor', 'compras', 'importe_abonado', 'importe_a_cuenta', 'tipo_pago', 'fecha_pago',
            'estado_pago', 'fecha_anulacion', 'cheques', 'cheques_propios',
        ]


class PurchasePaymentQueryParamsSerializer(serializers.Serializer):
    compra_id = serializers.IntegerField(required=False)
    supplier_id = serializers.IntegerField(required=False)
    supplier = serializers.CharField(required=False, allow_blank=True)
    kind = serializers.ChoiceField(choices=PAYMENT_KIND_CHOICES, required=False)
    estado = serializers.ChoiceField(choices=PaymentState.choices, required=False)
    payment_type_id = serializers.IntegerField(required=False)
    amount_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    amount_max = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
