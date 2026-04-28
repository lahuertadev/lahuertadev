from django.db import models
from compra.models import Compra
from tipo_contenedor.models import TipoContenedor


class CompraVacio(models.Model):
    compra = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='vacios')
    tipo_contenedor = models.ForeignKey(TipoContenedor, on_delete=models.CASCADE)
    cantidad = models.FloatField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'compra_vacio'
