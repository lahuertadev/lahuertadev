from django.db import models
from municipio.models import Municipio
from django.core.validators import RegexValidator

class Localidad(models.Model):
    id = models.CharField(
        max_length=10, 
        primary_key=True,
        validators=[
            RegexValidator(
                regex=r'^\d{8,10}$',  # Expresión regular para validar entre 8 y 10 dígitos
                message="El ID debe tener entre 8 y 10 dígitos.",
                code="invalid_length"
            )
        ]
    )
    nombre = models.CharField(max_length=100)
    municipio = models.ForeignKey(Municipio, on_delete=models.CASCADE, related_name="localidades")

    def __str__(self):
        return f'{self.id}'
    
    class Meta:
        db_table = 'localidad' 