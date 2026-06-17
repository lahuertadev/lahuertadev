from django.db import models

class TipoContenedor(models.Model):
    descripcion = models.CharField(max_length=10, unique=True)
    abreviacion = models.CharField(max_length=5, default='c')
    requiere_vacio = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_contenedor'