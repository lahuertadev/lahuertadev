from django.db import models


class TipoVenta(models.Model):
    descripcion = models.CharField(
        max_length=30,
        unique=True
    )

    def __str__(self):
        return self.descripcion

    class Meta:
        db_table = 'tipo_venta'
        verbose_name = 'Tipo de Venta'
        verbose_name_plural = 'Tipos de Venta'