from django.db import models

class Categoria(models.Model):
    id = models.SmallAutoField(primary_key=True)
    descripcion = models.CharField(max_length=20, unique=True)
    is_system = models.BooleanField(default=False)

    def __str__(self):
        return self.descripcion
    
    class Meta:
        db_table = 'categoria'