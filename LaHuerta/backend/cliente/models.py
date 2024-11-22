from django.db import models
from localidad.models import Localidad
from tipo_facturacion.models import TipoFacturacion
from tipo_condicion_iva.models import TipoCondicionIva
# from cliente_dia_entrega.models import ClienteDiaEntrega

class Cliente(models.Model):
    id = models.SmallAutoField(primary_key=True)
    cuit = models.CharField(max_length=11, unique=True)
    razon_social = models.CharField(max_length=70, unique=True)
    cuenta_corriente = models.DecimalField(max_digits=10, decimal_places=2)
    domicilio = models.CharField(max_length=50, blank=True, null=True)
    localidad = models.ForeignKey(Localidad, on_delete=models.CASCADE)
    tipo_facturacion = models.ForeignKey(TipoFacturacion, on_delete=models.CASCADE)
    condicion_IVA = models.ForeignKey(TipoCondicionIva, on_delete=models.CASCADE)
    telefono = models.CharField(max_length=16)
    fecha_inicio_ventas = models.DateField(blank=True, null=True)
    nombre_fantasia = models.CharField(max_length=100, blank=True, null=True)
    # dias_entrega = models.ManyToManyField(
    #     ClienteDiaEntrega,  
    #     through='cliente_dia_entrega.ClienteDiaEntrega',  
    #     related_name='clientes'  
    # )
    estado = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.razon_social} (CUIT: {self.cuit})'

    class Meta:
        db_table = 'cliente' 
