from rest_framework import serializers
from .models import Provincia

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

    def validate_id(self, value):
        if len(value) > 2:
            raise serializers.ValidationError("El campo 'id' no puede tener más de 2 caracteres.")
        return value