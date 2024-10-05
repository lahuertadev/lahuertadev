from django.db import models

class DiaEntrega(models.Model):
    descripcion = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'dia_entrega'