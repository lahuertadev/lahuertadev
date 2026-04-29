from rest_framework import serializers
from .models import EstadoCheque


class EstadoChequeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoCheque
        fields = ['id', 'descripcion', 'is_system']
        read_only_fields = ['is_system']
