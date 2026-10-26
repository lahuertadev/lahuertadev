from datetime import timedelta
from django.conf import settings
from django.db import models
from autenticacion.models import Usuario
from .constants import DEFAULT_VALIDITY_DAYS


class Novedad(models.Model):
    '''
    Cambio de la plataforma que se anuncia en el Inicio mientras está vigente.
    '''

    titulo = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=500)
    fecha_publicacion = models.DateField()
    vigente_hasta = models.DateField(blank=True, help_text=f'Si se deja vacío, se completa con la fecha de publicación + {DEFAULT_VALIDITY_DAYS} días.')
    pantalla_nombre = models.CharField(max_length=60, blank=True, null=True, help_text='Ej. Facturación. Se muestra en el botón "Ir a ...".')
    pantalla_url = models.CharField(max_length=120, blank=True, null=True, help_text='Ruta del frontend, ej. /bill/')
    tutorial_clave = models.CharField(max_length=60, blank=True, null=True)
    rol_destino = models.CharField(
        max_length=20, choices=Usuario.ROLE_CHOICES, blank=True, null=True,
        help_text='Si se deja vacío, la ven todos los usuarios.',
    )
    activa = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.vigente_hasta:
            self.vigente_hasta = self.fecha_publicacion + timedelta(days=DEFAULT_VALIDITY_DAYS)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.titulo} ({self.fecha_publicacion})'

    class Meta:
        db_table = 'novedad'
        verbose_name = 'Novedad'
        verbose_name_plural = 'Novedades'


class NovedadUsuario(models.Model):
    '''
    Registro de que un usuario marcó una novedad como vista ("Entendido").
    '''

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    novedad = models.ForeignKey(Novedad, on_delete=models.CASCADE)
    vista_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'novedad_usuario'
        constraints = [
            models.UniqueConstraint(fields=['usuario', 'novedad'], name='unique_novedad_usuario'),
        ]
