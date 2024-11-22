from django.db import models
from cliente.models import Cliente
from dia_entrega.models import DiaEntrega


class ClienteDiaEntrega(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    dia_entrega = models.ForeignKey(DiaEntrega, on_delete=models.CASCADE)

    class Meta:
        db_table = 'cliente_dias_entrega'