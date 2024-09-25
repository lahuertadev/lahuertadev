from django.db import models
from tipo_gasto.models import TipoGasto

class Gasto(models.Model):
    fecha = models.DateTimeField()
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    tipo_gasto = models.ForeignKey(TipoGasto, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.fecha} - {self.importe}'
    
    class Meta:
        db_table = 'gasto' 