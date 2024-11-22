from django.db import models

class TipoFacturacion(models.Model):
    descripcion = models.CharField(unique=True, max_length=50)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_facturacion'
