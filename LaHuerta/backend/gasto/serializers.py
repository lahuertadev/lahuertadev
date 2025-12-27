from rest_framework import serializers
from .models import Gasto
from tipo_gasto.models import TipoGasto
from tipo_gasto.serializers import TipoGastoSerializer

class ExpenseSerializer(serializers.ModelSerializer):
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

class ExpenseCreateSerializer(serializers.ModelSerializer):
    '''
    Se utiliza para crear un gasto (solicitud POST)
    Tendrá que recibir una fecha, un importe y un id correspondiente
    al tipo_gasto. 
    '''
    class Meta:
        model = Gasto
        fields = ['fecha', 'importe', 'tipo_gasto']  # Estos campos son necesarios para crear un gasto (POST)

class ExpenseEditSerializer(serializers.ModelSerializer):
    '''
    Se utiliza para la edición. 
    '''
    tipo_gasto = serializers.PrimaryKeyRelatedField(queryset=TipoGasto.objects.all(), 
                                                    error_messages={
            'does_not_exist': 'El tipo de gasto con ID {pk_value} no existe.',
            'invalid': 'El valor ingresado no es un ID válido.'
        }) #* Valida si el id del tipo_gasto existe en la BD. 

    class Meta:
        model = Gasto
        fields = ['id', 'fecha', 'importe', 'tipo_gasto']

class ExpenseQueryParamsSerializer(serializers.Serializer):
    amount = serializers.DecimalField(required=False, min_value=0, max_digits=10, decimal_places=2, error_messages={
        'min_value': 'El importe debe ser un valor positivo mayor a 0',
        'invalid': 'El importe debe ser un número válido'
    })

    date = serializers.DateField(required=False, input_formats=['%Y-%m-%d'], error_messages ={
        'invalid': 'La fecha debe tener el formato "YYYY-MM-DD"'
    })
    
    expense_type = serializers.CharField(required=False)
