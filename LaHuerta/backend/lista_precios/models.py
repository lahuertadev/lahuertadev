from django.db import models

class ListaPrecios(models.Model):
    nombre = models.CharField(max_length=30, unique=True)
    fecha_actualizacion = models.DateTimeField()
    descripcion = models.CharField(max_length=200)
    

    def __str__(self):
        return f'Lista con nombre: {self.nombre}'

    class Meta:
        db_table = 'lista_precios' 

# #! ------ ⬇⬇ Tabla intermedia ⬇⬇ ------
# class ClienteDiaEntrega(models.Model):
#     cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
#     dia_entrega = models.ForeignKey(DiaEntrega, on_delete=models.CASCADE)

#     class Meta:
#         db_table = 'cliente_dias_entrega'