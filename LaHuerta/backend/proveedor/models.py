from django.db import models
from mercado.models import Mercado

class Proveedor(models.Model):
    nombre = models.CharField(max_length=20, unique=True, blank=False)
    puesto = models.SmallIntegerField(blank=False)
    nave = models.SmallIntegerField(blank=False)
    telefono = models.CharField(max_length=20, blank=False)
    cuenta_corriente = models.DecimalField(max_digits=10, decimal_places=2)
    nombre_fantasia = models.CharField(max_length=50)
    mercado = models.ForeignKey(Mercado, on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.nombre} (Puesto: {self.puesto} - Nave:{self.nave})'

    class Meta:
        db_table = 'proveedor' 