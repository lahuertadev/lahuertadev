from django.db import models

class TipoCondicionIva(models.Model):
    descripcion = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_condicion_iva'