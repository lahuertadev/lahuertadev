from django.db import models

class TipoUnidad(models.Model):

    TIPO_MEDICION_CHOICES = [
        ('CANTIDAD', 'Cantidad'),
        ('PESO', 'Peso'),
    ]

    descripcion = models.CharField(unique=True, max_length=20)
    abreviacion = models.CharField(max_length=5, default='u')
    tipo_medicion = models.CharField(max_length=10, choices=TIPO_MEDICION_CHOICES)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'tipo_unidad'