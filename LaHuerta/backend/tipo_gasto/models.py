from django.db import models

class TipoGasto(models.Model):
    descripcion = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.descripcion
    
    #! Asi es como se le dice que este modelo hace referencia a la tabla en la BD
    class Meta:
        db_table = 'tipo_gasto'
