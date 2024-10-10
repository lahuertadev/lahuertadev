from django.db import models
from categoria.models import Categoria
from tipo_contenedor.models import TipoContenedor
from tipo_unidad.models import TipoUnidad

class Producto(models.Model):
    descripcion = models.CharField(max_length=30, unique=True, blank=False)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    tipo_contenedor = models.ForeignKey(TipoContenedor, on_delete=models.CASCADE)
    tipo_unidad = models.ForeignKey(TipoUnidad, on_delete=models.CASCADE)
    cantidad_por_bulto = models.SmallIntegerField()
    peso_aproximado = models.FloatField()

    def __str__(self):
        return f'{self.descripcion}'

    class Meta:
        db_table = 'producto' 