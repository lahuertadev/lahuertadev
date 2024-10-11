from django.db import models
from proveedor.models import Proveedor

class Compra(models.Model):
    fecha = models.DateTimeField(blank=False)
    bultos = models.SmallIntegerField(blank=False)
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    senia = models.DecimalField(max_digits=10, decimal_places=2)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.fecha} (Proveedor: {self.proveedor})'

    class Meta:
        db_table = 'compra'