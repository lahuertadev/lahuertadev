from django.db import models

class TipoUnidad(models.Model):
    descripcion = models.CharField(unique=True, max_length=20)
    abreviacion = models.CharField(max_length=5, default='u')

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_unidad'