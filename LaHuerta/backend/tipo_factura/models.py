from django.db import models

class TipoFactura(models.Model):
    descripcion = models.CharField(max_length=20, unique=True)
    abreviatura = models.CharField(max_length=3, unique=True)
    is_system = models.BooleanField(default=False)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_factura'