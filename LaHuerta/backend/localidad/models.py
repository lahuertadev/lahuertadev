from django.db import models

class Localidad(models.Model):
    descripcion = models.CharField(max_length=70, unique=True)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'localidad'