from django.contrib import admin
from .models import Novedad


@admin.register(Novedad)
class NovedadAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'fecha_publicacion', 'vigente_hasta', 'rol_destino', 'activa']
    list_filter = ['activa', 'rol_destino']
    search_fields = ['titulo', 'descripcion']
    ordering = ['-fecha_publicacion']
