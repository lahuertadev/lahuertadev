from django.db import models

class Banco(models.Model):
    descripcion = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'banco'