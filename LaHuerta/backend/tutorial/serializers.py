from rest_framework import serializers
from .models import Tutorial, TutorialPaso, TutorialUsuario


class TutorialStepResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialPaso
        fields = [
            'orden', 'ruta', 'elemento', 'titulo', 'descripcion', 'avance', 'ruta_destino',
            'evento', 'condicion', 'confirmar', 'opcional', 'solo_lectura', 'listo_cuando',
            'dispositivo',
        ]


class TutorialResponseSerializer(serializers.ModelSerializer):
    estado = serializers.CharField(read_only=True, allow_null=True)
    pasos = TutorialStepResponseSerializer(many=True, read_only=True)

    class Meta:
        model = Tutorial
        fields = ['clave', 'titulo', 'descripcion', 'seccion', 'rol_destino', 'orden', 'estado', 'pasos']


class TutorialProgressResponseSerializer(serializers.ModelSerializer):
    tutorial_clave = serializers.SlugRelatedField(source='tutorial', slug_field='clave', read_only=True)

    class Meta:
        model = TutorialUsuario
        fields = ['tutorial_clave', 'estado', 'fecha']
