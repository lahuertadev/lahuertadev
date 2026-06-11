from django.db import models
from tipo_factura.models import TipoFactura
from cliente.models import Cliente

class Factura(models.Model):
    fecha = models.DateField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tipo_factura = models.ForeignKey(TipoFactura, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    numero_comprobante = models.IntegerField(null=True, blank=True)
    cae = models.CharField(max_length=14, null=True, blank=True)
    cae_vto = models.DateField(null=True, blank=True)
    factura_asociada = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.PROTECT, related_name='notas_debito'
    )

    def __str__(self):
        return f'{self.fecha} (Importe: {self.importe})'

    class Meta:
        db_table = 'factura' 