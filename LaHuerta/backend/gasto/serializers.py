from rest_framework import serializers
from .models import Gasto
from tipo_gasto.serializers import TipoGastoSerializer

class GastoSerializer(serializers.ModelSerializer):
    '''
    Se utiliza para listar los gastos (solicitud GET)
    Al tener que mostrar los tipo_gasto, también hay que anidar 
    el serializador de su modelo. Haciendo esto, se puede visualizar
    más información sobre el tipo de gasto (id, descripcion, etc).
    '''
    tipo_gasto = TipoGastoSerializer()

    class Meta:
        model = Gasto
        fields = ['id', 'fecha', 'importe', 'tipo_gasto'] #* Forma de representar los campos.

class GastoCreateSerializer(serializers.ModelSerializer):
    '''
    Se utiliza para crear un gasto (solicitud POST)
    Tendrá que recibir una fecha, un importe y un id correspondiente
    al tipo_gasto. 
    '''
    class Meta:
        model = Gasto
        fields = ['fecha', 'importe', 'tipo_gasto']  # Estos campos son necesarios para crear un gasto (POST)