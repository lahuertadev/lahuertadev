from .text import capitalize_words
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
    '''
    capitalized_fields = ()

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
            for field in self.capitalized_fields:
                value = data.get(field)
                if isinstance(value, str):
                    data[field] = capitalize_words(value)
        return super().to_internal_value(data)
