from decimal import Decimal
from rest_framework import serializers
from .models import MovimientoVacio, MovimientoVacioContenedor
from .constants import EmptyMovementType
from proveedor.models import Proveedor
from proveedor.serializers import SupplierSerializer
from tipo_contenedor.models import TipoContenedor
from tipo_contenedor.serializers import ContainerTypeSerializer


def validate_containers(containers):
    if not containers:
        raise serializers.ValidationError('El movimiento debe tener al menos un tipo de vacío.')

    seen = set()
    duplicated = set()

    for container in containers:
        container_type = container['tipo_contenedor']

        if container_type.id in seen:
            duplicated.add(container_type.descripcion)

        seen.add(container_type.id)

    if duplicated:
        duplicated_list = ', '.join(sorted(duplicated))
        raise serializers.ValidationError(
            f'No se puede agregar el mismo tipo de vacío más de una vez en el movimiento. '
            f'Tipos duplicados: {duplicated_list}.'
        )

    return containers


class EmptyMovementContainerResponseSerializer(serializers.ModelSerializer):
    tipo_contenedor = ContainerTypeSerializer()
    subtotal = serializers.SerializerMethodField()

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unitario

    class Meta:
        model = MovimientoVacioContenedor
        fields = ['id', 'tipo_contenedor', 'cantidad', 'precio_unitario', 'subtotal']


class EmptyMovementContainerCreateSerializer(serializers.Serializer):
    tipo_contenedor = serializers.PrimaryKeyRelatedField(
        queryset=TipoContenedor.objects.filter(requiere_vacio=True),
        error_messages={'does_not_exist': 'El tipo de contenedor no existe o no maneja vacíos.'},
    )
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))


class EmptyMovementResponseSerializer(serializers.ModelSerializer):
    '''
    DTO de lectura: movimiento de vacíos con proveedor y renglones.
    '''
    proveedor = SupplierSerializer()
    contenedores = EmptyMovementContainerResponseSerializer(many=True)

    class Meta:
        model = MovimientoVacio
        fields = ['id', 'fecha', 'tipo', 'nro_comprobante', 'importe', 'proveedor', 'contenedores']


class EmptyMovementCreateSerializer(serializers.Serializer):
    '''
    DTO para crear un movimiento de vacíos (POST).
    El importe se calcula automáticamente: Σ(cantidad × precio_unitario).
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all())
    fecha = serializers.DateField()
    tipo = serializers.ChoiceField(choices=EmptyMovementType.choices)
    nro_comprobante = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True, default=None)
    contenedores = EmptyMovementContainerCreateSerializer(many=True)

    def validate_nro_comprobante(self, value):
        return value or None

    def validate_contenedores(self, containers):
        return validate_containers(containers)


class EmptyMovementUpdateSerializer(serializers.Serializer):
    '''
    DTO para editar parcialmente un movimiento de vacíos (PATCH).
    El PUT (reemplazo completo) valida con EmptyMovementCreateSerializer.
    Si se envían renglones se reemplazan completamente y se recalcula el importe.
    '''
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all(), required=False)
    fecha = serializers.DateField(required=False)
    tipo = serializers.ChoiceField(choices=EmptyMovementType.choices, required=False)
    nro_comprobante = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    contenedores = EmptyMovementContainerCreateSerializer(many=True, required=False)

    def validate_nro_comprobante(self, value):
        return value or None

    def validate_contenedores(self, containers):
        return validate_containers(containers)


class EmptyMovementQueryParamsSerializer(serializers.Serializer):
    proveedor    = serializers.CharField(required=False, allow_blank=True)
    tipo         = serializers.ChoiceField(choices=EmptyMovementType.choices, required=False)
    fecha_desde  = serializers.DateField(required=False)
    fecha_hasta  = serializers.DateField(required=False)
    importe      = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
