from rest_framework import serializers
from .models import Provincia
from rest_framework.exceptions import ValidationError

class ProvinceSerializer(serializers.ModelSerializer):
    '''
    Se utiliza para verificar que los datos ingresados por medio de la 
    solicitud sean iguales que los que pide el modelo. 
    '''
    class Meta:
        model = Provincia
        fields = [
            'id',
            'nombre'
        ]
    
    # def validate_id(self, value):
    #     '''
    #     Si el id ya existe, permite el paso para que lo maneje la lógica 
    #     del controller. Si no se sobreescribe este método, va a fallar la 
    #     validación de unicidad (el serializer de por sí, se fija el primary
    #     key determinado en el modelo y verifica si ya existe en la base de 
    #     datos).
    #     '''
    #     # if Provincia.objects.filter(id=value).exists():
    #     #     return value
    #     # return value
    
    # def is_valid(self, raise_exception=False):
    #     """
    #     Sobrescribe `is_valid` para evitar la validación automática de unicidad.
    #     """
    #     try:
    #         super().is_valid(raise_exception=raise_exception)
    #     except ValidationError as e:
    #         # Si el error es por la clave primaria existente, lo ignoramos.
    #         if 'id' in e.detail and any('already exists' in str(err) for err in e.detail['id']):
    #             pass
    #         else:
    #             raise e