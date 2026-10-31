from django.contrib import admin
from .models import Tutorial, TutorialPaso, TutorialUsuario


class TutorialPasoInline(admin.StackedInline):
    model = TutorialPaso
    extra = 0
    ordering = ['orden']


@admin.register(Tutorial)
class TutorialAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'clave', 'seccion', 'rol_destino', 'orden', 'activo']
    list_filter = ['activo', 'seccion', 'rol_destino']
    search_fields = ['titulo', 'clave']
    ordering = ['orden']
    inlines = [TutorialPasoInline]


@admin.register(TutorialUsuario)
class TutorialUsuarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'tutorial', 'estado', 'fecha']
    list_filter = ['estado', 'tutorial']
    search_fields = ['usuario__username', 'tutorial__clave']
    ordering = ['-fecha']
