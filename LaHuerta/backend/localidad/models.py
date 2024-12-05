from django.db import models
from municipio.models import Municipio
from django.core.validators import MinLengthValidator

class Localidad(models.Model):
    id = models.CharField(
        max_length=10, 
        primary_key=True,
        validators=[MinLengthValidator(10)]
    )
    nombre = models.CharField(max_length=100)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, related_name="localidades")

    def __str__(self):
        return f'{self.id}'
    
    class Meta:
        db_table = 'localidad' 