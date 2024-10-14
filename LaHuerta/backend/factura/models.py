from django.db import models
from tipo_factura.models import TipoFactura
from cliente.models import Cliente

class Factura(models.Model):
    fecha = models.DateField()
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    tipo_factura = models.ForeignKey(TipoFactura, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.fecha} (Importe: {self.importe})'

    class Meta:
        db_table = 'factura' 