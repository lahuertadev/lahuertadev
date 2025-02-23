from django.db import models
from provincia.models import Provincia
from django.core.validators import MinLengthValidator

class Municipio(models.Model):
    id = models.CharField(
        max_length=6, 
        primary_key=True,
        validators=[MinLengthValidator(6)]
    )
    nombre = models.CharField(max_length=100)
    provincia = models.ForeignKey(Provincia, on_delete=models.CASCADE, related_name="municipios" )

    def __str__(self):
        return f'{self.id}'
    
    class Meta:
        db_table = 'municipio' 