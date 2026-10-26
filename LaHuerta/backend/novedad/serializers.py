from django.utils import timezone
from rest_framework import serializers
from .models import Novedad


class NewsResponseSerializer(serializers.ModelSerializer):
    seen = serializers.BooleanField(read_only=True)
    is_current = serializers.SerializerMethodField()

    def get_is_current(self, obj):
        return obj.fecha_publicacion <= timezone.localdate() <= obj.vigente_hasta

    class Meta:
        model = Novedad
        fields = [
            'id', 'titulo', 'descripcion', 'fecha_publicacion', 'vigente_hasta',
            'pantalla_nombre', 'pantalla_url', 'tutorial_clave', 'rol_destino',
            'seen', 'is_current',
        ]


class NewsQueryParamsSerializer(serializers.Serializer):
    pending = serializers.BooleanField(required=False)
