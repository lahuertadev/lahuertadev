from django.db import models

class ListaPrecios(models.Model):
    nombre = models.CharField(max_length=30, unique=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    descripcion = models.CharField(max_length=200)
    

    def __str__(self):
        return f'Lista con nombre: {self.nombre}'

    class Meta:
        db_table = 'lista_precios' 
