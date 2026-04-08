from django.db import models
from banco.models import Banco
from estado_cheque.models import EstadoCheque
from pago_cliente.models import PagoCliente
from pago_compra.models import PagoCompra


class Cheque(models.Model):
    numero = models.IntegerField(primary_key=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_emision = models.DateField()
    fecha_deposito = models.DateField(blank=True, null=True)
    fecha_endoso = models.DateField(blank=True, null=True)
    endosado = models.BooleanField(default=False)
    banco = models.ForeignKey(Banco, on_delete=models.CASCADE)
    estado = models.ForeignKey(EstadoCheque, on_delete=models.PROTECT)
    pago_cliente = models.ForeignKey(PagoCliente, null=True, blank=True, on_delete=models.SET_NULL)
    pago_compra = models.ForeignKey(PagoCompra, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f'Cheque N°{self.numero} ({self.banco.descripcion})'

    class Meta:
        db_table = 'cheque'
