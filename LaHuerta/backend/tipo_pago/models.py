from django.db import models

class TipoPago(models.Model):
    descripcion = models.CharField(unique=True, max_length=15)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_pago'