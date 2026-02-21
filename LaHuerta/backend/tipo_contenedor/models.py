from django.db import models

class TipoContenedor(models.Model):
    descripcion = models.CharField(max_length=10, unique=True)
    abreviacion = models.CharField(max_length=5, default='c')

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_contenedor'