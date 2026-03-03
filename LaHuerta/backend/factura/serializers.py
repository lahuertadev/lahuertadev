from rest_framework import serializers
from .models import Factura
from tipo_factura.models import TipoFactura
from cliente.models import Cliente
from tipo_factura.serializers import BillTypeSerializer
from cliente.serializers import ClientResponseSerializer
from factura_producto.serializers import BillItemResponseSerializer, BillItemCreateSerializer


class BillResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: factura con cliente, tipo, e ítems anidados.
    '''
    cliente = ClientResponseSerializer()
    tipo_factura = BillTypeSerializer()
    items = BillItemResponseSerializer(many=True, source='facturaproducto_set')

    class Meta:
        model = Factura
        fields = ['id', 'fecha', 'importe', 'cliente', 'tipo_factura', 'items']


class BillCreateSerializer(serializers.Serializer):
    '''
    DTO para crear una factura (POST).
    Recibe ids de cliente y tipo_factura, fecha e ítems.
    El importe total se calcula en el repositorio a partir de los ítems.
    '''
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    tipo_factura = serializers.PrimaryKeyRelatedField(queryset=TipoFactura.objects.all())
    fecha = serializers.DateField()
    items = BillItemCreateSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('La factura debe tener al menos un ítem.')
        return items


class BillUpdateSerializer(serializers.Serializer):
    '''
    DTO para editar una factura (PUT / PATCH).
    Todos los campos son opcionales; si se envían ítems se reemplazan completamente.
    Al editar los ítems se recalcula el importe y se ajusta la cuenta corriente del cliente.
    '''
    tipo_factura = serializers.PrimaryKeyRelatedField(queryset=TipoFactura.objects.all(), required=False)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(), required=False)
    fecha = serializers.DateField(required=False)
    items = BillItemCreateSerializer(many=True, required=False)

    def validate_items(self, items):
        if items is not None and len(items) == 0:
            raise serializers.ValidationError('Si se envían ítems, debe haber al menos uno.')
        return items


class BillQueryParamsSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField(required=False)
