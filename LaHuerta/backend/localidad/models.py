from django.db import models
from municipio.models import Municipio

class Localidad(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    nombre = models.CharField(max_length=100)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, related_name="localidades")

    def __str__(self):
        return f'{self.nombre}'
    
    class Meta:
        db_table = 'localidad' 