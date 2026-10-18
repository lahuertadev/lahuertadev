from django.db import models
from proveedor.models import Proveedor
from tipo_contenedor.models import TipoContenedor
from .enums import EmptyMovementType


class MovimientoVacio(models.Model):
    '''
    Vale de vacíos de un proveedor.
    CARGA suma su importe a la cuenta corriente del proveedor; DEVOLUCION lo resta.
    '''
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    fecha = models.DateField()
    tipo = models.CharField(max_length=10, choices=EmptyMovementType.choices)
    nro_comprobante = models.CharField(max_length=30, null=True, blank=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.tipo} {self.fecha} (Proveedor: {self.proveedor})'

    class Meta:
        db_table = 'movimiento_vacio'


class MovimientoVacioContenedor(models.Model):
    '''
    Renglón del vale: resuelve la relación N:N entre MovimientoVacio y TipoContenedor.
    '''
    movimiento_vacio = models.ForeignKey(MovimientoVacio, on_delete=models.CASCADE, related_name='contenedores')
    tipo_contenedor = models.ForeignKey(TipoContenedor, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'movimiento_vacio_contenedor'
        unique_together = ('movimiento_vacio', 'tipo_contenedor')
