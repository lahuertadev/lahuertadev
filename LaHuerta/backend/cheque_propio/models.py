from django.db import models
from banco.models import Banco
from proveedor.models import Proveedor


class OwnCheck(models.Model):

    class State(models.TextChoices):
        EMITIDO = 'EMITIDO', 'Emitido'
        COBRADO = 'COBRADO', 'Cobrado'
        ANULADO = 'ANULADO', 'Anulado'

    numero = models.IntegerField(primary_key=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField()
    banco = models.ForeignKey(Banco, on_delete=models.PROTECT)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT)
    estado = models.CharField(max_length=20, choices=State.choices, default=State.EMITIDO)
    observaciones = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f'Cheque Propio N°{self.numero} ({self.banco.descripcion})'

    class Meta:
        db_table = 'cheque_propio'
