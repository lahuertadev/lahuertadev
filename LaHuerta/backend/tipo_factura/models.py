from django.db import models

class TipoFactura(models.Model):
    descripcion = models.CharField(max_length=1, unique=True)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_factura'