from rest_framework import serializers
from .models import EstadoCheque


class EstadoChequeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoCheque
        fields = ['id', 'descripcion']
