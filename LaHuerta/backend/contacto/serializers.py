from rest_framework import serializers
from core.mixins import CapitalizedFieldsMixin
from .models import Contacto
from .constants import NUMBER_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, MIN_CONTACTS


class ContactSerializer(CapitalizedFieldsMixin, serializers.ModelSerializer):
    '''
    DTO de un contacto. Al escribir, el id es opcional: con id se modifica ese contacto
    y sin id se crea uno nuevo. 
    '''
    capitalized_fields = ('descripcion',)

    id = serializers.IntegerField(required=False)
    numero = serializers.CharField(
        max_length=NUMBER_MAX_LENGTH,
        error_messages={
            'blank': 'El teléfono es obligatorio.',
            'required': 'El teléfono es obligatorio.',
            'max_length': f'El teléfono puede tener hasta {NUMBER_MAX_LENGTH} caracteres.',
        },
    )
    descripcion = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH,
        required=False,
        allow_null=True,
        allow_blank=True,
        error_messages={'max_length': f'La descripción puede tener hasta {DESCRIPTION_MAX_LENGTH} caracteres.'},
    )
    email = serializers.EmailField(
        required=False,
        allow_null=True,
        allow_blank=True,
        error_messages={'invalid': 'Ingresá un email válido.'},
    )

    class Meta:
        model = Contacto
        fields = ['id', 'numero', 'descripcion', 'email']

    def validate(self, attrs):
        for field in ('descripcion', 'email'):
            if field in attrs and not (attrs[field] or '').strip():
                attrs[field] = None
        return attrs


def validate_contacts(contacts):
    '''
    Para los serializers de alta y edición del dueño (cliente o proveedor).
    '''
    if len(contacts) < MIN_CONTACTS:
        raise serializers.ValidationError('Cargá al menos un contacto.')
    return contacts
