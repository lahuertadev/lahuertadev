from django.db import models

class TipoCondicionIva(models.Model):
    descripcion = models.CharField(max_length=20, unique=True)
    class Meta:
        db_table = 'tipo_condicion_iva'

    def __str__(self):
        return self.descripcion