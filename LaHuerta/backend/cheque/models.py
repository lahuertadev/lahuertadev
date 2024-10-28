from django.db import models
from banco.models import Banco
from pago.models import Pago

class Cheque(models.Model):
    numero = models.IntegerField(primary_key=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_emision = models.DateField()
    fecha_deposito = models.DateField()
    check_deposito = models.BooleanField(default=False)
    acreditado = models.BooleanField(default=False)
    fecha_deposito_pago = models.DateField()
    check_pago_proveedor = models.BooleanField(default=False)
    banco = models.ForeignKey(Banco, on_delete=models.CASCADE)
    pago = models.ForeignKey(Pago, on_delete=models.CASCADE)

    def __str__(self):
        return f'Cheque N°{self.numero} ({self.banco.descripcion})'

    class Meta:
        db_table = 'cheque' 
