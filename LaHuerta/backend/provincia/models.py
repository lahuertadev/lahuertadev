from django.db import models
from django.core.validators import MinLengthValidator
class Provincia(models.Model):
    id = models.CharField(
        max_length=2, 
        primary_key=True,
        validators=[MinLengthValidator(2)]
    )
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.id}'
    
    class Meta:
        db_table = 'provincia' 