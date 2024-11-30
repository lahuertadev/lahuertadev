from django.db import models

class Provincia(models.Model):
    id = models.CharField(max_length=2, primary_key=True)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.nombre}'
    
    class Meta:
        db_table = 'provincia' 