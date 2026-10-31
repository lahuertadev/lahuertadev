from .text import capitalize_words, capitalize_address
from .exceptions import SystemEntityException


class SystemProtectedMixin:
    def _check_system_protected(self, instance):
        if instance.is_system:
            raise SystemEntityException('Este registro es de sistema y no puede ser modificado ni eliminado.')


class CapitalizedFieldsMixin:
    '''
    Para serializers: normaliza con capitalize_words los campos de texto listados en
    capitalized_fields antes de validarlos (así las validaciones de duplicados comparan
    contra el valor ya normalizado). Se usa en nombres, razones sociales y domicilios;
    no en descripciones ni observaciones, que quedan como se escriben.
    Los campos de address_fields (domicilios) se normalizan con capitalize_address, que además
    escribe sus abreviaturas de una sola forma ("av" -> "Av.").
    '''
    capitalized_fields = ()
    address_fields = ()

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
            for fields, normalize in ((self.capitalized_fields, capitalize_words), (self.address_fields, capitalize_address)):
                for field in fields:
                    value = data.get(field)
                    if isinstance(value, str):
                        data[field] = normalize(value)
        return super().to_internal_value(data)
